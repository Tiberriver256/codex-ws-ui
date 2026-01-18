import { createUiRenderer } from "./ui-renderer.js";
import { createThreadOptionsController } from "./thread-options.js";
import { createThreadState } from "./thread-state.js";
import { createUiActions } from "./ui-actions.js";
import { createWsClient } from "./ws-client.js";
import { createAppServerClient } from "./app-server-client.js";
import { createImageInput } from "./image-input.js";
import { createModalController } from "./modal.js";
import { loadThreadState, saveThreadState } from "./thread-storage.js";
import { createApprovalRulesStore } from "./approval-rules.js";
import { createApprovalUi } from "./approval-ui.js";
import { createExecPolicyPanel } from "./execpolicy-panel.js";
import { createCommandPalette } from "./command-palette.js";
import { createPromptsPalette } from "./prompts-palette.js";
import { createSkillsPalette } from "./skills-palette.js";
import { createChangesStore } from "./changes-store.js";
import { createDiffPanel, createReviewPanel } from "./changes-panels.js";
import { createMentions } from "./mentions.js";
import { createConfigPanel } from "./config-panel.js";
import { createFeatureFlagsPanel } from "./feature-flags.js";
import { createMcpPanel } from "./mcp-panel.js";
import { createCloudPanel } from "./cloud-panel.js";
import { createReasoningPanel } from "./reasoning-panel.js";
import { createObservabilityPanel } from "./observability-panel.js";
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
const mockPrompts = Array.isArray(appConfig.mockPrompts) ? appConfig.mockPrompts : [];
const mockSkills = Array.isArray(appConfig.mockSkills) ? appConfig.mockSkills : [];
let workspaceFiles = Array.isArray(appConfig.workspaceFiles) ? appConfig.workspaceFiles : [];
let promptFixtures = mockPrompts;
let skillFixtures = mockSkills;
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
const mentionsContainer = $("#mentions");
const mentionsList = $("#mentionsList");
const mentionsEmpty = $("#mentionsEmpty");
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
const reasoningPanelBtn = $("#reasoningPanelBtn");
const statusPanelBtn = $("#statusPanelBtn");
const authPanelBtn = $("#authPanelBtn");
const sessionsPanelBtn = $("#sessionsPanelBtn");
const configPanelBtn = $("#configPanelBtn");
const featureFlagsBtn = $("#featureFlagsBtn");
const mcpPanelBtn = $("#mcpPanelBtn");
const cloudPanelBtn = $("#cloudPanelBtn");
const observabilityPanelBtn = $("#observabilityPanelBtn");
const statusPanel = $("#statusPanel");
const closeStatusBtn = $("#closeStatusBtn");
const observabilityPanel = $("#observabilityPanel");
const closeObservabilityBtn = $("#closeObservabilityBtn");
const observabilityExportBtn = $("#observabilityExportBtn");
const observabilityLogPath = $("#observabilityLogPath");
const observabilityLogs = $("#observabilityLogs");
const observabilityNotificationsToggle = $("#observabilityNotificationsToggle");
const observabilityNotificationsList = $("#observabilityNotificationsList");
const observabilityNotificationsEmpty = $("#observabilityNotificationsEmpty");
const authPanel = $("#authPanel");
const closeAuthBtn = $("#closeAuthBtn");
const sessionsPanel = $("#sessionsPanel");
const closeSessionsBtn = $("#closeSessionsBtn");
const configPanel = $("#configPanel");
const closeConfigPanelBtn = $("#closeConfigPanelBtn");
const configProfileSelect = $("#configProfileSelect");
const configProfileMeta = $("#configProfileMeta");
const effectiveConfigPreview = $("#effectiveConfigPreview");
const modelProviderSelect = $("#modelProviderSelect");
const ossProviderSelect = $("#ossProviderSelect");
const providerSummary = $("#providerSummary");
const providerModelValue = $("#providerModelValue");
const providerOssValue = $("#providerOssValue");
const featureFlagsPanel = $("#featureFlagsPanel");
const closeFeatureFlagsBtn = $("#closeFeatureFlagsBtn");
const featureFlagsList = $("#featureFlagsList");
const featureFlagsEmpty = $("#featureFlagsEmpty");
const reasoningPanel = $("#reasoningPanel");
const closeReasoningBtn = $("#closeReasoningBtn");
const showReasoningToggle = $("#showReasoningToggle");
const showRawReasoningToggle = $("#showRawReasoningToggle");
const mcpPanel = $("#mcpPanel");
const closeMcpBtn = $("#closeMcpBtn");
const mcpList = $("#mcpList");
const mcpEmpty = $("#mcpEmpty");
const mcpNameInput = $("#mcpNameInput");
const mcpUrlInput = $("#mcpUrlInput");
const mcpAuthToggle = $("#mcpAuthToggle");
const mcpAddBtn = $("#mcpAddBtn");
const cloudPanel = $("#cloudPanel");
const closeCloudPanelBtn = $("#closeCloudPanelBtn");
const cloudTasksList = $("#cloudTasksList");
const cloudTasksEmpty = $("#cloudTasksEmpty");
const execpolicyPanelBtn = $("#execpolicyPanelBtn");
const execpolicyPanel = $("#execpolicyPanel");
const closeExecpolicyBtn = $("#closeExecpolicyBtn");
const execpolicyRulesList = $("#execpolicyRulesList");
const execpolicyRulesEmpty = $("#execpolicyRulesEmpty");
const execpolicyPreviewInput = $("#execpolicyPreviewInput");
const execpolicyPreviewResult = $("#execpolicyPreviewResult");
const execpolicyPreviewBtn = $("#execpolicyPreviewBtn");
const promptsPaletteBtn = $("#promptsPaletteBtn");
const skillsPaletteBtn = $("#skillsPaletteBtn");
const commandPaletteBtn = $("#commandPaletteBtn");
const promptsPaletteOverlay = $("#promptsPalette");
const skillsPaletteOverlay = $("#skillsPalette");
const closePromptsPaletteBtn = $("#closePromptsPaletteBtn");
const closeSkillsPaletteBtn = $("#closeSkillsPaletteBtn");
const promptsPaletteInput = $("#promptsPaletteInput");
const skillsPaletteInput = $("#skillsPaletteInput");
const promptsPaletteList = $("#promptsPaletteList");
const skillsPaletteList = $("#skillsPaletteList");
const promptsPaletteSection = $("#promptsPaletteSection");
const promptsEmpty = $("#promptsEmpty");
const skillsEmpty = $("#skillsEmpty");
const promptsDuplicatesSection = $("#promptsDuplicatesSection");
const promptsDuplicatesList = $("#promptsDuplicatesList");
const promptFillPanel = $("#promptFillPanel");
const promptFillTitle = $("#promptFillTitle");
const promptFillSubtitle = $("#promptFillSubtitle");
const promptFillFields = $("#promptFillFields");
const promptFillApply = $("#promptFillApply");
const promptFillCancel = $("#promptFillCancel");
const skillsPreview = $("#skillsPreview");
const skillsPreviewTitle = $("#skillsPreviewTitle");
const skillsPreviewMeta = $("#skillsPreviewMeta");
const skillsPreviewBody = $("#skillsPreviewBody");
const skillsInsertBtn = $("#skillsInsertBtn");
const commandPaletteOverlay = $("#commandPalette");
const closeCommandPaletteBtn = $("#closeCommandPaletteBtn");
const commandPaletteInput = $("#commandPaletteInput");
const commandPaletteList = $("#commandPaletteList");
const commandPaletteAdvanced = $("#commandPaletteAdvanced");
const commandPaletteAdvancedList = $("#commandPaletteAdvancedList");
const diffPanel = $("#diffPanel");
const closeDiffBtn = $("#closeDiffBtn");
const diffList = $("#diffList");
const diffEmpty = $("#diffEmpty");
const reviewPanel = $("#reviewPanel");
const closeReviewBtn = $("#closeReviewBtn");
const reviewSummary = $("#reviewSummary");
const reviewFiles = $("#reviewFiles");
const reviewEmpty = $("#reviewEmpty");
const applyResult = $("#applyResult");
let promptsPalette = null;
let skillsPalette = null;
let mentions = null;

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
const changesStore = createChangesStore();
const approvalUiBase = createApprovalUi({ uiRenderer, rulesStore: approvalRulesStore });
let approvalUi = approvalUiBase;
const imageInput = createImageInput({
  inputEl: imageFileInput,
  dropzoneEl: imageDropzone,
  thumbsEl: imageThumbs,
  placeholderEl: imageDropHint
});

