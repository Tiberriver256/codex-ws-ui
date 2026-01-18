const defaultThreadOptions = {};

export function createThreadOptionsController({
  modelCatalog,
  getCurrentThreadId,
  elements
}) {
  const {
    threadOptionsPanel,
    threadOptionsSummary,
    threadOptionsSummaryStrip,
    threadOptionsModeText,
    applyOptionsBtn,
    threadModel,
    threadReasoning,
    threadApproval,
    threadSandbox,
    threadSkipRepoCheck,
    threadNetwork,
    threadWebSearch,
    threadWorkingDir,
    threadAdditionalDirs
  } = elements;

  const optionsByThreadId = new Map();
  let optionsPanelMode = "create";

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
    const summary = formatOptionsSummary(optionsByThreadId.get(getCurrentThreadId()));
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
      .map((dir) => dir.trim())
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

  function bindFormEvents() {
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
    ].forEach((el) => {
      el.addEventListener("input", updateOptionsSummaryFromForm);
      el.addEventListener("change", updateOptionsSummaryFromForm);
    });
  }

  function setThreadOptions(threadId, options) {
    optionsByThreadId.set(threadId, options || defaultThreadOptions);
  }

  function getThreadOptions(threadId) {
    return optionsByThreadId.get(threadId) || defaultThreadOptions;
  }

  function replaceThreadId(tempId, realId) {
    if (optionsByThreadId.has(tempId)) {
      optionsByThreadId.set(realId, optionsByThreadId.get(tempId));
      optionsByThreadId.delete(tempId);
    }
  }

  function getOptionsPanelMode() {
    return optionsPanelMode;
  }

  function getDefaultOptions() {
    return defaultThreadOptions;
  }

  return {
    bindFormEvents,
    closeOptionsPanel,
    collectOptionsFromForm,
    fillOptionsForm,
    formatOptionsSummary,
    getDefaultOptions,
    getOptionsPanelMode,
    getThreadOptions,
    openOptionsPanel,
    replaceThreadId,
    setThreadOptions,
    updateOptionsSummaryDisplay
  };
}
