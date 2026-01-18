const DEFAULT_STATE = {
  showReasoning: true,
  showRawReasoning: false,
};

function normalizeState(state) {
  return {
    showReasoning: state?.showReasoning !== false,
    showRawReasoning: Boolean(state?.showRawReasoning),
  };
}

export function createReasoningPanel({ panel, closeBtn, outputEl, elements = {} } = {}) {
  const { showReasoningToggle, showRawReasoningToggle } = elements;
  let state = normalizeState(DEFAULT_STATE);

  function applyState() {
    if (outputEl) {
      outputEl.dataset.showReasoning = state.showReasoning ? "true" : "false";
      outputEl.dataset.showRawReasoning = state.showRawReasoning ? "true" : "false";
    }
    if (showReasoningToggle) {
      showReasoningToggle.checked = state.showReasoning;
    }
    if (showRawReasoningToggle) {
      showRawReasoningToggle.checked = state.showRawReasoning;
    }
  }

  function setState(patch = {}) {
    state = normalizeState({ ...state, ...patch });
    applyState();
  }

  function open() {
    applyState();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  if (showReasoningToggle) {
    showReasoningToggle.addEventListener("change", (event) => {
      setState({ showReasoning: event.target.checked });
    });
  }

  if (showRawReasoningToggle) {
    showRawReasoningToggle.addEventListener("change", (event) => {
      setState({ showRawReasoning: event.target.checked });
    });
  }

  applyState();

  return {
    open,
    close,
    getState: () => ({ ...state }),
    setShowReasoning: (value) => setState({ showReasoning: value }),
    setShowRawReasoning: (value) => setState({ showRawReasoning: value }),
  };
}
