export function createUiActions({
  threadState,
  threadOptions,
  uiRenderer,
  sendMessage,
  modal,
  approvalUi,
  approvalRules,
  persistState,
  onUsage
}) {
  const { addMessage, addSystemMessage, handleItem } = uiRenderer;
  const defaultThreadOptions = threadOptions.getDefaultOptions();
  const persist = typeof persistState === "function" ? persistState : () => {};

  async function confirmDangerousSandbox() {
    if (modal?.confirm) {
      return modal.confirm({
        title: "Danger: Full Access",
        message: "This grants full file system access. Proceed?",
        confirmLabel: "I Understand",
        cancelLabel: "Cancel"
      });
    }
    return window.confirm("This grants full file system access. Proceed?");
  }

  async function promptNetworkBlocked() {
    if (modal?.open) {
      return modal.open({
        title: "Network Access Required",
        message: "Network is off for this thread. Re-enable to continue?",
        actions: [
          { label: "Cancel", value: "cancel", variant: "ghost" },
          { label: "Enable Network", value: "enable" }
        ]
      });
    }
    return window.confirm("Network is off for this thread. Re-enable?") ? "enable" : "cancel";
  }

  async function promptApprovalRequest(request = {}) {
    if (approvalUi?.requestApproval) {
      return approvalUi.requestApproval(request);
    }
    if (modal?.open) {
      const decision = await modal.open({
        title: "Approval Required",
        message: "This action requires approval.",
        actions: [
          { label: "Deny", value: "deny", variant: "ghost" },
          { label: "Approve", value: "approve" },
          { label: "Always Allow", value: "always" }
        ]
      });
      return { decision };
    }
    return { decision: window.confirm("Approve this action?") ? "approve" : "deny" };
  }

  function createNewThread(options = {}) {
    threadState.saveCurrentOutput();
    sendMessage({ type: "new_thread", options });
  }

  function switchThread(threadId) {
    if (threadState.switchThread(threadId)) {
      threadOptions.updateOptionsSummaryDisplay();
      sendMessage({ type: "switch_thread", thread_id: threadId });
      persist();
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
        persist();
        break;

      case "thread_switched":
        addSystemMessage(`🔄 Switched to thread: ${event.thread_id}`);
        threadOptions.updateOptionsSummaryDisplay();
        persist();
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
        persist();
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
          persist();
        }
        break;
      }

      case "thread_options_updated": {
        const previousOptions = event.thread_id
          ? threadOptions.getThreadOptions(event.thread_id)
          : defaultThreadOptions;
        const changes = threadOptions.diffOptions(previousOptions, event.options || defaultThreadOptions);
        if (event.thread_id) {
          threadOptions.setThreadOptions(event.thread_id, event.options || defaultThreadOptions);
          if (event.thread_id === threadState.getCurrentThreadId()) {
            threadOptions.updateOptionsSummaryDisplay();
          }
          threadState.updateThreadSelector();
        }
        if (changes.length > 0) {
          addSystemMessage(`🧭 Settings changed: ${changes.join(" • ")}`);
        }
        addSystemMessage(`🔧 Thread options updated: ${threadOptions.formatOptionsSummary(event.options)}`);
        persist();
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
          if (typeof onUsage === "function") {
            onUsage(u);
          }
        } else {
          addMessage("📊 Tokens - Usage unavailable", "usage");
          if (typeof onUsage === "function") {
            onUsage(null);
          }
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
    applyOptionsBtn,
    networkActionBtn,
    approvalActionBtn
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

    applyOptionsBtn.addEventListener("click", async () => {
      if (!threadOptions.validateForm()) return;
      const options = threadOptions.collectOptionsFromForm();
      if (threadOptions.getOptionsPanelMode() === "create") {
        if (threadOptions.requiresDangerConfirmation(defaultThreadOptions, options)) {
          const confirmed = await confirmDangerousSandbox();
          if (!confirmed) return;
        }
        threadOptions.closeOptionsPanel();
        createNewThread(options);
      } else {
        const currentThreadId = threadState.getCurrentThreadId();
        if (currentThreadId) {
          const previousOptions = threadOptions.getThreadOptions(currentThreadId) || defaultThreadOptions;
          if (threadOptions.requiresDangerConfirmation(previousOptions, options)) {
            const confirmed = await confirmDangerousSandbox();
            if (!confirmed) return;
          }
          threadOptions.closeOptionsPanel();
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

    if (networkActionBtn) {
      networkActionBtn.addEventListener("click", async () => {
        const currentThreadId = threadState.getCurrentThreadId();
        if (!currentThreadId) {
          addSystemMessage("No active thread to run network action.");
          return;
        }
        const options = threadOptions.getThreadOptions(currentThreadId) || defaultThreadOptions;
        if (options.networkAccessEnabled === false) {
          const choice = await promptNetworkBlocked();
          if (choice === "enable") {
            const updated = { ...options, networkAccessEnabled: true };
            sendMessage({ type: "update_thread_options", thread_id: currentThreadId, options: updated });
          }
          return;
        }
        addSystemMessage("✅ Network action permitted.");
      });
    }

    if (approvalActionBtn) {
      approvalActionBtn.addEventListener("click", async () => {
        const currentThreadId = threadState.getCurrentThreadId();
        if (!currentThreadId) {
          addSystemMessage("No active thread to run approval action.");
          return;
        }
        const options = threadOptions.getThreadOptions(currentThreadId) || defaultThreadOptions;
        if (options.approvalPolicy === "on-request") {
          const request = {
            action: "workspace-write",
            label: "Workspace write",
            prompt: "Allow this action to write to the workspace?",
            risk: "Writes to local files",
            policy: "on-request",
            details: [
              { label: "Action", value: "Workspace write" },
              { label: "Risk", value: "Writes to local files" },
              { label: "Policy", value: "on-request" }
            ]
          };
          const result = await promptApprovalRequest(request);
          const decision = typeof result === "string" ? result : result?.decision;
          if (decision === "approve") {
            if (result?.viaRule) {
              addSystemMessage("✅ Action auto-approved by rule.");
            } else {
              addSystemMessage("✅ Approval granted. Action completed.");
            }
          } else if (decision === "always") {
            const rule = approvalRules?.addRule?.({
              action: request.action,
              label: request.label,
              source: "always-allow"
            });
            if (rule) {
              addSystemMessage("✅ Approval granted. Rule added for future actions.");
            } else {
              addSystemMessage("✅ Approval granted (always allow).");
            }
          } else {
            addSystemMessage("❌ Approval denied. Action canceled.");
          }
          return;
        }
        addSystemMessage("✅ Action completed without approval.");
      });
    }
  }

  return { bindUiActions, handleEvent };
}
