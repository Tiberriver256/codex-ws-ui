import { createServer } from "http";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { WebSocketServer } from "ws";

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

function normalizeDiffPath(diffPath) {
  if (!diffPath) return "unknown";
  let normalized = String(diffPath).replaceAll("\\", "/");
  normalized = normalized.replace(/^\\.\//, "");
  if (normalized.startsWith("/")) normalized = normalized.slice(1);
  return normalized || "unknown";
}

async function readTextFile(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

function tryGetGitRepoRoot(cwd) {
  try {
    const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd,
      encoding: "utf8",
    });
    if (result.status !== 0) return null;
    const root = (result.stdout || "").trim();
    return root || null;
  } catch {
    return null;
  }
}

function tryReadGitHeadFile(repoRoot, absPath) {
  const relative = path.relative(repoRoot, absPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  const gitPath = relative.split(path.sep).join("/");
  try {
    const result = spawnSync("git", ["show", `HEAD:${gitPath}`], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (result.status !== 0) return null;
    return result.stdout || null;
  } catch {
    return null;
  }
}

async function makeUnifiedDiff({ beforeText, afterText, displayPath }) {
  const normalizedPath = normalizeDiffPath(displayPath);
  if ((beforeText || "") === (afterText || "")) {
    return `diff --git a/${normalizedPath} b/${normalizedPath}\n(no changes)\n`;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codex-ws-ui-diff-"));
  const beforeFile = path.join(tempDir, "before");
  const afterFile = path.join(tempDir, "after");
  try {
    await fs.writeFile(beforeFile, beforeText || "", "utf8");
    await fs.writeFile(afterFile, afterText || "", "utf8");

    let diffOutput = "";
    try {
      const result = spawnSync(
        "git",
        ["diff", "--no-index", "--unified=3", "--no-color", "--", beforeFile, afterFile],
        { encoding: "utf8" }
      );
      diffOutput = result.stdout || "";
      if (!diffOutput && result.stderr) {
        diffOutput = String(result.stderr);
      }
    } catch {
      diffOutput = "";
    }

    if (!diffOutput) {
      return `diff --git a/${normalizedPath} b/${normalizedPath}\n(no diff available)\n`;
    }

    diffOutput = diffOutput
      .replaceAll(`a${beforeFile}`, `a/${normalizedPath}`)
      .replaceAll(`b${afterFile}`, `b/${normalizedPath}`);

    const MAX_DIFF_CHARS = 200_000;
    if (diffOutput.length > MAX_DIFF_CHARS) {
      diffOutput = diffOutput.slice(0, MAX_DIFF_CHARS) + "\n… diff truncated …\n";
    }

    return diffOutput;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

// Enhanced HTML with better UI
const html = `<!doctype html>
<html>
<head>
<meta charset=utf-8>
<title>Codex WebSocket UI</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  :root {
    color-scheme: dark;
    --bg: #0f1319;
    --bg-elev: rgba(18, 24, 33, 0.92);
    --bg-elev-strong: #151b24;
    --text: #e6edf3;
    --text-muted: #8b949e;
    --accent: #8eca9d;
    --accent-strong: #7ab78c;
    --danger: #f48771;
    --code-bg: #0d1117;
    --code-text: #e6edf3;
    --border: rgba(138, 202, 157, 0.25);
    --shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  [hidden] { display: none !important; }
  body {
    font-family: "Source Sans 3", "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(1200px 800px at 10% -10%, rgba(138, 202, 157, 0.12), transparent 50%),
      radial-gradient(900px 700px at 90% 0%, rgba(87, 120, 170, 0.18), transparent 55%),
      linear-gradient(160deg, #0b0f14 0%, #111722 55%, #0f1319 100%);
    color: var(--text);
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: var(--bg-elev);
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow);
  }
  .header h1 {
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.02em;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem 0.75rem;
    flex-wrap: wrap;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .thread-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .thread-selector {
    background: var(--bg-elev-strong);
    border: 1px solid transparent;
    color: var(--text);
    padding: 0.4rem 0.65rem;
    border-radius: 6px;
    font-size: 0.8rem;
    cursor: pointer;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: border-color 0.2s ease, transform 0.2s ease;
  }
  .thread-selector:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .new-thread-btn {
    background: var(--accent);
    border: none;
    color: #0d1117;
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.8rem;
    font-weight: 600;
    transition: background 0.2s, transform 0.2s;
  }
  .thread-options-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.45rem 0.9rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
    transition: border-color 0.2s, transform 0.2s;
  }
  .thread-options-btn:hover {
    border-color: var(--accent);
    transform: translateY(-1px);
  }
  .thread-options-summary {
    font-size: 0.78rem;
    color: var(--text-muted);
    padding: 0.35rem 0.6rem;
    border-radius: 999px;
    border: 1px solid transparent;
    background: rgba(13, 17, 23, 0.6);
  }
  .new-thread-btn:hover {
    background: var(--accent-strong);
    transform: translateY(-1px);
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(138, 202, 157, 0.6);
  }
  .status-dot.disconnected {
    background: var(--danger);
    box-shadow: 0 0 8px rgba(244, 135, 113, 0.6);
  }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .output-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }
  #output {
    width: min(100%, 8in);
    margin: 0 auto;
    font-size: 1.05rem;
    line-height: 1.65;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .input-area {
    background: var(--bg-elev);
    border-top: 1px solid var(--border);
    padding: 1rem 1.5rem 1.4rem;
    box-shadow: var(--shadow);
  }
  #form {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  #prompt {
    flex: 1;
    padding: 0.85rem 1rem;
    background: var(--bg-elev-strong);
    border: 1px solid transparent;
    color: var(--text);
    border-radius: 10px;
    font-size: 1rem;
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
  }
  #prompt:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(138, 202, 157, 0.2);
  }
  button {
    padding: 0.75rem 1.6rem;
    background: var(--accent);
    border: none;
    color: #0d1117;
    border-radius: 999px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    transition: background 0.2s, transform 0.2s;
  }
  button:hover {
    background: var(--accent-strong);
    transform: translateY(-1px);
  }
  button:active {
    background: var(--accent);
    transform: translateY(0);
  }
  button:disabled {
    background: #44505d;
    color: rgba(230, 237, 243, 0.6);
    cursor: not-allowed;
  }
  .ghost-btn {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
  }
  .ghost-btn:hover {
    background: rgba(138, 202, 157, 0.12);
    transform: translateY(-1px);
  }
  .message {
    margin-bottom: 1.1rem;
  }
  .message.user {
    color: var(--accent);
  }
  .message.assistant {
    color: #c9e6ff;
  }
  .message.reasoning {
    color: #dcdcaa;
    font-style: italic;
  }
  .message.command {
    color: #ce9178;
    font-family: "JetBrains Mono", "Consolas", "Monaco", "Courier New", monospace;
  }
  .message.file-change {
    color: #c586c0;
  }
  .message.error {
    color: var(--danger);
  }
  .message.todo {
    color: #b5cea8;
  }
  .message.usage {
    color: var(--text-muted);
    font-size: 0.85rem;
  }
  .event-type {
    font-weight: 600;
    margin-right: 0.5rem;
  }
  pre, code {
    font-family: "JetBrains Mono", "Consolas", "Monaco", "Courier New", monospace;
    background: var(--code-bg);
    color: var(--code-text);
    border-radius: 10px;
  }
  pre {
    padding: 1rem;
    overflow-x: auto;
    border: 1px solid rgba(138, 202, 157, 0.18);
  }
  code {
    padding: 0.1rem 0.35rem;
  }
  a {
    color: inherit;
    text-decoration: none;
    border-bottom: 2px solid var(--accent);
  }
  .options-panel {
    position: fixed;
    inset: 0;
    background: rgba(5, 9, 13, 0.65);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1rem, 2vw, 2rem);
    z-index: 10;
  }
  .options-card {
    width: min(100%, 720px);
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow);
    padding: 1.5rem 1.75rem;
    max-height: calc(100vh - 2.5rem);
    overflow: auto;
    overscroll-behavior: contain;
  }
  .options-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.25rem;
  }
  .options-header h2 {
    font-size: 1.3rem;
    margin-bottom: 0.2rem;
  }
  .options-header p {
    color: var(--text-muted);
    font-size: 0.9rem;
  }
  .options-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .options-group {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.75rem 1rem;
  }
  .options-field {
    font-size: 0.8rem;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .options-field input,
  .options-field select,
  .options-field textarea {
    background: var(--bg-elev-strong);
    color: var(--text);
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
    font-family: inherit;
  }
  .options-field textarea {
    resize: vertical;
    min-height: 3.8rem;
  }
  .options-advanced {
    border-radius: 14px;
    border: 1px solid rgba(138, 202, 157, 0.14);
    background: rgba(13, 17, 23, 0.5);
    padding: 0.65rem 0.8rem;
  }
  .options-advanced summary {
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    list-style: none;
  }
  .options-advanced summary::-webkit-details-marker {
    display: none;
  }
  .options-advanced summary::after {
    content: "▾";
    float: right;
    color: var(--text-muted);
  }
  .options-advanced[open] summary {
    margin-bottom: 0.75rem;
  }
  .options-advanced[open] summary::after {
    content: "▴";
  }
  .options-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1.5rem;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .options-actions .left-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }
  .options-summary-strip {
    font-size: 0.85rem;
    color: var(--text-muted);
    padding: 0.5rem 0.8rem;
    border-radius: 999px;
    background: rgba(13, 17, 23, 0.7);
    border: 1px solid rgba(138, 202, 157, 0.2);
  }
  @media (max-width: 700px) {
    .header {
      padding: 0.9rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.6rem;
    }
    .status {
      width: 100%;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 0.5rem 0.75rem;
    }
    .thread-controls {
      width: 100%;
    }
    .thread-selector,
    .new-thread-btn,
    .thread-options-btn {
      flex: 1 1 160px;
    }
    .thread-options-summary {
      display: none;
    }
    .output-scroll {
      padding: 1rem;
    }
    #form {
      flex-direction: column;
    }
    button,
    .new-thread-btn {
      width: 100%;
    }
    .options-card {
      padding: 1.1rem;
      border-radius: 16px;
      max-height: calc(100vh - 1.5rem);
    }
    .options-header {
      flex-direction: column;
      align-items: flex-start;
    }
    .options-actions {
      flex-direction: column;
      align-items: stretch;
    }
    .options-actions .left-actions {
      width: 100%;
      flex-direction: column;
      align-items: flex-start;
    }
  }
  ${MOCK_MODE ? `
  .mock-badge {
    background: #ce9178;
    color: #1e1e1e;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
  }
  ` : ''}
</style>
</head>
<body>
  <div class="header">
    <h1>Codex WebSocket UI</h1>
    <div class="status">
      ${MOCK_MODE ? '<span class="mock-badge">MOCK MODE</span>' : ''}
      <div class="thread-controls">
        <select id="threadSelector" class="thread-selector" disabled>
          <option value="">No thread</option>
        </select>
        <button id="newThreadBtn" class="new-thread-btn" disabled>+ New Thread</button>
        <button id="threadOptionsBtn" class="thread-options-btn" disabled>Thread Settings</button>
        <span id="threadOptionsSummary" class="thread-options-summary">Defaults</span>
      </div>
      <span class="status-dot" id="statusDot"></span>
      <span id="statusText">Connecting...</span>
    </div>
  </div>
  <div class="main">
    <div class="output-scroll">
      <div id="output"></div>
    </div>
    <div class="input-area">
      <form id="form">
        <input 
          id="prompt" 
          autocomplete="off" 
          placeholder="Type your message here..."
          disabled
        >
        <button type="submit" disabled>Send</button>
      </form>
    </div>
  </div>
  <div class="options-panel" id="threadOptionsPanel" hidden>
    <div class="options-card">
      <div class="options-header">
        <div>
          <h2>Thread Options</h2>
          <p id="threadOptionsModeText">Create a new thread with custom options.</p>
        </div>
        <button type="button" id="closeOptionsBtn" class="ghost-btn">Close</button>
      </div>
      <form id="threadOptionsForm" class="options-form">
        <div class="options-group">
          <label class="options-field">
            Model
            <select id="threadModel"></select>
          </label>
          <label class="options-field">
            Reasoning Effort
            <select id="threadReasoning">
              <option value="default">Default</option>
              <option value="minimal">Minimal</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="xhigh">Extra High</option>
            </select>
          </label>
        </div>
        <details class="options-advanced">
          <summary>Advanced settings</summary>
          <div class="options-group">
            <label class="options-field">
              Approval Policy
              <select id="threadApproval">
                <option value="default">Default</option>
                <option value="never">Never</option>
                <option value="on-request">On Request</option>
                <option value="on-failure">On Failure</option>
                <option value="untrusted">Untrusted</option>
              </select>
            </label>
            <label class="options-field">
              Sandbox Mode
              <select id="threadSandbox">
                <option value="default">Default</option>
                <option value="read-only">Read Only</option>
                <option value="workspace-write">Workspace Write</option>
                <option value="danger-full-access">Danger Full Access</option>
              </select>
            </label>
            <label class="options-field">
              Skip Git Repo Check
              <select id="threadSkipRepoCheck">
                <option value="default">Default</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label class="options-field">
              Network Access
              <select id="threadNetwork">
                <option value="default">Default</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
            <label class="options-field">
              Web Search
              <select id="threadWebSearch">
                <option value="default">Default</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </label>
          </div>
        </details>
        <div class="options-group">
          <label class="options-field">
            Working Directory
            <input id="threadWorkingDir" placeholder="/path/to/workdir" />
          </label>
          <label class="options-field">
            Additional Directories (one per line)
            <textarea id="threadAdditionalDirs" placeholder="/path/one&#10;/path/two"></textarea>
          </label>
        </div>
        <div class="options-actions">
          <div class="left-actions">
            <button type="button" id="resetOptionsBtn" class="ghost-btn">Use Defaults</button>
            <span class="options-summary-strip" id="threadOptionsSummaryStrip">Defaults</span>
          </div>
          <button type="button" id="applyOptionsBtn">Create Thread</button>
        </div>
      </form>
    </div>
  </div>
  <script>
    const $ = q => document.querySelector(q);
    const modelCatalog = ${JSON.stringify(modelCatalog)};
    const output = $("#output");
    const form = $("#form");
    const promptInput = $("#prompt");
    const submitBtn = form.querySelector("button");
    const statusDot = $("#statusDot");
    const statusText = $("#statusText");
    const threadSelector = $("#threadSelector");
    const newThreadBtn = $("#newThreadBtn");
    const threadOptionsBtn = $("#threadOptionsBtn");
    const threadOptionsSummary = $("#threadOptionsSummary");
    const threadOptionsPanel = $("#threadOptionsPanel");
    const threadOptionsModeText = $("#threadOptionsModeText");
    const closeOptionsBtn = $("#closeOptionsBtn");
    const resetOptionsBtn = $("#resetOptionsBtn");
    const applyOptionsBtn = $("#applyOptionsBtn");
    const threadOptionsSummaryStrip = $("#threadOptionsSummaryStrip");
    const threadOptionsForm = $("#threadOptionsForm");
    const threadModel = $("#threadModel");
    const threadReasoning = $("#threadReasoning");
    const threadApproval = $("#threadApproval");
    const threadSandbox = $("#threadSandbox");
    const threadSkipRepoCheck = $("#threadSkipRepoCheck");
    const threadNetwork = $("#threadNetwork");
    const threadWebSearch = $("#threadWebSearch");
    const threadWorkingDir = $("#threadWorkingDir");
    const threadAdditionalDirs = $("#threadAdditionalDirs");
    
    let ws;
    const agentMessageDivs = new Map();
    let threads = [];
    let currentThreadId = null;
    let threadOutputs = new Map(); // Store output for each thread
    let threadOptionsById = new Map();
    let optionsPanelMode = "create";
    const defaultThreadOptions = {};

    function renderModelSelect(currentValue = "") {
      threadModel.innerHTML = "";
      const models = Array.isArray(modelCatalog) ? modelCatalog : [];
      const defaultModel = models.find((model) => model.isDefault || model.is_default) || models[0];
      const defaultLabel = defaultModel
        ? "Default (" + (defaultModel.displayName || defaultModel.display_name || defaultModel.model) + ")"
        : "Default";
      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = defaultLabel;
      threadModel.appendChild(defaultOption);

      models.forEach((model) => {
        const option = document.createElement("option");
        option.value = model.model;
        option.textContent = model.displayName || model.display_name || model.model;
        threadModel.appendChild(option);
      });

      if (currentValue && !models.some((model) => model.model === currentValue)) {
        const option = document.createElement("option");
        option.value = currentValue;
        option.textContent = "Current: " + currentValue;
        threadModel.appendChild(option);
      }

      threadModel.value = currentValue || "";
    }
    
    function connect() {
      const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(wsProtocol + "://" + location.host);
      
      ws.onopen = () => {
        statusDot.classList.remove("disconnected");
        statusText.textContent = "Connected";
        promptInput.disabled = false;
        submitBtn.disabled = false;
        threadSelector.disabled = false;
        newThreadBtn.disabled = false;
        threadOptionsBtn.disabled = false;
        promptInput.focus();
        addSystemMessage("Connected to server");
      };
      
      ws.onclose = () => {
        statusDot.classList.add("disconnected");
        statusText.textContent = "Disconnected";
        promptInput.disabled = true;
        submitBtn.disabled = true;
        threadSelector.disabled = true;
        newThreadBtn.disabled = true;
        threadOptionsBtn.disabled = true;
        addSystemMessage("Disconnected from server");
      };
      
      ws.onerror = (error) => {
        addSystemMessage("WebSocket error occurred", "error");
      };
      
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          handleEvent(data);
        } catch (err) {
          // Fallback for plain text messages
          addMessage(e.data, "assistant");
        }
      };
    }
    
    const THREAD_ID_DISPLAY_LENGTH = 25;
    
    function saveCurrentOutput() {
      if (currentThreadId) {
        threadOutputs.set(currentThreadId, output.innerHTML);
      }
    }
    
    function loadThreadOutput(threadId) {
      if (threadOutputs.has(threadId)) {
        output.innerHTML = threadOutputs.get(threadId);
      } else {
        output.innerHTML = "";
      }
      output.scrollTop = output.scrollHeight;
    }
    
    function updateThreadSelector() {
      const currentValue = threadSelector.value;
      threadSelector.innerHTML = '<option value="">Select a thread...</option>';
      
      threads.forEach(threadId => {
        const option = document.createElement("option");
        option.value = threadId;
        option.textContent = threadId.substring(0, THREAD_ID_DISPLAY_LENGTH) + "...";
        if (threadId === currentThreadId) {
          option.selected = true;
        }
        threadSelector.appendChild(option);
      });
    }
    
    function createNewThread(options = {}) {
      saveCurrentOutput();
      ws.send(JSON.stringify({ type: "new_thread", options }));
    }
    
    function switchThread(threadId) {
      if (threadId && threadId !== currentThreadId) {
        saveCurrentOutput();
        currentThreadId = threadId;
        loadThreadOutput(threadId);
        updateOptionsSummaryDisplay();
        ws.send(JSON.stringify({ type: "switch_thread", thread_id: threadId }));
      }
    }

    function setOptionsPanelMode(mode) {
      optionsPanelMode = mode;
      if (mode === "create") {
        threadOptionsModeText.textContent = "Create a new thread with custom options.";
        applyOptionsBtn.textContent = "Create Thread";
      } else {
        threadOptionsModeText.textContent = "Update settings for the current thread.";
        applyOptionsBtn.textContent = "Apply Changes";
      }
    }

    function openOptionsPanel(mode, options = {}) {
      setOptionsPanelMode(mode);
      fillOptionsForm(options);
      threadOptionsPanel.hidden = false;
    }

    function closeOptionsPanel() {
      threadOptionsPanel.hidden = true;
    }

    function formatOptionsSummary(options = {}) {
      if (!options || Object.keys(options).length === 0) {
        return "Defaults";
      }
      const pieces = [];
      if (options.model) pieces.push("Model: " + options.model);
      if (options.modelReasoningEffort) pieces.push("Reasoning: " + options.modelReasoningEffort);
      if (options.sandboxMode) pieces.push("Sandbox: " + options.sandboxMode);
      if (typeof options.networkAccessEnabled === "boolean") {
        pieces.push("Network: " + (options.networkAccessEnabled ? "on" : "off"));
      }
      if (typeof options.webSearchEnabled === "boolean") {
        pieces.push("Search: " + (options.webSearchEnabled ? "on" : "off"));
      }
      if (options.approvalPolicy) pieces.push("Approval: " + options.approvalPolicy);
      if (options.workingDirectory) pieces.push("Dir: " + options.workingDirectory);
      return pieces.join(" • ");
    }

    function updateOptionsSummaryDisplay() {
      const summary = formatOptionsSummary(threadOptionsById.get(currentThreadId));
      threadOptionsSummary.textContent = summary;
      if (threadOptionsPanel.hidden) {
        threadOptionsSummaryStrip.textContent = summary;
      }
    }

    function fillOptionsForm(options = {}) {
      renderModelSelect(options.model || "");
      threadReasoning.value = options.modelReasoningEffort || "default";
      threadApproval.value = options.approvalPolicy || "default";
      threadSandbox.value = options.sandboxMode || "default";
      threadSkipRepoCheck.value = typeof options.skipGitRepoCheck === "boolean"
        ? (options.skipGitRepoCheck ? "on" : "off")
        : "default";
      threadNetwork.value = typeof options.networkAccessEnabled === "boolean"
        ? (options.networkAccessEnabled ? "on" : "off")
        : "default";
      threadWebSearch.value = typeof options.webSearchEnabled === "boolean"
        ? (options.webSearchEnabled ? "on" : "off")
        : "default";
      threadWorkingDir.value = options.workingDirectory || "";
      threadAdditionalDirs.value = Array.isArray(options.additionalDirectories)
        ? options.additionalDirectories.join("\\n")
        : "";
      syncWebSearchDependency();
      threadOptionsSummaryStrip.textContent = formatOptionsSummary(options);
      updateOptionsSummaryDisplay();
    }

    function syncWebSearchDependency() {
      const networkValue = threadNetwork.value;
      if (networkValue === "off") {
        threadWebSearch.value = "off";
        threadWebSearch.disabled = true;
      } else {
        threadWebSearch.disabled = false;
      }
    }

    function collectOptionsFromForm() {
      const options = {};
      const model = threadModel.value.trim();
      if (model) options.model = model;
      if (threadReasoning.value !== "default") {
        options.modelReasoningEffort = threadReasoning.value;
      }
      if (threadApproval.value !== "default") {
        options.approvalPolicy = threadApproval.value;
      }
      if (threadSandbox.value !== "default") {
        options.sandboxMode = threadSandbox.value;
      }
      if (threadSkipRepoCheck.value !== "default") {
        options.skipGitRepoCheck = threadSkipRepoCheck.value === "on";
      }
      if (threadNetwork.value !== "default") {
        options.networkAccessEnabled = threadNetwork.value === "on";
      }
      if (threadWebSearch.value !== "default") {
        options.webSearchEnabled = threadWebSearch.value === "on";
      }
      const workingDir = threadWorkingDir.value.trim();
      if (workingDir) options.workingDirectory = workingDir;
      const additionalDirs = threadAdditionalDirs.value
        .split("\\n")
        .map(dir => dir.trim())
        .filter(Boolean);
      if (additionalDirs.length > 0) {
        options.additionalDirectories = additionalDirs;
      }
      return options;
    }

    function updateOptionsSummaryFromForm() {
      const summary = formatOptionsSummary(collectOptionsFromForm());
      threadOptionsSummaryStrip.textContent = summary;
    }
    
    function handleEvent(event) {
      switch (event.type) {
        case "thread_created":
          currentThreadId = event.thread_id;
          if (!threads.includes(currentThreadId)) {
            threads.push(currentThreadId);
          }
          threadOptionsById.set(currentThreadId, event.options || defaultThreadOptions);
          threadOutputs.set(currentThreadId, "");
          output.innerHTML = "";
          updateThreadSelector();
          updateOptionsSummaryDisplay();
          addSystemMessage(\`✨ New thread created: \${event.thread_id}\`);
          if (event.options && Object.keys(event.options).length > 0) {
            addSystemMessage(\`🔧 Thread options set: \${formatOptionsSummary(event.options)}\`);
          }
          break;
          
        case "thread_switched":
          addSystemMessage(\`🔄 Switched to thread: \${event.thread_id}\`);
          updateOptionsSummaryDisplay();
          break;

        case "thread_id_assigned": {
          const tempId = event.temp_id;
          const realId = event.thread_id;
          const tempIndex = threads.indexOf(tempId);
          if (tempIndex !== -1) {
            threads.splice(tempIndex, 1, realId);
          } else if (!threads.includes(realId)) {
            threads.push(realId);
          }
          if (threadOutputs.has(tempId)) {
            threadOutputs.set(realId, threadOutputs.get(tempId));
            threadOutputs.delete(tempId);
          }
          if (currentThreadId === tempId) {
            currentThreadId = realId;
          }
          if (threadOptionsById.has(tempId)) {
            threadOptionsById.set(realId, threadOptionsById.get(tempId));
            threadOptionsById.delete(tempId);
          }
          if (event.options) {
            threadOptionsById.set(realId, event.options);
          }
          updateThreadSelector();
          updateOptionsSummaryDisplay();
          addSystemMessage(\`✅ Thread ID assigned: \${realId}\`);
          break;
        }
          
        case "thread.started": {
          let shouldAnnounce = false;
          if (currentThreadId && currentThreadId.startsWith("pending_")) {
            const tempId = currentThreadId;
            const realId = event.thread_id;
            const tempIndex = threads.indexOf(tempId);
            if (tempIndex !== -1) {
              threads.splice(tempIndex, 1, realId);
            } else if (!threads.includes(realId)) {
              threads.push(realId);
            }
            if (threadOutputs.has(tempId)) {
              threadOutputs.set(realId, threadOutputs.get(tempId));
              threadOutputs.delete(tempId);
            }
            currentThreadId = realId;
            if (threadOptionsById.has(tempId)) {
              threadOptionsById.set(realId, threadOptionsById.get(tempId));
              threadOptionsById.delete(tempId);
            }
            updateThreadSelector();
            updateOptionsSummaryDisplay();
            shouldAnnounce = true;
          } else if (!threads.includes(event.thread_id)) {
            threads.push(event.thread_id);
            currentThreadId = event.thread_id;
            updateThreadSelector();
            updateOptionsSummaryDisplay();
            shouldAnnounce = true;
          }
          if (shouldAnnounce) {
            addSystemMessage(\`Thread started: \${event.thread_id}\`);
          }
          break;
        }
          
        case "thread_options_updated": {
          if (event.thread_id) {
            threadOptionsById.set(event.thread_id, event.options || defaultThreadOptions);
            if (event.thread_id === currentThreadId) {
              updateOptionsSummaryDisplay();
            }
          }
          addSystemMessage(\`🔧 Thread options updated: \${formatOptionsSummary(event.options)}\`);
          break;
        }
          
        case "turn.started":
          addSystemMessage("Processing...", "assistant");
          break;
          
        case "turn.completed":
          if (event.usage) {
            const u = event.usage;
            addMessage(
              \`📊 Tokens - Input: \${u.input_tokens}, Cached: \${u.cached_input_tokens}, Output: \${u.output_tokens}\`,
              "usage"
            );
          } else {
            addMessage("📊 Tokens - Usage unavailable", "usage");
          }
          break;
          
        case "turn.failed":
          addMessage(\`❌ Turn failed: \${event.error.message}\`, "error");
          break;
          
        case "item.started":
        case "item.updated":
        case "item.completed":
          handleItem(event);
          break;
          
        case "error":
          addMessage(\`❌ Error: \${event.message}\`, "error");
          break;
      }
    }
    
    function handleItem(event) {
      const item = event.item;
      const isCompleted = event.type === "item.completed";
      
      switch (item.type) {
        case "agent_message": {
          let messageDiv = agentMessageDivs.get(item.id);
          if (!messageDiv && (event.type === "item.started" || event.type === "item.updated" || isCompleted)) {
            messageDiv = addMessage("", "assistant", true);
            agentMessageDivs.set(item.id, messageDiv);
          }
          if (messageDiv && (event.type === "item.updated" || isCompleted)) {
            messageDiv.textContent = "💬 " + item.text;
          }
          if (isCompleted) {
            agentMessageDivs.delete(item.id);
          }
          break;
        }
          
        case "reasoning":
          if (isCompleted) {
            addMessage("🤔 " + item.text, "reasoning");
          }
          break;
          
        case "command_execution":
          if (isCompleted) {
            const exitInfo = item.exit_code !== undefined ? \` (exit: \${item.exit_code})\` : "";
            addMessage(
              \`⚡ Command: \${item.command}\${exitInfo}\\n\${item.aggregated_output}\`,
              "command"
            );
          }
          break;
          
        case "file_change":
          if (isCompleted) {
            const changes = Array.isArray(item.changes) ? item.changes : [];
            const uiDiffs = Array.isArray(item.ui_diffs) ? item.ui_diffs : [];

            if (uiDiffs.length > 0) {
              const details = document.createElement("details");
              details.open = true;

              const summary = document.createElement("summary");
              summary.textContent = "📝 File Changes" + (changes.length ? " (" + changes.length + ")" : "");
              details.appendChild(summary);

              if (item.ui_diff_error) {
                const errorLine = document.createElement("div");
                errorLine.textContent = "⚠️ Diff error: " + item.ui_diff_error;
                details.appendChild(errorLine);
              }

              for (const diffEntry of uiDiffs) {
                const heading = document.createElement("div");
                heading.textContent = (diffEntry.kind || "update") + ": " + (diffEntry.path || "");
                details.appendChild(heading);

                const pre = document.createElement("pre");
                pre.textContent = diffEntry.diff || "";
                details.appendChild(pre);
              }

              addMessage(details, "file-change");
            } else {
              const changeText = changes.map(c => "  " + c.kind + ": " + c.path).join("\\n");
              addMessage("📝 File Changes:\\n" + changeText, "file-change");
            }
          }
          break;
          
        case "todo_list":
          if (event.type === "item.updated" || isCompleted) {
            const todos = item.items.map(t => 
              \`  \${t.completed ? "✅" : "⬜"} \${t.text}\`
            ).join("\\n");
            addMessage(\`📋 Todo:\\n\${todos}\`, "todo");
          }
          break;
          
        case "web_search":
          if (isCompleted) {
            addMessage(\`🔍 Web search: \${item.query}\`, "assistant");
          }
          break;
          
        case "mcp_tool_call":
          if (isCompleted) {
            const status = item.status === "completed" ? "✅" : "❌";
            addMessage(
              \`🔧 \${status} Tool: \${item.server}/\${item.tool}\`,
              "command"
            );
          }
          break;
          
        case "error":
          addMessage(\`❌ \${item.message}\`, "error");
          break;
      }
    }

    threadNetwork.addEventListener("change", syncWebSearchDependency);
    threadWebSearch.addEventListener("change", syncWebSearchDependency);
    [
      threadModel,
      threadReasoning,
      threadApproval,
      threadSandbox,
      threadSkipRepoCheck,
      threadNetwork,
      threadWebSearch,
      threadWorkingDir,
      threadAdditionalDirs
    ].forEach(el => {
      el.addEventListener("input", updateOptionsSummaryFromForm);
      el.addEventListener("change", updateOptionsSummaryFromForm);
    });

    newThreadBtn.addEventListener("click", () => {
      openOptionsPanel("create", defaultThreadOptions);
    });

    threadOptionsBtn.addEventListener("click", () => {
      if (!currentThreadId) {
        openOptionsPanel("create", defaultThreadOptions);
      } else {
        openOptionsPanel("update", threadOptionsById.get(currentThreadId) || defaultThreadOptions);
      }
    });

    closeOptionsBtn.addEventListener("click", closeOptionsPanel);
    resetOptionsBtn.addEventListener("click", () => {
      fillOptionsForm(defaultThreadOptions);
    });

    applyOptionsBtn.addEventListener("click", () => {
      const options = collectOptionsFromForm();
      closeOptionsPanel();
      if (optionsPanelMode === "create") {
        createNewThread(options);
      } else if (currentThreadId) {
        ws.send(JSON.stringify({ type: "update_thread_options", thread_id: currentThreadId, options }));
      }
    });
    
    function addMessage(content, type = "assistant", returnDiv = false) {
      const div = document.createElement("div");
      div.className = \`message \${type}\`;
      if (typeof content === "string") {
        div.textContent = content;
      } else if (content instanceof Node) {
        div.appendChild(content);
      } else {
        div.textContent = String(content);
      }
      output.appendChild(div);
      output.scrollTop = output.scrollHeight;
      return returnDiv ? div : null;
    }
    
    function addSystemMessage(text, type = "assistant") {
      addMessage("ℹ️  " + text, type);
    }
    
    form.onsubmit = (ev) => {
      ev.preventDefault();
      const value = promptInput.value.trim();
      if (!value) return;
      
      addMessage(\`> \${value}\`, "user");
      ws.send(JSON.stringify({ type: "message", text: value }));
      promptInput.value = "";
      promptInput.focus();
    };
    
    threadSelector.onchange = (ev) => {
      const threadId = ev.target.value;
      if (threadId) {
        switchThread(threadId);
      }
    };
    
    connect();
  </script>
</body>
</html>`;

const server = createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
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
