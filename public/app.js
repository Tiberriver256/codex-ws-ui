import { createUiRenderer } from "./ui-renderer.js";
import { createThreadOptionsController } from "./thread-options.js";
import { createThreadState } from "./thread-state.js";
import { createUiActions } from "./ui-actions.js";
import { createWsClient } from "./ws-client.js";
import { createModalController } from "./modal.js";
import { loadThreadState, saveThreadState } from "./thread-storage.js";

const $ = (q) => document.querySelector(q);
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
const uiRenderer = createUiRenderer(output);
const { addMessage, addSystemMessage } = uiRenderer;
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
const threadOptionsAdvanced = $("#threadOptionsAdvanced");
const threadModel = $("#threadModel");
const threadReasoning = $("#threadReasoning");
const threadApproval = $("#threadApproval");
const threadSandbox = $("#threadSandbox");
const threadSkipRepoCheck = $("#threadSkipRepoCheck");
const threadNetwork = $("#threadNetwork");
const threadWebSearch = $("#threadWebSearch");
const threadWorkingDir = $("#threadWorkingDir");
const threadWorkingDirError = $("#threadWorkingDirError");
const threadAdditionalDirs = $("#threadAdditionalDirs");
const webSearchDependencyNote = $("#webSearchDependencyNote");
const restrictedSettingsNote = $("#restrictedSettingsNote");
const networkActionBtn = $("#networkActionBtn");
const approvalActionBtn = $("#approvalActionBtn");
const modalOverlay = $("#modalOverlay");
const modalTitle = $("#modalTitle");
const modalMessage = $("#modalMessage");
const modalActions = $("#modalActions");

const threadState = createThreadState({ outputEl: output, threadSelector });
const modal = createModalController({
  overlay: modalOverlay,
  titleEl: modalTitle,
  messageEl: modalMessage,
  actionsEl: modalActions
});
const threadOptions = createThreadOptionsController({
  modelCatalog,
  getCurrentThreadId: threadState.getCurrentThreadId,
  appConfig,
  modal,
  elements: {
    threadOptionsPanel,
    threadOptionsSummary,
    threadOptionsSummaryStrip,
    threadOptionsModeText,
    threadOptionsAdvanced,
    applyOptionsBtn,
    threadModel,
    threadReasoning,
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
  }
});

threadOptions.bindFormEvents();

threadState.setThreadBadgeProvider((threadId) => threadOptions.getThreadBadges(threadId));

function persistThreadState() {
  saveThreadState({
    threads: threadState.getThreads(),
    currentThreadId: threadState.getCurrentThreadId(),
    optionsByThreadId: threadOptions.getOptionsSnapshot()
  });
}

const storedState = loadThreadState();
if (storedState) {
  threadState.setThreads(storedState.threads || [], storedState.currentThreadId || null);
  threadOptions.loadOptionsMap(storedState.optionsByThreadId || {});
  threadState.updateThreadSelector();
  threadOptions.updateOptionsSummaryDisplay();
}

window.__TEST__ = window.__TEST__ || {};
window.__TEST__.setRestricted = (value) => {
  threadOptions.setRestricted(value);
};

let wsSend = () => {};
const uiActions = createUiActions({
  threadState,
  threadOptions,
  uiRenderer,
  sendMessage: (payload) => wsSend(payload),
  modal,
  persistState: persistThreadState
});

const wsClient = createWsClient({
  statusDot,
  statusText,
  promptInput,
  submitBtn,
  threadSelector,
  newThreadBtn,
  threadOptionsBtn,
  addSystemMessage,
  onEvent: uiActions.handleEvent,
  onPlainMessage: (data) => addMessage(data, "assistant")
});

wsSend = wsClient.send;

uiActions.bindUiActions({
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
});

wsClient.connect();
