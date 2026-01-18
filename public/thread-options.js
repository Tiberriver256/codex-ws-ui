const EMPTY_OPTIONS = {};

function cloneOptions(options) {
  if (!options || typeof options !== "object") return {};
  const cloned = { ...options };
  if (Array.isArray(options.additionalDirectories)) {
    cloned.additionalDirectories = [...options.additionalDirectories];
  }
  return cloned;
}

function normalizePath(value) {
  if (!value) return "";
  const normalized = value.replace(/\\/g, "/");
  if (normalized.length > 1) {
    return normalized.replace(/\/+$/g, "");
  }
  return normalized;
}

function normalizeDirs(dirs) {
  if (!Array.isArray(dirs)) return [];
  return dirs.map((dir) => dir.trim()).filter(Boolean);
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

const APPROVAL_PRESETS = {
  lockdown: { approvalPolicy: "on-request", sandboxMode: "read-only" },
  balanced: { approvalPolicy: "on-request", sandboxMode: "workspace-write" },
  fast: { approvalPolicy: "never", sandboxMode: "workspace-write" },
};

export function createThreadOptionsController({
  modelCatalog,
  getCurrentThreadId,
  elements,
  appConfig = {},
  modal
}) {
  const {
    threadOptionsPanel,
    threadOptionsSummary,
    threadOptionsSummaryStrip,
    threadOptionsModeText,
    threadOptionsAdvanced,
    applyOptionsBtn,
    threadModel,
    threadReasoning,
    threadApprovalPreset,
    threadApproval,
    threadSandbox,
    threadSkipRepoCheck,
    threadNetwork,
    threadWebSearch,
    threadWorkingDir,
    threadWorkingDirError,
    threadAdditionalDirs,
    webSearchDependencyNote,
    restrictedSettingsNote
  } = elements;

  const defaultThreadOptions = appConfig.defaultThreadOptions || EMPTY_OPTIONS;
  const workspaceRoot = typeof appConfig.workspaceRoot === "string" ? appConfig.workspaceRoot : "";
  const optionsByThreadId = new Map();
  let optionsPanelMode = "create";
  let isRestricted = false;
  let applyingPreset = false;

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
    if (Array.isArray(options.additionalDirectories)) {
      pieces.push("Add Dirs: " + options.additionalDirectories.length);
    }
    if (typeof options.skipGitRepoCheck === "boolean") {
      pieces.push("Repo Check: " + (options.skipGitRepoCheck ? "skip" : "enforce"));
    }
    return pieces.join(" • ");
  }

  function updateOptionsSummaryDisplay() {
    const summary = formatOptionsSummary(optionsByThreadId.get(getCurrentThreadId()));
    threadOptionsSummary.textContent = summary;
    if (threadOptionsPanel.hidden) {
      threadOptionsSummaryStrip.textContent = summary;
    }
  }

  function validateWorkingDir(value) {
    if (!value) return { valid: true };
    if (!workspaceRoot) return { valid: true };
    const normalizedRoot = normalizePath(workspaceRoot);
    const normalizedValue = normalizePath(value);
    if (!normalizedRoot) return { valid: true };
    if (normalizedValue.includes("/..")) {
      return { valid: false, message: "Working directory must stay inside the workspace." };
    }
    if (normalizedValue === normalizedRoot || normalizedValue.startsWith(normalizedRoot + "/")) {
      return { valid: true };
    }
    return { valid: false, message: "Working directory must stay inside the workspace." };
  }

  function applyWorkingDirValidation() {
    if (!threadWorkingDirError) return true;
    const validation = validateWorkingDir(threadWorkingDir.value.trim());
    if (!validation.valid) {
      threadWorkingDirError.textContent = validation.message;
      threadWorkingDirError.hidden = false;
      applyOptionsBtn.disabled = true;
      return false;
    }
    threadWorkingDirError.hidden = true;
    applyOptionsBtn.disabled = false;
    return true;
  }

  function updateWebSearchDependencyNote() {
    if (!webSearchDependencyNote) return;
    const networkOff = threadNetwork.value === "off";
    webSearchDependencyNote.hidden = !networkOff;
  }

  function applyRestrictedState() {
    const restrictedControls = [threadSandbox, threadNetwork, threadWebSearch, threadSkipRepoCheck];
    restrictedControls.forEach((control) => {
      control.disabled = isRestricted;
      if (isRestricted) {
        control.setAttribute("data-restricted", "true");
      } else {
        control.removeAttribute("data-restricted");
      }
    });
    if (restrictedSettingsNote) {
      restrictedSettingsNote.hidden = !isRestricted;
    }
    if (threadOptionsAdvanced && isRestricted) {
      threadOptionsAdvanced.open = true;
    }
  }

  function markPresetCustom() {
    if (!threadApprovalPreset) return;
    if (!applyingPreset) {
      threadApprovalPreset.value = "custom";
    }
  }

  function applyApprovalPreset(presetKey) {
    if (!threadApprovalPreset) return;
    const preset = APPROVAL_PRESETS[presetKey];
    if (!preset) return;
    applyingPreset = true;
    threadApproval.value = preset.approvalPolicy;
    threadSandbox.value = preset.sandboxMode;
    applyingPreset = false;
    updateOptionsSummaryFromForm();
  }

  function handlePresetChange() {
    if (!threadApprovalPreset) return;
    const value = threadApprovalPreset.value;
    if (value && value !== "custom") {
      applyApprovalPreset(value);
    }
  }

  function fillOptionsForm(options = {}) {
    renderModelSelect(options.model || "");
    threadReasoning.value = options.modelReasoningEffort || "default";
    if (threadApprovalPreset) {
      threadApprovalPreset.value = "custom";
    }
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
      ? options.additionalDirectories.join("\n")
      : "";
    applyRestrictedState();
    updateWebSearchDependencyNote();
    threadOptionsSummaryStrip.textContent = formatOptionsSummary(options);
    updateOptionsSummaryDisplay();
    applyWorkingDirValidation();
  }

  function handleNetworkChange() {
    if (threadNetwork.value === "off" && threadWebSearch.value === "on") {
      threadWebSearch.value = "off";
    }
    updateWebSearchDependencyNote();
    updateOptionsSummaryFromForm();
  }

  async function handleWebSearchChange() {
    if (threadWebSearch.value === "on" && threadNetwork.value === "off") {
      let confirmEnable = false;
      if (modal?.confirm) {
        confirmEnable = await modal.confirm({
          title: "Enable Network Access",
          message: "Web search requires network access. Enable network to continue?",
          confirmLabel: "Enable Network",
          cancelLabel: "Keep Disabled"
        });
      } else {
        confirmEnable = window.confirm("Web search requires network access. Enable network?");
      }
      if (confirmEnable) {
        threadNetwork.value = "on";
      } else {
        threadWebSearch.value = "off";
      }
    }
    updateWebSearchDependencyNote();
    updateOptionsSummaryFromForm();
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
      .split("\n")
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
    applyWorkingDirValidation();
  }

  function bindFormEvents() {
    threadNetwork.addEventListener("change", handleNetworkChange);
    threadWebSearch.addEventListener("change", () => {
      void handleWebSearchChange();
    });
    if (threadApprovalPreset) {
      threadApprovalPreset.addEventListener("change", () => {
        handlePresetChange();
        updateOptionsSummaryFromForm();
      });
    }
    threadApproval.addEventListener("change", () => {
      markPresetCustom();
      updateOptionsSummaryFromForm();
    });
    threadSandbox.addEventListener("change", () => {
      markPresetCustom();
      updateOptionsSummaryFromForm();
    });
    [
      threadModel,
      threadReasoning,
      threadSkipRepoCheck,
      threadNetwork,
      threadWebSearch,
      threadWorkingDir,
      threadAdditionalDirs
    ].forEach((el) => {
      el.addEventListener("input", updateOptionsSummaryFromForm);
      el.addEventListener("change", updateOptionsSummaryFromForm);
    });
    threadWorkingDir.addEventListener("blur", applyWorkingDirValidation);
  }

  function setThreadOptions(threadId, options) {
    const normalized = cloneOptions(options || defaultThreadOptions);
    optionsByThreadId.set(threadId, normalized);
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

  function loadOptionsMap(snapshot = {}) {
    optionsByThreadId.clear();
    if (snapshot && typeof snapshot === "object") {
      Object.entries(snapshot).forEach(([threadId, options]) => {
        optionsByThreadId.set(threadId, cloneOptions(options));
      });
    }
  }

  function getOptionsSnapshot() {
    const snapshot = {};
    optionsByThreadId.forEach((options, threadId) => {
      snapshot[threadId] = cloneOptions(options);
    });
    return snapshot;
  }

  function getOptionsPanelMode() {
    return optionsPanelMode;
  }

  function getDefaultOptions() {
    return defaultThreadOptions;
  }

  function getThreadBadges(threadId) {
    const options = getThreadOptions(threadId) || {};
    const badges = [];
    if (typeof options.networkAccessEnabled === "boolean") {
      badges.push(options.networkAccessEnabled ? "[NET]" : "[NET-OFF]");
    }
    if (typeof options.webSearchEnabled === "boolean") {
      badges.push(options.webSearchEnabled ? "[SEARCH]" : "[SEARCH-OFF]");
    }
    if (options.sandboxMode === "danger-full-access") {
      badges.push("[DANGER]");
    }
    return badges.join(" ");
  }

  function requiresDangerConfirmation(previousOptions = {}, nextOptions = {}) {
    const previousMode = previousOptions.sandboxMode || "default";
    const nextMode = nextOptions.sandboxMode || "default";
    return nextMode === "danger-full-access" && previousMode !== "danger-full-access";
  }

  function diffOptions(previousOptions = {}, nextOptions = {}) {
    const changes = [];
    const fields = [
      { key: "model", label: "Model" },
      { key: "modelReasoningEffort", label: "Reasoning" },
      { key: "sandboxMode", label: "Sandbox" },
      { key: "approvalPolicy", label: "Approval" },
      { key: "networkAccessEnabled", label: "Network", format: (value) => (value ? "on" : "off") },
      { key: "webSearchEnabled", label: "Search", format: (value) => (value ? "on" : "off") },
      { key: "workingDirectory", label: "Dir" },
      { key: "skipGitRepoCheck", label: "Repo Check", format: (value) => (value ? "skip" : "enforce") },
      { key: "additionalDirectories", label: "Add Dirs", format: (value) => String(normalizeDirs(value).length) }
    ];

    fields.forEach((field) => {
      const prevValue = previousOptions[field.key];
      const nextValue = nextOptions[field.key];

      if (field.key === "workingDirectory") {
        const prevNormalized = (prevValue || "").trim();
        const nextNormalized = (nextValue || "").trim();
        if (prevNormalized !== nextNormalized) {
          changes.push(`${field.label}: ${nextNormalized || "default"}`);
        }
        return;
      }

      if (field.key === "additionalDirectories") {
        const prevDirs = normalizeDirs(prevValue);
        const nextDirs = normalizeDirs(nextValue);
        if (!arraysEqual(prevDirs, nextDirs)) {
          changes.push(`${field.label}: ${field.format(nextValue)}`);
        }
        return;
      }

      if (prevValue !== nextValue) {
        if (typeof nextValue === "boolean") {
          changes.push(`${field.label}: ${field.format ? field.format(nextValue) : String(nextValue)}`);
        } else {
          changes.push(`${field.label}: ${nextValue || "default"}`);
        }
      }
    });

    return changes;
  }

  function validateForm() {
    return applyWorkingDirValidation();
  }

  function setRestricted(value) {
    isRestricted = Boolean(value);
    applyRestrictedState();
    updateWebSearchDependencyNote();
  }

  return {
    bindFormEvents,
    closeOptionsPanel,
    collectOptionsFromForm,
    diffOptions,
    fillOptionsForm,
    formatOptionsSummary,
    getDefaultOptions,
    getOptionsPanelMode,
    getOptionsSnapshot,
    getThreadBadges,
    getThreadOptions,
    loadOptionsMap,
    openOptionsPanel,
    replaceThreadId,
    requiresDangerConfirmation,
    setRestricted,
    setThreadOptions,
    updateOptionsSummaryDisplay,
    validateForm
  };
}
