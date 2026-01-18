import { createServer } from "http";
import { WebSocketServer } from "ws";

// Determine if we're in mock/test mode
const MOCK_MODE = process.env.CODEX_MOCK === "1" || process.env.CODEX_MOCK === "true";

let Codex;
if (MOCK_MODE) {
  console.log("🧪 Running in MOCK mode - no API key required");
  const mockModule = await import("./mock-codex.mjs");
  Codex = mockModule.Codex;
} else {
  if (!process.env.CODEX_API_KEY) {
    console.error("Set CODEX_API_KEY and rerun, or use CODEX_MOCK=1 for testing.");
    process.exit(1);
  }
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
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #1e1e1e;
    color: #d4d4d4;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .header {
    background: #2d2d30;
    padding: 1rem;
    border-bottom: 1px solid #3e3e42;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 {
    font-size: 1.2rem;
    font-weight: 500;
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #4ec9b0;
  }
  .status-dot.disconnected {
    background: #f48771;
  }
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  #output {
    flex: 1;
    padding: 1rem;
    overflow-y: auto;
    font-family: "Consolas", "Monaco", "Courier New", monospace;
    font-size: 0.9rem;
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .input-area {
    background: #2d2d30;
    border-top: 1px solid #3e3e42;
    padding: 1rem;
  }
  #form {
    display: flex;
    gap: 0.5rem;
  }
  #prompt {
    flex: 1;
    padding: 0.75rem;
    background: #3c3c3c;
    border: 1px solid #3e3e42;
    color: #d4d4d4;
    border-radius: 4px;
    font-size: 0.95rem;
    font-family: inherit;
  }
  #prompt:focus {
    outline: none;
    border-color: #007acc;
  }
  button {
    padding: 0.75rem 1.5rem;
    background: #0e639c;
    border: none;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: background 0.2s;
  }
  button:hover {
    background: #1177bb;
  }
  button:active {
    background: #0d5a8f;
  }
  button:disabled {
    background: #555;
    cursor: not-allowed;
  }
  .message {
    margin-bottom: 1rem;
  }
  .message.user {
    color: #4ec9b0;
  }
  .message.assistant {
    color: #9cdcfe;
  }
  .message.reasoning {
    color: #dcdcaa;
    font-style: italic;
  }
  .message.command {
    color: #ce9178;
  }
  .message.file-change {
    color: #c586c0;
  }
  .message.error {
    color: #f48771;
  }
  .message.todo {
    color: #b5cea8;
  }
  .message.usage {
    color: #808080;
    font-size: 0.85rem;
  }
  .event-type {
    font-weight: 600;
    margin-right: 0.5rem;
  }
  ${MOCK_MODE ? `
  .mock-badge {
    background: #ce9178;
    color: #1e1e1e;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
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
      <span class="status-dot" id="statusDot"></span>
      <span id="statusText">Connecting...</span>
    </div>
  </div>
  <div class="main">
    <div id="output"></div>
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
    
    let ws;
    let currentMessageDiv = null;
    
    function connect() {
      ws = new WebSocket("ws://127.0.0.1:8080");
      
      ws.onopen = () => {
        statusDot.classList.remove("disconnected");
        statusText.textContent = "Connected";
        promptInput.disabled = false;
        submitBtn.disabled = false;
        promptInput.focus();
        addSystemMessage("Connected to server");
      };
      
      ws.onclose = () => {
        statusDot.classList.add("disconnected");
        statusText.textContent = "Disconnected";
        promptInput.disabled = true;
        submitBtn.disabled = true;
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
    
    function handleEvent(event) {
      switch (event.type) {
        case "thread.started":
          addSystemMessage(\`Thread started: \${event.thread_id}\`);
          break;
          
        case "turn.started":
          addSystemMessage("Processing...", "assistant");
          break;
          
        case "turn.completed":
          const u = event.usage;
          addMessage(
            \`📊 Tokens - Input: \${u.input_tokens}, Cached: \${u.cached_input_tokens}, Output: \${u.output_tokens}\`,
            "usage"
          );
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
        case "agent_message":
          if (event.type === "item.started") {
            currentMessageDiv = addMessage("", "assistant", true);
          } else if (currentMessageDiv) {
            currentMessageDiv.textContent = "💬 " + item.text;
            if (isCompleted) {
              currentMessageDiv = null;
            }
          }
          break;
          
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
      ws.send(value);
      promptInput.value = "";
      promptInput.focus();
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
  const thread = codex.startThread({ skipGitRepoCheck: true });

  ws.on("message", async (m) => {
    try {
      const prompt = m.toString();
      console.log(`Received: ${prompt}`);
      
      // Use the enhanced event streaming
      const { events } = await thread.runStreamed(prompt);
      
      for await (const event of events) {
        // Send the full event as JSON for rich client handling
        ws.send(JSON.stringify(event));
      }
    } catch (err) {
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
const HOST = "127.0.0.1";

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
  if (MOCK_MODE) {
    console.log("💡 Try it out! No API key needed in mock mode.");
  }
});
