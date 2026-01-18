import { createUiRenderer } from "./ui-renderer.js";
import { createThreadOptionsController } from "./thread-options.js";
import { createThreadState } from "./thread-state.js";
import { createUiActions } from "./ui-actions.js";
import { createWsClient } from "./ws-client.js";

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
const threadModel = $("#threadModel");
const threadReasoning = $("#threadReasoning");
const threadApproval = $("#threadApproval");
const threadSandbox = $("#threadSandbox");
const threadSkipRepoCheck = $("#threadSkipRepoCheck");
const threadNetwork = $("#threadNetwork");
const threadWebSearch = $("#threadWebSearch");
const threadWorkingDir = $("#threadWorkingDir");
const threadAdditionalDirs = $("#threadAdditionalDirs");

const threadState = createThreadState({ outputEl: output, threadSelector });
const threadOptions = createThreadOptionsController({
  modelCatalog,
  getCurrentThreadId: threadState.getCurrentThreadId,
  elements: {
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
  }
});

threadOptions.bindFormEvents();

let wsSend = () => {};
const uiActions = createUiActions({
  threadState,
  threadOptions,
  uiRenderer,
  sendMessage: (payload) => wsSend(payload)
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
  applyOptionsBtn
});

wsClient.connect();
