import { createStructuredOutputCard } from "./structured-output.js";

export function createUiRenderer(output) {
  const agentMessageDivs = new Map();

  function addMessage(content, type = "assistant", returnDiv = false) {
    const div = document.createElement("div");
    div.className = `message ${type}`;
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

  function addStructuredOutput(data, options = {}) {
    const card = createStructuredOutputCard({ data, title: options.title });
    addMessage(card, "structured-output");
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
          const exitInfo = item.exit_code !== undefined ? ` (exit: ${item.exit_code})` : "";
          addMessage(
            `⚡ Command: ${item.command}${exitInfo}\n${item.aggregated_output}`,
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
            addMessage("📝 File Changes:\n" + changeText, "file-change");
          }
        }
        break;

      case "todo_list":
        if (event.type === "item.updated" || isCompleted) {
          const todos = item.items.map(t =>
            `  ${t.completed ? "✅" : "⬜"} ${t.text}`
          ).join("\\n");
          addMessage(`📋 Todo:\n${todos}`, "todo");
        }
        break;

      case "web_search":
        if (isCompleted) {
          addMessage(`🔍 Web search: ${item.query}`, "assistant");
        }
        break;

      case "mcp_tool_call":
        if (isCompleted) {
          const status = item.status === "completed" ? "✅" : "❌";
          addMessage(
            `🔧 ${status} Tool: ${item.server}/${item.tool}`,
            "command"
          );
        }
        break;

      case "error":
        addMessage(`❌ ${item.message}`, "error");
        break;
    }
  }

  return { addMessage, addSystemMessage, addStructuredOutput, handleItem };
}
