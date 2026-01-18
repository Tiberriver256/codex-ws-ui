import { createUiRenderer } from "./ui-renderer.js";
import { createThreadOptionsController } from "./thread-options.js";
import { createThreadState } from "./thread-state.js";
import { createUiActions } from "./ui-actions.js";
import { createWsClient } from "./ws-client.js";
import { createImageInput } from "./image-input.js";
import { createModalController } from "./modal.js";
import { loadThreadState, saveThreadState } from "./thread-storage.js";
import { createApprovalRulesStore } from "./approval-rules.js";
import { createApprovalUi } from "./approval-ui.js";
import { createExecPolicyPanel } from "./execpolicy-panel.js";
import {
  createAuthPanel,
  createAuthStore,
  createSessionsPanel,
  createSessionsStore,
  createStatusPanel
} from "./panels.js";

const $ = (q) => document.querySelector(q);
const appConfig = window.__APP_CONFIG__ || {};
const modelCatalog = Array.isArray(appConfig.modelCatalog) ? appConfig.modelCatalog : [];
const mockMode = Boolean(appConfig.mockMode);
const mockSessions = Array.isArray(appConfig.mockSessions) ? appConfig.mockSessions : [];
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
const schemaInput = $("#structuredSchema");
const imageFileInput = $("#imageFileInput");
const imageDropzone = $("#imageDropzone");
const imageThumbs = $("#imageThumbs");
const imageDropHint = $("#imageDropHint");
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
const threadApprovalPreset = $("#threadApprovalPreset");
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
const statusPanelBtn = $("#statusPanelBtn");
const authPanelBtn = $("#authPanelBtn");
const sessionsPanelBtn = $("#sessionsPanelBtn");
const statusPanel = $("#statusPanel");
const closeStatusBtn = $("#closeStatusBtn");
const authPanel = $("#authPanel");
const closeAuthBtn = $("#closeAuthBtn");
const sessionsPanel = $("#sessionsPanel");
const closeSessionsBtn = $("#closeSessionsBtn");
const execpolicyPanelBtn = $("#execpolicyPanelBtn");
const execpolicyPanel = $("#execpolicyPanel");
const closeExecpolicyBtn = $("#closeExecpolicyBtn");
const execpolicyRulesList = $("#execpolicyRulesList");
const execpolicyRulesEmpty = $("#execpolicyRulesEmpty");
const execpolicyPreviewInput = $("#execpolicyPreviewInput");
const execpolicyPreviewResult = $("#execpolicyPreviewResult");
const execpolicyPreviewBtn = $("#execpolicyPreviewBtn");

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
  }
});

const authStore = createAuthStore();
const sessionsStore = createSessionsStore({
  mockSessions,
  workspaceRoot: appConfig.workspaceRoot || ""
});
const approvalRulesStore = createApprovalRulesStore();
const approvalUi = createApprovalUi({ uiRenderer, rulesStore: approvalRulesStore });
const imageInput = createImageInput({
  inputEl: imageFileInput,
  dropzoneEl: imageDropzone,
  thumbsEl: imageThumbs,
  placeholderEl: imageDropHint
});

const statusPanelController = createStatusPanel({
  panel: statusPanel,
  closeBtn: closeStatusBtn,
  appConfig,
  threadState,
  threadOptions,
  authStore,
  elements: {
    modelEl: $("#statusModel"),
    sandboxEl: $("#statusSandbox"),
    approvalsEl: $("#statusApprovals"),
    cwdEl: $("#statusCwd"),
    addDirsEl: $("#statusAddDirs"),
    tokensEl: $("#statusTokens"),
    authEl: $("#statusAuthState"),
    workspaceEl: $("#statusWorkspace"),
    agentsPathEl: $("#statusAgentsPath"),
    agentsInstructionsEl: $("#statusAgentsInstructions")
  }
});

const authPanelController = createAuthPanel({
  panel: authPanel,
  closeBtn: closeAuthBtn,
  authStore,
  isHeadless: /Headless/i.test(navigator.userAgent || ""),
  elements: {
    statusEl: $("#authStatusText"),
    methodEl: null,
    oauthBtn: $("#authOAuthBtn"),
    apiKeyBtn: $("#authApiKeyBtn"),
    apiKeyForm: $("#authApiKeyForm"),
    apiKeyInput: $("#authApiKeyInput"),
    apiKeySubmit: $("#authApiKeySubmit"),
    deviceBtn: $("#authDeviceBtn"),
    deviceInstructions: $("#authDeviceInstructions"),
    deviceCompleteBtn: $("#authDeviceCompleteBtn"),
    logoutBtn: $("#authLogoutBtn"),
    oauthGuidance: $("#authGuidance"),
    headlessGuidance: $("#authHeadlessGuidance")
  }
});

const sessionsPanelController = createSessionsPanel({
  panel: sessionsPanel,
  closeBtn: closeSessionsBtn,
  sessionsStore,
  uiRenderer,
  elements: {
    showAllToggle: $("#showAllSessions"),
    activeSessionEl: $("#activeSessionId"),
    resumeIdInput: $("#resumeSessionId"),
    resumeIdBtn: $("#resumeSessionBtn"),
    resumeLastBtn: $("#resumeLastSessionBtn"),
    execPromptInput: $("#execResumePrompt"),
    execResumeBtn: $("#execResumeLastBtn"),
    sessionsList: $("#sessionsList"),
    emptyStateEl: $("#sessionsEmpty")
  }
});

const execpolicyPanelController = createExecPolicyPanel({
  panel: execpolicyPanel,
  closeBtn: closeExecpolicyBtn,
  rulesStore: approvalRulesStore,
  elements: {
    rulesListEl: execpolicyRulesList,
    emptyStateEl: execpolicyRulesEmpty,
    previewInput: execpolicyPreviewInput,
    previewResult: execpolicyPreviewResult,
    previewBtn: execpolicyPreviewBtn
  }
});

authStore.subscribe(() => statusPanelController.refresh());

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
window.__TEST__.setHeadless = (value) => {
  authPanelController.setHeadless(value);
};
window.__TEST__.emitStructuredOutput = (data) => {
  uiRenderer.addStructuredOutput(data, { title: "Structured Output" });
};

if (statusPanelBtn) {
  statusPanelBtn.addEventListener("click", () => statusPanelController.open());
}
if (authPanelBtn) {
  authPanelBtn.addEventListener("click", () => authPanelController.open());
}
if (sessionsPanelBtn) {
  sessionsPanelBtn.addEventListener("click", () => sessionsPanelController.open());
}
if (execpolicyPanelBtn) {
  execpolicyPanelBtn.addEventListener("click", () => execpolicyPanelController.open());
}

const testState = window.__TEST__;
let wsSend = () => {};
const sendWithCapture = (payload) => {
  if (testState) {
    testState.lastSentPayload = payload;
  }
  wsSend(payload);
};
const uiActions = createUiActions({
  threadState,
  threadOptions,
  uiRenderer,
  sendMessage: sendWithCapture,
  modal,
  approvalUi,
  approvalRules: approvalRulesStore,
  persistState: persistThreadState,
  onUsage: (usage) => statusPanelController.setUsage(usage),
  schemaInput,
  imageInput
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
