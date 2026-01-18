import { createUiRenderer } from "./ui-renderer.js";

const $ = q => document.querySelector(q);
const appConfig = window.__APP_CONFIG__ || {};
const modelCatalog = Array.isArray(appConfig.modelCatalog) ? appConfig.modelCatalog : [];
const mockMode = Boolean(appConfig.mockMode);
const mockBadge = $(".mock-badge");
if (mockBadge) {
  if (mockMode) {
    mockBadge.hidden = false;
  } else {
    mockBadge.remove();
  }
}
const output = $("#output");
const { addMessage, addSystemMessage, handleItem } = createUiRenderer(output);
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
      addSystemMessage(`✨ New thread created: ${event.thread_id}`);
      if (event.options && Object.keys(event.options).length > 0) {
        addSystemMessage(`🔧 Thread options set: ${formatOptionsSummary(event.options)}`);
      }
      break;

    case "thread_switched":
      addSystemMessage(`🔄 Switched to thread: ${event.thread_id}`);
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
      addSystemMessage(`✅ Thread ID assigned: ${realId}`);
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
        addSystemMessage(`Thread started: ${event.thread_id}`);
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
      addSystemMessage(`🔧 Thread options updated: ${formatOptionsSummary(event.options)}`);
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

form.onsubmit = (ev) => {
  ev.preventDefault();
  const value = promptInput.value.trim();
  if (!value) return;

  addMessage(`> ${value}`, "user");
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