mentions = createMentions({
  inputEl: promptInput,
  containerEl: mentionsContainer,
  listEl: mentionsList,
  emptyEl: mentionsEmpty,
  getFiles: () => workspaceFiles
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

const configPanelController = createConfigPanel({
  panel: configPanel,
  closeBtn: closeConfigPanelBtn,
  appConfig,
  elements: {
    profileSelect: configProfileSelect,
    profileMeta: configProfileMeta,
    previewEl: effectiveConfigPreview,
    modelProviderSelect,
    ossProviderSelect,
    providerSummaryEl: providerSummary,
    providerModelValue,
    providerOssValue
  }
});

const featureFlagsPanelController = createFeatureFlagsPanel({
  panel: featureFlagsPanel,
  closeBtn: closeFeatureFlagsBtn,
  appConfig,
  elements: {
    listEl: featureFlagsList,
    emptyEl: featureFlagsEmpty
  }
});

const reasoningPanelController = createReasoningPanel({
  panel: reasoningPanel,
  closeBtn: closeReasoningBtn,
  outputEl: output,
  elements: {
    showReasoningToggle,
    showRawReasoningToggle
  }
});

const mcpPanelController = createMcpPanel({
  panel: mcpPanel,
  closeBtn: closeMcpBtn,
  appConfig,
  elements: {
    listEl: mcpList,
    emptyEl: mcpEmpty,
    nameInput: mcpNameInput,
    urlInput: mcpUrlInput,
    authToggle: mcpAuthToggle,
    addBtn: mcpAddBtn
  }
});

const cloudPanelController = createCloudPanel({
  panel: cloudPanel,
  closeBtn: closeCloudPanelBtn,
  appConfig,
  elements: {
    listEl: cloudTasksList,
    emptyEl: cloudTasksEmpty
  }
});

const observabilityPanelController = createObservabilityPanel({
  panel: observabilityPanel,
  closeBtn: closeObservabilityBtn,
  outputEl: output,
  appConfig,
  elements: {
    exportBtn: observabilityExportBtn,
    logsEl: observabilityLogs,
    logPathEl: observabilityLogPath,
    notificationsToggle: observabilityNotificationsToggle,
    notificationsList: observabilityNotificationsList,
    notificationsEmpty: observabilityNotificationsEmpty
  }
});

if (observabilityPanelController) {
  approvalUi = {
    ...approvalUiBase,
    requestApproval: (request) => {
      observabilityPanelController.notifyApprovalRequest?.(request);
      return approvalUiBase.requestApproval(request);
    }
  };
}

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

const diffPanelController = createDiffPanel({
  panel: diffPanel,
  closeBtn: closeDiffBtn,
  listEl: diffList,
  emptyEl: diffEmpty,
  changesStore
});

const reviewPanelController = createReviewPanel({
  panel: reviewPanel,
  closeBtn: closeReviewBtn,
  summaryEl: reviewSummary,
  listEl: reviewFiles,
  emptyEl: reviewEmpty,
  applyResultEl: applyResult,
  changesStore
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
window.__TEST__.emitReasoning = (text) => {
  const message = text === undefined || text === null ? "Reasoning message" : String(text);
  addMessage(message, "reasoning");
};
window.__TEST__.emitRawReasoning = (text) => {
  const message = text === undefined || text === null ? "Raw reasoning message" : String(text);
  addMessage(message, "reasoning raw");
};
window.__TEST__.setLocalChanges = (value) => {
  changesStore.setLocalChanges(value);
};
window.__TEST__.hasLocalChanges = () => changesStore.hasLocalChanges();
window.__TEST__.getThreadOptionsSnapshot = () => threadOptions.getOptionsSnapshot();
window.__TEST__.refreshThreadList = () => threadState.updateThreadSelector();
window.__TEST__.setObservabilityLogs = (value) => {
  observabilityPanelController?.setLogs?.(value);
};
window.__TEST__.setObservabilityLogPath = (value) => {
  observabilityPanelController?.setLogPath?.(value);
};
window.__TEST__.getObservabilityLogs = () => observabilityPanelController?.getLogs?.();
window.__TEST__.setObservabilityNotificationsEnabled = (value) => {
  observabilityPanelController?.setNotificationsEnabled?.(value);
};
window.__TEST__.getObservabilityNotifications = () =>
  observabilityPanelController?.getNotifications?.() || [];
window.__TEST__.clearObservabilityNotifications = () => {
  observabilityPanelController?.clearNotifications?.();
};
window.__TEST__.emitObservabilityTurnCompleted = () => {
  observabilityPanelController?.handleEvent?.({
    type: "turn.completed",
    usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 }
  });
};
window.__TEST__.emitObservabilityApprovalRequest = (request = {}) => {
  observabilityPanelController?.notifyApprovalRequest?.(request);
};
window.__TEST__.setPrompts = (value) => {
  promptFixtures = Array.isArray(value) ? value : [];
};
window.__TEST__.setSkills = (value) => {
  skillFixtures = Array.isArray(value) ? value : [];
};
window.__TEST__.setWorkspaceFiles = (value) => {
  workspaceFiles = Array.isArray(value) ? value : [];
  mentions?.refresh?.();
};
window.__TEST__.getPrompts = () => promptFixtures;
window.__TEST__.getSkills = () => skillFixtures;
window.__TEST__.getWorkspaceFiles = () => workspaceFiles;
window.__TEST__.startNewSession = () => {
  promptsPalette?.close?.();
  skillsPalette?.close?.();
};
window.__TEST__.setConfigProfiles = (profiles, baseConfig) => {
  configPanelController?.setProfiles?.(profiles, baseConfig);
};
window.__TEST__.setConfigProviders = (providers) => {
  configPanelController?.setProviders?.(providers);
};
window.__TEST__.setProviderSelection = (selection) => {
  configPanelController?.setProviderSelection?.(selection);
};
window.__TEST__.getConfigState = () => configPanelController?.getState?.();
window.__TEST__.setFeatureFlags = (flags) => {
  featureFlagsPanelController?.setFlags?.(flags);
};
window.__TEST__.getFeatureFlags = () => featureFlagsPanelController?.getFlags?.();
window.__TEST__.setMcpServers = (servers) => {
  mcpPanelController?.setServers?.(servers);
};
window.__TEST__.getMcpServers = () => mcpPanelController?.getServers?.() || [];
window.__TEST__.setCloudTasks = (tasks) => {
  cloudPanelController?.setTasks?.(tasks);
};
window.__TEST__.getCloudTasks = () => cloudPanelController?.getTasks?.() || [];
window.__TEST__.runCloudTask = (taskId) => {
  cloudPanelController?.runTask?.(taskId);
};

if (statusPanelBtn) {
  statusPanelBtn.addEventListener("click", () => statusPanelController.open());
}
if (observabilityPanelBtn) {
  observabilityPanelBtn.addEventListener("click", () => observabilityPanelController.open());
}
if (reasoningPanelBtn) {
  reasoningPanelBtn.addEventListener("click", () => reasoningPanelController.open());
}
if (authPanelBtn) {
  authPanelBtn.addEventListener("click", () => authPanelController.open());
}
if (sessionsPanelBtn) {
  sessionsPanelBtn.addEventListener("click", () => sessionsPanelController.open());
}
if (configPanelBtn) {
  configPanelBtn.addEventListener("click", () => configPanelController.open());
}
if (featureFlagsBtn) {
  featureFlagsBtn.addEventListener("click", () => featureFlagsPanelController.open());
}
if (mcpPanelBtn) {
  mcpPanelBtn.addEventListener("click", () => mcpPanelController.open());
}
if (cloudPanelBtn) {
  cloudPanelBtn.addEventListener("click", () => cloudPanelController.open());
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

const handleEvent = (event) => {
  uiActions.handleEvent(event);
  observabilityPanelController?.handleEvent?.(event);
};

function openModelSelector() {
  const currentThreadId = threadState.getCurrentThreadId();
  if (!currentThreadId) {
    threadOptions.openOptionsPanel("create", threadOptions.getDefaultOptions());
  } else {
    threadOptions.openOptionsPanel(
      "update",
      threadOptions.getThreadOptions(currentThreadId) || threadOptions.getDefaultOptions()
    );
  }
  if (threadModel) threadModel.focus();
}

function handleNewThreadCommand() {
  sendWithCapture({ type: "new_thread", options: threadOptions.getDefaultOptions() });
}

async function handleApplyCommand() {
  if (!changesStore.hasLocalChanges()) {
    reviewPanelController.setApplyResult("No local changes to apply.");
    reviewPanelController.open();
    return;
  }
  const changes = changesStore.getChanges();
  const confirm = await modal.confirm({
    title: "Apply changes",
    message: `Apply ${changes.length} file${changes.length === 1 ? "" : "s"}?`,
    confirmLabel: "Apply",
    cancelLabel: "Cancel"
  });
  if (!confirm) return;
  reviewPanelController.setApplyResult("Changes applied.");
  reviewPanelController.open();
  addSystemMessage("Changes applied.");
}

const commandPalette = createCommandPalette({
  overlay: commandPaletteOverlay,
  closeBtn: closeCommandPaletteBtn,
  input: commandPaletteInput,
  listEl: commandPaletteList,
  advancedDetails: commandPaletteAdvanced,
  advancedListEl: commandPaletteAdvancedList,
  commands: [
    { value: "/model", label: "/model", description: "Open model selector", action: openModelSelector },
    { value: "/status", label: "/status", description: "Open status panel", action: () => statusPanelController.open() },
    { value: "/new", label: "/new", description: "Create new thread", action: handleNewThreadCommand },
    { value: "/resume", label: "/resume", description: "Open sessions panel", action: () => sessionsPanelController.open() }
  ],
  advancedCommands: [
    { value: "/diff", label: "/diff", description: "View latest diff", action: () => diffPanelController.open() },
    { value: "/review", label: "/review", description: "Review changes", action: () => reviewPanelController.open() },
    { value: "/apply", label: "/apply", description: "Apply changes", action: handleApplyCommand }
  ]
});

promptsPalette = createPromptsPalette({
  overlay: promptsPaletteOverlay,
  closeBtn: closePromptsPaletteBtn,
  input: promptsPaletteInput,
  listEl: promptsPaletteList,
  listSection: promptsPaletteSection,
  emptyEl: promptsEmpty,
  duplicatesSection: promptsDuplicatesSection,
  duplicatesListEl: promptsDuplicatesList,
  fillPanel: promptFillPanel,
  fillFieldsEl: promptFillFields,
  fillTitleEl: promptFillTitle,
  fillSubtitleEl: promptFillSubtitle,
  fillApplyBtn: promptFillApply,
  fillCancelBtn: promptFillCancel,
  getPrompts: () => promptFixtures,
  onInsert: (text) => {
    if (promptInput) {
      promptInput.value = text;
      promptInput.focus();
    }
  }
});

skillsPalette = createSkillsPalette({
  overlay: skillsPaletteOverlay,
  closeBtn: closeSkillsPaletteBtn,
  input: skillsPaletteInput,
  listEl: skillsPaletteList,
  emptyEl: skillsEmpty,
  previewPanel: skillsPreview,
  previewTitleEl: skillsPreviewTitle,
  previewMetaEl: skillsPreviewMeta,
  previewBodyEl: skillsPreviewBody,
  insertBtn: skillsInsertBtn,
  getSkills: () => skillFixtures,
  onInsert: (text) => {
    if (promptInput) {
      promptInput.value = text;
      promptInput.focus();
    }
  }
});

if (promptsPaletteBtn) {
  promptsPaletteBtn.addEventListener("click", () => promptsPalette.open());
}
if (skillsPaletteBtn) {
  skillsPaletteBtn.addEventListener("click", () => skillsPalette.open());
}
if (commandPaletteBtn) {
  commandPaletteBtn.addEventListener("click", () => commandPalette.open());
}

document.addEventListener("keydown", (event) => {
  const key = event.key ? event.key.toLowerCase() : "";
  if ((event.metaKey || event.ctrlKey) && key === "k") {
    event.preventDefault();
    commandPalette.open();
  }
});

const appServerClient = createAppServerClient({
  onEvent: handleEvent,
  onSend: (payload) => {
    if (testState) {
      testState.lastAppServerPayload = payload;
    }
  }
});

if (testState) {
  const appServerHarness = {
    connect: (options) => appServerClient.connect(options),
    queueRequest: (options) => appServerClient.queueRequest(options),
    respond: (id, result, error) => appServerClient.receive({ id, result, error }),
    emitMixed: (options) => appServerClient.emitMixed(options),
    emitDiffUpdate: (options) => appServerClient.emitDiffUpdate(options),
    normalizedEvents: appServerClient.normalizedEvents,
    completedRequests: appServerClient.completedRequests
  };
  Object.defineProperty(appServerHarness, "lastRequest", {
    get: () => appServerClient.lastRequest
  });
  testState.appServer = appServerHarness;
}

const wsClient = createWsClient({
  statusDot,
  statusText,
  promptInput,
  submitBtn,
  threadSelector,
  newThreadBtn,
  threadOptionsBtn,
  addSystemMessage,
  onEvent: handleEvent,
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
