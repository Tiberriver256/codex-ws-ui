import { createServer } from "http";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { WebSocketServer } from "ws";
import {
  makeUnifiedDiff,
  readTextFile,
  tryGetGitRepoRoot,
  tryReadGitHeadFile,
} from "./server-utils.mjs";

// Determine if we're in mock/test mode
const MOCK_MODE = process.env.CODEX_MOCK === "1" || process.env.CODEX_MOCK === "true";

let Codex;
let mockModelCatalog = [];
if (MOCK_MODE) {
  console.log("🧪 Running in MOCK mode - no auth required");
  const mockModule = await import("./mock-codex.mjs");
  Codex = mockModule.Codex;
  if (Array.isArray(mockModule.mockModelCatalog)) {
    mockModelCatalog = mockModule.mockModelCatalog;
  }
} else {
  const realModule = await import("@openai/codex-sdk");
  Codex = realModule.Codex;
}

async function fetchCodexModels() {
  return new Promise((resolve) => {
    const models = [];
    let settled = false;
    let timeout;
    const child = spawn("codex", ["app-server"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
    });

    const finish = (result) => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      try {
        child.stdin.end();
      } catch {}
      try {
        child.kill();
      } catch {}
      resolve(result);
    };

    child.once("error", () => finish([]));

    const rl = readline.createInterface({ input: child.stdout });
    const initializeRequest = {
      id: 0,
      method: "initialize",
      params: {
        clientInfo: {
          name: "codex-ws-ui",
          title: "Codex WebSocket UI",
          version: "0.0.0",
        },
      },
    };
    const listRequest = {
      id: 1,
      method: "model/list",
      params: { limit: null, cursor: null },
    };

    child.stdin.write(JSON.stringify(initializeRequest) + "\n");

    rl.on("line", (line) => {
      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        return;
      }
      if (msg?.id === 0) {
        child.stdin.write(JSON.stringify(listRequest) + "\n");
        return;
      }
      if (msg?.id === 1 && msg?.result?.data) {
        models.push(...msg.result.data);
        finish(models);
      }
    });

    timeout = setTimeout(() => finish(models), 2000);
  });
}

const modelCatalog = MOCK_MODE ? mockModelCatalog : await fetchCodexModels();

