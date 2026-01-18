const AUTH_STORAGE_KEY = "codex-auth-state-v1";
const SESSIONS_STORAGE_KEY = "codex-sessions-state-v1";

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function readStorage(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

function formatTimestamp(ts) {
  if (!ts) return "Unknown";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

function normalizeSession(session = {}, workspaceRoot = "") {
  if (!session || typeof session !== "object") return null;
  const id = String(session.id || "").trim();
  if (!id) return null;
  const normalized = {
    id,
    cwd: session.cwd || "",
    branch: session.branch || "",
    workspaceRoot: session.workspaceRoot || workspaceRoot || "",
    notes: session.notes || "",
  };
  const rawRun = session.lastRunAt || session.lastRun;
  let lastRunAt = Number(rawRun);
  if (Number.isNaN(lastRunAt) || !lastRunAt) {
    const parsed = Date.parse(rawRun);
    lastRunAt = Number.isNaN(parsed) ? Date.now() : parsed;
  }
  normalized.lastRunAt = lastRunAt;
  normalized.lastRunLabel = session.lastRunLabel || session.lastRun || formatTimestamp(lastRunAt);
  return normalized;
}

function mergeSessions(existingSessions, mockSessions, workspaceRoot) {
  const byId = new Map();
  (existingSessions || []).forEach((session) => {
    const normalized = normalizeSession(session, workspaceRoot);
    if (normalized) byId.set(normalized.id, normalized);
  });
  (mockSessions || []).forEach((session) => {
    const normalized = normalizeSession(session, workspaceRoot);
    if (!normalized) return;
    if (byId.has(normalized.id)) {
      byId.set(normalized.id, { ...normalized, ...byId.get(normalized.id) });
    } else {
      byId.set(normalized.id, normalized);
    }
  });
  return Array.from(byId.values());
}

export function createAuthStore() {
  let state = readStorage(AUTH_STORAGE_KEY, {
    status: "logged-out",
    method: null,
    detail: null,
    updatedAt: null,
  });
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function persist() {
    writeStorage(AUTH_STORAGE_KEY, state);
  }

  function setState(patch = {}) {
    state = { ...state, ...patch };
    persist();
    notify();
  }

  function login({ method, detail }) {
    setState({
      status: "logged-in",
      method: method || "oauth",
      detail: detail || null,
      updatedAt: Date.now(),
    });
  }

  function logout() {
    setState({
      status: "logged-out",
      method: null,
      detail: null,
      updatedAt: Date.now(),
    });
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState: () => state, login, logout, setState, subscribe };
}

export function createSessionsStore({ mockSessions = [], workspaceRoot = "" } = {}) {
  const fallback = { sessions: [], showAll: false, activeSessionId: null };
  let state = readStorage(SESSIONS_STORAGE_KEY, fallback);
  if (!state || typeof state !== "object") state = fallback;
  state.sessions = mergeSessions(state.sessions || [], mockSessions, workspaceRoot);
  state.showAll = Boolean(state.showAll);
  state.activeSessionId = typeof state.activeSessionId === "string" ? state.activeSessionId : null;
  const listeners = new Set();

  function persist() {
    writeStorage(SESSIONS_STORAGE_KEY, state);
  }

  function notify() {
    listeners.forEach((fn) => fn(state));
  }

  function setShowAll(value) {
    state.showAll = Boolean(value);
    persist();
    notify();
  }

  function setActiveSessionId(sessionId) {
    state.activeSessionId = sessionId || null;
    persist();
    notify();
  }

  function updateSession(id, patch = {}) {
    const index = state.sessions.findIndex((session) => session.id === id);
    if (index === -1) return null;
    state.sessions[index] = { ...state.sessions[index], ...patch };
    persist();
    notify();
    return state.sessions[index];
  }

  function touchSession(id) {
    const timestamp = Date.now();
    return updateSession(id, {
      lastRunAt: timestamp,
      lastRunLabel: formatTimestamp(timestamp),
    });
  }

  function resumeSession(id) {
    const session = state.sessions.find((entry) => entry.id === id);
    if (!session) return null;
    touchSession(id);
    setActiveSessionId(id);
    return session;
  }

  function getMostRecent(sessions) {
    let best = null;
    sessions.forEach((session) => {
      const ts = Number(session.lastRunAt) || 0;
      if (!best || ts > (Number(best.lastRunAt) || 0)) {
        best = session;
      }
    });
    return best;
  }

  function resumeLast() {
    const session = getMostRecent(state.sessions || []);
    if (!session) return null;
    resumeSession(session.id);
    return session;
  }

  function getSessions({ includeAll } = {}) {
    const showAll = includeAll !== undefined ? includeAll : state.showAll;
    if (showAll || !workspaceRoot) return [...state.sessions];
    return state.sessions.filter((session) => session.workspaceRoot === workspaceRoot);
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  persist();

  return {
    getState: () => state,
    getSessions,
    resumeLast,
    resumeSession,
    setActiveSessionId,
    setShowAll,
    subscribe,
    updateSession,
  };
}

export function createStatusPanel({
  panel,
  closeBtn,
  elements,
  appConfig,
  threadState,
  threadOptions,
  authStore,
}) {
  const {
    modelEl,
    sandboxEl,
    approvalsEl,
    cwdEl,
    addDirsEl,
    tokensEl,
    authEl,
    workspaceEl,
    agentsPathEl,
    agentsInstructionsEl,
  } = elements;
  let lastUsage = null;

  function resolveModelLabel(options) {
    if (options?.model) return options.model;
    const models = Array.isArray(appConfig?.modelCatalog) ? appConfig.modelCatalog : [];
    const defaultModel = models.find((model) => model.isDefault || model.is_default) || models[0];
    if (!defaultModel) return "Default";
    return defaultModel.displayName || defaultModel.display_name || defaultModel.model || "Default";
  }

  function render() {
    if (!panel) return;
    const currentThreadId = threadState?.getCurrentThreadId?.();
    const options = currentThreadId
      ? threadOptions?.getThreadOptions?.(currentThreadId)
      : threadOptions?.getDefaultOptions?.();
    const safeOptions = options || {};

    if (modelEl) modelEl.textContent = resolveModelLabel(safeOptions) || "Default";
    if (sandboxEl) sandboxEl.textContent = safeOptions.sandboxMode || "Default";
    if (approvalsEl) approvalsEl.textContent = safeOptions.approvalPolicy || "Default";

    const cwdValue = safeOptions.workingDirectory || appConfig?.workspaceRoot || "Default";
    if (cwdEl) cwdEl.textContent = cwdValue || "Default";

    const addDirs = Array.isArray(safeOptions.additionalDirectories)
      ? safeOptions.additionalDirectories
      : [];
    if (addDirsEl) addDirsEl.textContent = addDirs.length ? addDirs.join("\n") : "None";

    if (tokensEl) {
      if (lastUsage) {
        tokensEl.textContent = `Input: ${lastUsage.input_tokens} | Cached: ${lastUsage.cached_input_tokens} | Output: ${lastUsage.output_tokens}`;
      } else {
        tokensEl.textContent = "Usage unavailable";
      }
    }

    const authState = authStore?.getState?.();
    if (authEl) {
      if (authState?.status === "logged-in") {
        const method = authState.method ? ` (${authState.method})` : "";
        authEl.textContent = `Logged in${method}`;
      } else {
        authEl.textContent = "Logged out";
      }
    }

    if (workspaceEl) workspaceEl.textContent = appConfig?.workspaceRoot || "Unknown";

    const agentsInfo = appConfig?.agents || {};
    if (agentsPathEl) {
      agentsPathEl.textContent = agentsInfo.discoveryPath || "AGENTS.md not found";
    }
    if (agentsInstructionsEl) {
      const instructions = agentsInfo.instructions ? agentsInfo.instructions.trim() : "";
      agentsInstructionsEl.textContent = instructions || "No AGENTS instructions loaded.";
    }
  }

  function open() {
    render();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", close);
  }

  return {
    open,
    close,
    refresh: render,
    setUsage: (usage) => {
      if (usage) lastUsage = usage;
      if (!panel?.hidden) render();
    },
  };
}

export function createAuthPanel({ panel, closeBtn, elements, authStore, isHeadless }) {
  const {
    statusEl,
    methodEl,
    oauthBtn,
    apiKeyBtn,
    apiKeyForm,
    apiKeyInput,
    apiKeySubmit,
    deviceBtn,
    deviceInstructions,
    deviceCompleteBtn,
    logoutBtn,
    oauthGuidance,
    headlessGuidance,
  } = elements;

  let headless = Boolean(isHeadless);
  let mode = null;

  function formatStatus(state) {
    if (state.status !== "logged-in") return "Logged out";
    if (state.method === "api-key") {
      return `Logged in (API key${state.detail ? " " + state.detail : ""})`;
    }
    if (state.method) return `Logged in (${state.method})`;
    return "Logged in";
  }

  function updateVisibility() {
    if (oauthGuidance) oauthGuidance.hidden = mode !== "oauth";
    if (headlessGuidance) headlessGuidance.hidden = !(mode === "oauth" && headless);
    if (apiKeyForm) apiKeyForm.hidden = mode !== "api-key";
    if (deviceInstructions) deviceInstructions.hidden = mode !== "device";
    if (deviceCompleteBtn) deviceCompleteBtn.hidden = mode !== "device";
  }

  function renderStatus() {
    const state = authStore.getState();
    if (statusEl) statusEl.textContent = formatStatus(state);
    if (methodEl) methodEl.textContent = state.method || "";
    if (logoutBtn) logoutBtn.hidden = state.status !== "logged-in";
  }

  function open() {
    renderStatus();
    updateVisibility();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  if (oauthBtn) {
    oauthBtn.addEventListener("click", () => {
      mode = "oauth";
      authStore.login({ method: "oauth" });
      updateVisibility();
      renderStatus();
    });
  }

  if (apiKeyBtn) {
    apiKeyBtn.addEventListener("click", () => {
      mode = "api-key";
      updateVisibility();
      if (apiKeyInput) apiKeyInput.focus();
    });
  }

  if (apiKeySubmit) {
    apiKeySubmit.addEventListener("click", () => {
      const key = apiKeyInput?.value?.trim() || "";
      if (!key) return;
      const preview = key.length > 6 ? `...${key.slice(-4)}` : key;
      authStore.login({ method: "api-key", detail: preview });
      if (apiKeyInput) apiKeyInput.value = "";
      renderStatus();
    });
  }

  if (deviceBtn) {
    deviceBtn.addEventListener("click", () => {
      mode = "device";
      updateVisibility();
    });
  }

  if (deviceCompleteBtn) {
    deviceCompleteBtn.addEventListener("click", () => {
      authStore.login({ method: "device" });
      renderStatus();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authStore.logout();
      renderStatus();
    });
  }

  authStore.subscribe(renderStatus);

  updateVisibility();
  renderStatus();

  return {
    open,
    close,
    refresh: renderStatus,
    setHeadless: (value) => {
      headless = Boolean(value);
      updateVisibility();
    },
  };
}

export function createSessionsPanel({ panel, closeBtn, elements, sessionsStore, uiRenderer }) {
  const {
    showAllToggle,
    activeSessionEl,
    resumeIdInput,
    resumeIdBtn,
    resumeLastBtn,
    execPromptInput,
    execResumeBtn,
    sessionsList,
    emptyStateEl,
  } = elements;

  const { addSystemMessage, addMessage } = uiRenderer || {};

  function renderSessions() {
    if (!sessionsList) return;
    const state = sessionsStore.getState();
    const sessions = sessionsStore.getSessions();
    if (showAllToggle) showAllToggle.checked = Boolean(state.showAll);
    if (activeSessionEl) {
      activeSessionEl.textContent = state.activeSessionId || "None";
    }

    sessionsList.innerHTML = "";
    if (!sessions.length) {
      if (emptyStateEl) emptyStateEl.hidden = false;
      return;
    }
    if (emptyStateEl) emptyStateEl.hidden = true;

    sessions
      .slice()
      .sort((a, b) => (Number(b.lastRunAt) || 0) - (Number(a.lastRunAt) || 0))
      .forEach((session) => {
        const card = document.createElement("div");
        card.className = "session-card";
        card.dataset.sessionId = session.id;
        card.dataset.workspaceRoot = session.workspaceRoot || "";
        card.dataset.lastRun = String(session.lastRunAt || "");

        const header = document.createElement("div");
        header.className = "session-header";

        const idEl = document.createElement("div");
        idEl.className = "session-id";
        idEl.textContent = session.id;

        const resumeBtn = document.createElement("button");
        resumeBtn.type = "button";
        resumeBtn.className = "ghost-btn";
        resumeBtn.textContent = "Resume";
        resumeBtn.addEventListener("click", () => {
          handleResume(session.id);
        });

        header.appendChild(idEl);
        header.appendChild(resumeBtn);

        const meta = document.createElement("div");
        meta.className = "session-meta";

        const fields = [
          { label: "CWD", value: session.cwd, key: "cwd" },
          { label: "Branch", value: session.branch, key: "branch" },
          { label: "Last run", value: session.lastRunLabel, key: "lastRun" },
        ];

        fields.forEach((field) => {
          const row = document.createElement("div");
          row.className = "session-field";

          const label = document.createElement("span");
          label.className = "session-label";
          label.textContent = field.label;

          const value = document.createElement("span");
          value.className = "session-value";
          value.dataset.sessionField = field.key;
          value.textContent = field.value || "n/a";

          row.appendChild(label);
          row.appendChild(value);
          meta.appendChild(row);
        });

        const notes = document.createElement("label");
        notes.className = "session-note";
        notes.textContent = "Notes";
        const notesInput = document.createElement("input");
        notesInput.type = "text";
        notesInput.value = session.notes || "";
        notesInput.placeholder = "Add metadata";
        notesInput.addEventListener("input", () => {
          sessionsStore.updateSession(session.id, { notes: notesInput.value });
        });
        notes.appendChild(notesInput);

        card.appendChild(header);
        card.appendChild(meta);
        card.appendChild(notes);
        sessionsList.appendChild(card);
      });
  }

  function handleResume(id) {
    if (!id) return;
    const session = sessionsStore.resumeSession(id);
    if (!session) {
      addSystemMessage?.(`Session ${id} not found.`);
      return;
    }
    addSystemMessage?.(`Resumed session ${id}.`);
    renderSessions();
  }

  function handleResumeLast() {
    const session = sessionsStore.resumeLast();
    if (!session) {
      addSystemMessage?.("No sessions available to resume.");
      return;
    }
    addSystemMessage?.(`Resumed last session ${session.id}.`);
    renderSessions();
  }

  function handleExecResume(prompt) {
    const session = sessionsStore.resumeLast();
    if (!session) {
      addSystemMessage?.("No sessions available to resume.");
      return;
    }
    addSystemMessage?.(`Exec resume last on ${session.id}.`);
    if (prompt) {
      addMessage?.(`> ${prompt}`, "user");
      addSystemMessage?.("Prompt sent in exec mode.");
    }
    renderSessions();
  }

  if (showAllToggle) {
    showAllToggle.addEventListener("change", () => {
      sessionsStore.setShowAll(showAllToggle.checked);
    });
  }

  if (resumeIdBtn) {
    resumeIdBtn.addEventListener("click", () => {
      const id = resumeIdInput?.value?.trim();
      handleResume(id);
    });
  }

  if (resumeLastBtn) {
    resumeLastBtn.addEventListener("click", () => {
      handleResumeLast();
    });
  }

  if (execResumeBtn) {
    execResumeBtn.addEventListener("click", () => {
      const prompt = execPromptInput?.value?.trim();
      handleExecResume(prompt);
      if (execPromptInput) execPromptInput.value = "";
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", () => (panel.hidden = true));

  sessionsStore.subscribe(renderSessions);

  function open() {
    renderSessions();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  renderSessions();

  return { open, close, refresh: renderSessions };
}
