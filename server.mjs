import { createServer } from "http";
import { WebSocketServer } from "ws";

// Determine if we're in mock/test mode
const MOCK_MODE = process.env.CODEX_MOCK === "1" || process.env.CODEX_MOCK === "true";

let Codex;
if (MOCK_MODE) {
  console.log("🧪 Running in MOCK mode - no auth required");
  const mockModule = await import("./mock-codex.mjs");
  Codex = mockModule.Codex;
} else {
  const realModule = await import("@openai/codex-sdk");
  Codex = realModule.Codex;
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
    gap: 0.5rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }
  .thread-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
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
  @media (max-width: 700px) {
    .header {
      padding: 0.9rem 1rem;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.6rem;
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
  <script>
    const $ = q => document.querySelector(q);
    const output = $("#output");
    const form = $("#form");
    const promptInput = $("#prompt");
    const submitBtn = form.querySelector("button");
    const statusDot = $("#statusDot");
    const statusText = $("#statusText");
    const threadSelector = $("#threadSelector");
    const newThreadBtn = $("#newThreadBtn");
    
    let ws;
    const agentMessageDivs = new Map();
    let threads = [];
    let currentThreadId = null;
    let threadOutputs = new Map(); // Store output for each thread
    
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
    
    function createNewThread() {
      saveCurrentOutput();
      ws.send(JSON.stringify({ type: "new_thread" }));
    }
    
    function switchThread(threadId) {
      if (threadId && threadId !== currentThreadId) {
        saveCurrentOutput();
        currentThreadId = threadId;
        loadThreadOutput(threadId);
        ws.send(JSON.stringify({ type: "switch_thread", thread_id: threadId }));
      }
    }
    
    function handleEvent(event) {
      switch (event.type) {
        case "thread_created":
          currentThreadId = event.thread_id;
          if (!threads.includes(currentThreadId)) {
            threads.push(currentThreadId);
          }
          threadOutputs.set(currentThreadId, "");
          output.innerHTML = "";
          updateThreadSelector();
          addSystemMessage(\`✨ New thread created: \${event.thread_id}\`);
          break;
          
        case "thread_switched":
          addSystemMessage(\`🔄 Switched to thread: \${event.thread_id}\`);
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
          updateThreadSelector();
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
            updateThreadSelector();
            shouldAnnounce = true;
          } else if (!threads.includes(event.thread_id)) {
            threads.push(event.thread_id);
            currentThreadId = event.thread_id;
            updateThreadSelector();
            shouldAnnounce = true;
          }
          if (shouldAnnounce) {
            addSystemMessage(\`Thread started: \${event.thread_id}\`);
          }
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
            const changes = item.changes.map(c => \`  \${c.kind}: \${c.path}\`).join("\\n");
            addMessage(\`📝 File Changes:\\n\${changes}\`, "file-change");
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
    
    function addMessage(text, type = "assistant", returnDiv = false) {
      const div = document.createElement("div");
      div.className = \`message \${type}\`;
      div.textContent = text;
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
    
    newThreadBtn.onclick = () => {
      createNewThread();
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
  const tempThreadIds = new WeakMap(); // thread -> temp_id
  let currentThread = null; // Store the current thread object directly
  let currentThreadId = null;

  // Helper function to handle message processing
  async function processMessage(prompt) {
    // Create initial thread if none exists
    if (!currentThread) {
      currentThread = codex.startThread({ skipGitRepoCheck: true });
      // Note: thread.id may be null initially with the real SDK
      // It gets set after thread.started event is received
      console.log(`Auto-created thread (id pending until first turn)`);
    }
    
    console.log(`Received on thread ${currentThreadId || '(pending)'}: ${prompt}`);
    
    // Use the enhanced event streaming
    const { events } = await currentThread.runStreamed(prompt);
    
    for await (const event of events) {
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
              thread_id: newThreadId
            }));
          }
          // First turn - store the thread with its ID
          currentThreadId = newThreadId;
          threads.set(currentThreadId, currentThread);
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
        currentThread = codex.startThread({ skipGitRepoCheck: true });
        // Use thread.id if available (mock SDK), otherwise generate a temporary one
        const tempId = currentThread.id || `pending_${Date.now()}`;
        currentThreadId = currentThread.id; // Will be null with real SDK
        if (currentThreadId) {
          threads.set(currentThreadId, currentThread);
        } else {
          pendingThreads.set(tempId, currentThread);
          tempThreadIds.set(currentThread, tempId);
        }
        console.log(`Created new thread: ${currentThreadId || tempId}`);
        
        ws.send(JSON.stringify({
          type: "thread_created",
          thread_id: currentThreadId || tempId
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
