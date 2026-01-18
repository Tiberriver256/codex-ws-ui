const DEFAULT_MOCK_TASKS = [
  {
    id: "cloud-build-preview",
    name: "Build preview",
    description: "Compile and deploy a preview build.",
    status: "ready"
  },
  {
    id: "cloud-test-suite",
    name: "Run test suite",
    description: "Execute CI checks in the cloud.",
    status: "ready"
  }
];

const STATUS_LABELS = {
  ready: "Ready",
  queued: "Queued",
  running: "Running",
  completed: "Completed",
  failed: "Failed"
};

const STATUS_ALIASES = {
  idle: "ready",
  available: "ready",
  pending: "queued",
  queue: "queued",
  "in-progress": "running",
  in_progress: "running",
  success: "completed",
  done: "completed",
  error: "failed"
};

const DEFAULT_DELAYS = {
  running: 400,
  completed: 900
};

function normalizeId(value, index) {
  const raw = String(value || "").trim();
  if (raw) return raw;
  return `cloud-task-${index + 1}`;
}

function normalizeStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "ready";
  if (STATUS_LABELS[raw]) return raw;
  return STATUS_ALIASES[raw] || "ready";
}

function normalizeTask(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const id = normalizeId(entry.id || entry.key || entry.name, index);
  const name = entry.name || entry.title || `Cloud task ${index + 1}`;
  const description = entry.description || entry.detail || "";
  const status = normalizeStatus(entry.status || entry.state);
  return {
    id,
    name,
    description,
    status
  };
}

function normalizeTasks(list, fallback = []) {
  const base = Array.isArray(list) ? list : [];
  const normalized = base.map((entry, index) => normalizeTask(entry, index)).filter(Boolean);
  if (normalized.length) return normalized;
  return fallback.map((entry, index) => normalizeTask(entry, index)).filter(Boolean);
}

function normalizeDelays(raw = {}) {
  const running = Number(raw.running);
  const completed = Number(raw.completed);
  const resolved = {
    running: Number.isFinite(running) && running >= 0 ? running : DEFAULT_DELAYS.running,
    completed: Number.isFinite(completed) && completed >= 0 ? completed : DEFAULT_DELAYS.completed
  };
  if (resolved.completed <= resolved.running) {
    resolved.completed = resolved.running + 400;
  }
  return resolved;
}

export function createCloudPanel({ panel, closeBtn, appConfig = {}, elements = {} } = {}) {
  const { listEl, emptyEl } = elements;
  const fallbackTasks = appConfig.mockMode ? DEFAULT_MOCK_TASKS : [];
  let tasks = normalizeTasks(appConfig.cloudTasks || appConfig.mockCloudTasks || appConfig.cloud?.tasks, fallbackTasks);
  let delays = normalizeDelays(appConfig.cloudTaskDelays || appConfig.cloud?.delays || {});
  const timers = new Map();

  function clearTimers(id) {
    const pending = timers.get(id);
    if (!pending) return;
    pending.forEach((timerId) => clearTimeout(timerId));
    timers.delete(id);
  }

  function clearAllTimers() {
    Array.from(timers.keys()).forEach((id) => clearTimers(id));
  }

  function updateTask(id, patch) {
    tasks = tasks.map((task) => (task.id === id ? { ...task, ...patch } : task));
    renderList();
  }

  function buildStatusLabel(status) {
    return STATUS_LABELS[status] || "Ready";
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!tasks.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    tasks.forEach((task) => {
      const card = document.createElement("div");
      card.className = "cloud-task-card";
      card.dataset.cloudTask = "true";
      card.dataset.cloudId = task.id;

      const header = document.createElement("div");
      header.className = "cloud-task-header";

      const titleWrap = document.createElement("div");
      titleWrap.className = "cloud-task-title";

      const nameEl = document.createElement("div");
      nameEl.className = "cloud-task-name";
      nameEl.dataset.cloudField = "name";
      nameEl.textContent = task.name;

      const descEl = document.createElement("div");
      descEl.className = "cloud-task-desc";
      descEl.dataset.cloudField = "description";
      descEl.textContent = task.description || "No description";

      titleWrap.appendChild(nameEl);
      titleWrap.appendChild(descEl);

      const actions = document.createElement("div");
      actions.className = "cloud-task-actions";

      const statusEl = document.createElement("div");
      statusEl.className = "cloud-task-status";
      statusEl.dataset.cloudStatus = task.status;
      statusEl.textContent = buildStatusLabel(task.status);

      const runBtn = document.createElement("button");
      runBtn.type = "button";
      runBtn.className = "ghost-btn";
      runBtn.dataset.cloudAction = "run";
      runBtn.textContent = "Run";
      if (task.status === "queued" || task.status === "running") {
        runBtn.disabled = true;
      }
      runBtn.addEventListener("click", () => runTask(task.id));

      actions.appendChild(statusEl);
      actions.appendChild(runBtn);

      header.appendChild(titleWrap);
      header.appendChild(actions);

      card.appendChild(header);
      listEl.appendChild(card);
    });
  }

  function runTask(id) {
    const task = tasks.find((entry) => entry.id === id);
    if (!task) return;
    if (task.status === "queued" || task.status === "running") return;
    clearTimers(id);
    updateTask(id, { status: "queued", lastRunAt: Date.now() });

    const runningTimer = setTimeout(() => {
      updateTask(id, { status: "running" });
    }, delays.running);

    const completedTimer = setTimeout(() => {
      updateTask(id, { status: "completed" });
    }, delays.completed);

    timers.set(id, [runningTimer, completedTimer]);
  }

  function open() {
    renderList();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  return {
    open,
    close,
    refresh: renderList,
    runTask,
    setTasks: (nextTasks) => {
      clearAllTimers();
      tasks = normalizeTasks(nextTasks, []);
      renderList();
    },
    getTasks: () => tasks.map((task) => ({ ...task })),
    setDelays: (nextDelays) => {
      delays = normalizeDelays(nextDelays || {});
    }
  };
}
