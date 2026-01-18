export function createUiActions({
  threadState,
  threadOptions,
  uiRenderer,
  sendMessage
}) {
  const { addMessage, addSystemMessage, handleItem } = uiRenderer;
  const defaultThreadOptions = threadOptions.getDefaultOptions();

  function createNewThread(options = {}) {
    threadState.saveCurrentOutput();
    sendMessage({ type: "new_thread", options });
  }

  function switchThread(threadId) {
    if (threadState.switchThread(threadId)) {
      threadOptions.updateOptionsSummaryDisplay();
      sendMessage({ type: "switch_thread", thread_id: threadId });
    }
  }

  function handleEvent(event) {
    switch (event.type) {
      case "thread_created":
        threadState.setCurrentThreadId(event.thread_id);
        threadState.ensureThread(event.thread_id);
        threadOptions.setThreadOptions(event.thread_id, event.options || defaultThreadOptions);
        threadState.setThreadOutput(event.thread_id, "");
        threadState.clearOutput();
        threadState.updateThreadSelector();
        threadOptions.updateOptionsSummaryDisplay();
        addSystemMessage(`✨ New thread created: ${event.thread_id}`);
        if (event.options && Object.keys(event.options).length > 0) {
          addSystemMessage(`🔧 Thread options set: ${threadOptions.formatOptionsSummary(event.options)}`);
        }
        break;

      case "thread_switched":
        addSystemMessage(`🔄 Switched to thread: ${event.thread_id}`);
        threadOptions.updateOptionsSummaryDisplay();
        break;

      case "thread_id_assigned": {
        const tempId = event.temp_id;
        const realId = event.thread_id;
        threadState.replaceThreadId(tempId, realId);
        threadOptions.replaceThreadId(tempId, realId);
        if (event.options) {
          threadOptions.setThreadOptions(realId, event.options);
        }
        threadState.updateThreadSelector();
        threadOptions.updateOptionsSummaryDisplay();
        addSystemMessage(`✅ Thread ID assigned: ${realId}`);
        break;
      }

      case "thread.started": {
        let shouldAnnounce = false;
        const currentThreadId = threadState.getCurrentThreadId();
        if (currentThreadId && currentThreadId.startsWith("pending_")) {
          const tempId = currentThreadId;
          const realId = event.thread_id;
          threadState.replaceThreadId(tempId, realId);
          threadOptions.replaceThreadId(tempId, realId);
          threadState.updateThreadSelector();
          threadOptions.updateOptionsSummaryDisplay();
          shouldAnnounce = true;
        } else if (!threadState.hasThread(event.thread_id)) {
          threadState.ensureThread(event.thread_id);
          threadState.setCurrentThreadId(event.thread_id);
          threadState.updateThreadSelector();
          threadOptions.updateOptionsSummaryDisplay();
          shouldAnnounce = true;
        }
        if (shouldAnnounce) {
          addSystemMessage(`Thread started: ${event.thread_id}`);
        }
        break;
      }

      case "thread_options_updated": {
        if (event.thread_id) {
          threadOptions.setThreadOptions(event.thread_id, event.options || defaultThreadOptions);
          if (event.thread_id === threadState.getCurrentThreadId()) {
            threadOptions.updateOptionsSummaryDisplay();
          }
        }
        addSystemMessage(`🔧 Thread options updated: ${threadOptions.formatOptionsSummary(event.options)}`);
        break;
      }

      case "turn.started":
        addSystemMessage("Processing...", "assistant");
        break;

      case "turn.completed":
        if (event.usage) {
          const u = event.usage;
          addMessage(
            `📊 Tokens - Input: ${u.input_tokens}, Cached: ${u.cached_input_tokens}, Output: ${u.output_tokens}`,
            "usage"
          );
        } else {
          addMessage("📊 Tokens - Usage unavailable", "usage");
        }
        break;

      case "turn.failed":
        addMessage(`❌ Turn failed: ${event.error.message}`, "error");
        break;

      case "item.started":
      case "item.updated":
      case "item.completed":
        handleItem(event);
        break;

      case "error":
        addMessage(`❌ Error: ${event.message}`, "error");
        break;
    }
  }

  function bindUiActions({
    form,
    promptInput,
    threadSelector,
    newThreadBtn,
    threadOptionsBtn,
    closeOptionsBtn,
    resetOptionsBtn,
    applyOptionsBtn
  }) {
    newThreadBtn.addEventListener("click", () => {
      threadOptions.openOptionsPanel("create", defaultThreadOptions);
    });

    threadOptionsBtn.addEventListener("click", () => {
      const currentThreadId = threadState.getCurrentThreadId();
      if (!currentThreadId) {
        threadOptions.openOptionsPanel("create", defaultThreadOptions);
      } else {
        threadOptions.openOptionsPanel(
          "update",
          threadOptions.getThreadOptions(currentThreadId) || defaultThreadOptions
        );
      }
    });

    closeOptionsBtn.addEventListener("click", threadOptions.closeOptionsPanel);
    resetOptionsBtn.addEventListener("click", () => {
      threadOptions.fillOptionsForm(defaultThreadOptions);
    });

    applyOptionsBtn.addEventListener("click", () => {
      const options = threadOptions.collectOptionsFromForm();
      threadOptions.closeOptionsPanel();
      if (threadOptions.getOptionsPanelMode() === "create") {
        createNewThread(options);
      } else {
        const currentThreadId = threadState.getCurrentThreadId();
        if (currentThreadId) {
          sendMessage({ type: "update_thread_options", thread_id: currentThreadId, options });
        }
      }
    });

    form.onsubmit = (ev) => {
      ev.preventDefault();
      const value = promptInput.value.trim();
      if (!value) return;

      addMessage(`> ${value}`, "user");
      sendMessage({ type: "message", text: value });
      promptInput.value = "";
      promptInput.focus();
    };

    threadSelector.onchange = (ev) => {
      const threadId = ev.target.value;
      if (threadId) {
        switchThread(threadId);
      }
    };
  }

  return { bindUiActions, handleEvent };
}