// Static asset serving
const publicDir = path.resolve(process.cwd(), "public");
const workspaceRoot = process.cwd();
let isGitRepo = false;
try {
  await fs.stat(path.join(workspaceRoot, ".git"));
  isGitRepo = true;
} catch {}
const appConfig = {
  mockMode: MOCK_MODE,
  modelCatalog,
  workspaceRoot,
  isGitRepo,
};
const appConfigScript = `window.__APP_CONFIG__ = ${JSON.stringify(appConfig).replace(/</g, "\u003c")};`;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  if (method !== "GET" && method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" });
    res.end();
    return;
  }
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  let pathname;
  try {
    const url = new URL(req.url, `http://${req.headers.host || HOST}`);
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  if (pathname === "/config.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(appConfigScript);
    return;
  }

  if (pathname === "/") pathname = "/index.html";
  const relativePath = pathname.replace(/^\\/+/, "");
  const filePath = path.resolve(publicDir, relativePath);
  if (!filePath.startsWith(publicDir + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "content-type": getContentType(filePath) });
    if (method === "HEAD") {
      res.end();
      return;
    }
    res.end(data);
  } catch (err) {
    if (err?.code === "ENOENT" || err?.code === "EISDIR") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(500);
    res.end("Server error");
  }
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  const codex = new Codex();
  const threads = new Map(); // Store threads by ID once known
  const pendingThreads = new Map(); // temp_id -> thread while ID is pending
  const threadOptionsById = new Map();
  const pendingThreadOptions = new Map();
  const tempThreadIds = new WeakMap(); // thread -> temp_id
  let currentThread = null; // Store the current thread object directly
  let currentThreadId = null;
  const fileChangeBeforeByItemId = new Map(); // item_id -> Map(absPath -> beforeText)
  const lastSeenFileTextByAbsPath = new Map(); // absPath -> text
  const gitRepoRootByCwd = new Map(); // cwd -> repo root (or null)

  // Helper function to handle message processing
  async function processMessage(prompt) {
    // Create initial thread if none exists
    if (!currentThread) {
      const autoOptions = { skipGitRepoCheck: true };
      currentThread = codex.startThread(autoOptions);
      // Note: thread.id may be null initially with the real SDK
      // It gets set after thread.started event is received
      console.log(`Auto-created thread (id pending until first turn)`);
    }
    
    console.log(`Received on thread ${currentThreadId || '(pending)'}: ${prompt}`);
    
    // Use the enhanced event streaming
    const { events } = await currentThread.runStreamed(prompt);
    
    for await (const event of events) {
      if ((event.type === "item.started" || event.type === "item.completed") && event.item?.type === "file_change") {
        const threadOptions = currentThread?._threadOptions || {};
        const workingDir = threadOptions.workingDirectory || process.cwd();

        const resolveAbsPath = (filePath) => {
          if (!filePath) return null;
          return path.isAbsolute(filePath) ? filePath : path.resolve(workingDir, filePath);
        };

        if (event.type === "item.started") {
          const beforeByPath = new Map();
          for (const change of event.item.changes || []) {
            const absPath = resolveAbsPath(change.path);
            if (!absPath) continue;
            const beforeText =
              change.kind === "add" ? "" : (await readTextFile(absPath)) ?? "";
            beforeByPath.set(absPath, beforeText);
          }
          fileChangeBeforeByItemId.set(event.item.id, beforeByPath);
        }

        if (event.type === "item.completed") {
          const beforeByPath = fileChangeBeforeByItemId.get(event.item.id) || null;
          const uiDiffs = [];
          let uiDiffError = null;

          for (const change of event.item.changes || []) {
            const absPath = resolveAbsPath(change.path);
            if (!absPath) continue;

            const afterText =
              change.kind === "delete" ? "" : (await readTextFile(absPath)) ?? "";

            let beforeText = "";
            if (beforeByPath && beforeByPath.has(absPath)) {
              beforeText = beforeByPath.get(absPath) ?? "";
            } else if (lastSeenFileTextByAbsPath.has(absPath)) {
              beforeText = lastSeenFileTextByAbsPath.get(absPath) ?? "";
            } else {
              let repoRoot = gitRepoRootByCwd.get(workingDir);
              if (repoRoot === undefined) {
                repoRoot = tryGetGitRepoRoot(workingDir);
                gitRepoRootByCwd.set(workingDir, repoRoot);
              }
              beforeText = repoRoot ? tryReadGitHeadFile(repoRoot, absPath) ?? "" : "";
            }

            try {
              const diff = await makeUnifiedDiff({
                beforeText,
                afterText,
                displayPath: change.path,
              });
              uiDiffs.push({ path: change.path, kind: change.kind, diff });
            } catch (err) {
              uiDiffError = String(err);
            }

            lastSeenFileTextByAbsPath.set(absPath, afterText);
          }

          if (beforeByPath) fileChangeBeforeByItemId.delete(event.item.id);
          event.item.ui_diffs = uiDiffs;
          if (uiDiffError) event.item.ui_diff_error = uiDiffError;
        }
      }

      // Capture the thread ID from thread.started event
      // This is when the real SDK assigns the ID
      if (event.type === "thread.started" && event.thread_id) {
        const newThreadId = event.thread_id;
        if (!currentThreadId || currentThreadId.startsWith("pending_")) {
          const tempId = tempThreadIds.get(currentThread) || currentThreadId;
          if (tempId && pendingThreads.has(tempId)) {
            pendingThreads.delete(tempId);
            ws.send(JSON.stringify({
              type: "thread_id_assigned",
              temp_id: tempId,
              thread_id: newThreadId,
              options: pendingThreadOptions.get(tempId) || threadOptionsById.get(tempId) || {}
            }));
          }
          // First turn - store the thread with its ID
          currentThreadId = newThreadId;
          threads.set(currentThreadId, currentThread);
          if (pendingThreadOptions.has(tempId)) {
            threadOptionsById.set(currentThreadId, pendingThreadOptions.get(tempId));
            pendingThreadOptions.delete(tempId);
          }
          console.log(`Thread ID assigned: ${currentThreadId}`);
        }
        // Note: The SDK emits thread.started on every turn with the same ID
        // We only update on first turn; subsequent turns should have matching IDs
      }
      
      // Send the full event as JSON for rich client handling
      ws.send(JSON.stringify(event));
    }
  }

  ws.on("message", async (m) => {
    try {
      const message = JSON.parse(m.toString());
      
      // Handle different message types
      if (message.type === "new_thread") {
        // Create a new thread
        // Note: With real SDK, thread.id is null until first turn's thread.started event
        // We generate a temporary ID for immediate UI feedback, but it will be
        // replaced with the real ID when the first message is sent
        const options = message.options || {};
        currentThread = codex.startThread(options);
        // Use thread.id if available (mock SDK), otherwise generate a temporary one
        const tempId = currentThread.id || `pending_${Date.now()}`;
        currentThreadId = currentThread.id; // Will be null with real SDK
        if (currentThreadId) {
          threads.set(currentThreadId, currentThread);
          threadOptionsById.set(currentThreadId, options);
        } else {
          pendingThreads.set(tempId, currentThread);
          tempThreadIds.set(currentThread, tempId);
          pendingThreadOptions.set(tempId, options);
        }
        console.log(`Created new thread: ${currentThreadId || tempId}`);
        
        ws.send(JSON.stringify({
          type: "thread_created",
          thread_id: currentThreadId || tempId,
          options
        }));
      } else if (message.type === "update_thread_options") {
        const threadId = message.thread_id;
        const options = message.options || {};
        const targetThread = threads.get(threadId) || pendingThreads.get(threadId);
        if (!targetThread) {
          ws.send(JSON.stringify({
            type: "error",
            message: `Thread ${threadId} not found for options update`
          }));
          return;
        }
        targetThread._threadOptions = options;
        if (threads.has(threadId)) {
          threadOptionsById.set(threadId, options);
        } else {
          pendingThreadOptions.set(threadId, options);
        }
        ws.send(JSON.stringify({
          type: "thread_options_updated",
          thread_id: threadId,
          options
        }));
      } else if (message.type === "switch_thread") {
        // Switch to an existing thread
        const threadId = message.thread_id;
        if (threads.has(threadId)) {
          currentThreadId = threadId;
          currentThread = threads.get(threadId);
          console.log(`Switched to thread: ${threadId}`);
          ws.send(JSON.stringify({
            type: "thread_switched",
            thread_id: currentThreadId
          }));
        } else if (pendingThreads.has(threadId)) {
          currentThreadId = threadId;
          currentThread = pendingThreads.get(threadId);
          console.log(`Switched to pending thread: ${threadId}`);
          ws.send(JSON.stringify({
            type: "thread_switched",
            thread_id: currentThreadId
          }));
        } else {
          ws.send(JSON.stringify({
            type: "error",
            message: `Thread ${threadId} not found`
          }));
        }
      } else if (message.type === "list_threads") {
        // List all available threads
        const threadList = Array.from(threads.keys()).concat(Array.from(pendingThreads.keys()));
        ws.send(JSON.stringify({
          type: "threads_list",
          threads: threadList,
          current: currentThreadId
        }));
      } else if (message.type === "message") {
        // Handle regular message
        await processMessage(message.text);
      } else {
        ws.send(JSON.stringify({
          type: "error",
          message: `Unknown message type: ${message.type}`
        }));
      }
    } catch (err) {
      // Fallback for plain text messages (backward compatibility)
      if (!m.toString().startsWith("{")) {
        try {
          await processMessage(m.toString());
          return;
        } catch (fallbackErr) {
          console.error("Fallback error:", fallbackErr);
        }
      }
      
      console.error("Error:", err);
      ws.send(JSON.stringify({
        type: "error",
        message: String(err)
      }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  if (MOCK_MODE) {
    console.log("💡 Try it out! No auth needed in mock mode.");
  }
});
