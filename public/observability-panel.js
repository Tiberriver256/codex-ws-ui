const DEFAULT_LOG_PATH = "~/.codex/log";
const DEFAULT_EXPORT_PREFIX = "codex-transcript";
const MAX_NOTIFICATIONS = 25;

function getTestState() {
  if (typeof window === "undefined") return null;
  return window.__TEST__ || null;
}

function normalizeLogText(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line)).join("\n");
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function formatMessageType(node) {
  if (!node || !node.classList) return "unknown";
  const classes = Array.from(node.classList).filter((name) => name !== "message");
  if (!classes.length) return "unknown";
  return classes.join(" ");
}

function collectMessages(outputEl) {
  if (!outputEl) return [];
  const nodes = Array.from(outputEl.querySelectorAll(".message"));
  return nodes
    .map((node, index) => {
      const text = (node.innerText || node.textContent || "").trim();
      return {
        index: index + 1,
        type: formatMessageType(node),
        text
      };
    })
    .filter((entry) => entry.text);
}

function buildJsonl(entries) {
  return entries.map((entry) => JSON.stringify(entry)).join("\n");
}

function buildExportFilename(prefix) {
  const date = new Date().toISOString().slice(0, 10);
  const safePrefix = prefix || DEFAULT_EXPORT_PREFIX;
  return `${safePrefix}-${date}.jsonl`;
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "application/jsonl" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function renderNotificationItem(entry) {
  const item = document.createElement("div");
  item.className = "observability-notification";

  const title = document.createElement("div");
  title.className = "observability-notification-title";
  title.textContent = entry.title || "Notification";

  const body = document.createElement("div");
  body.className = "observability-notification-body";
  body.textContent = entry.body || "";

  const meta = document.createElement("div");
  meta.className = "observability-notification-meta";
  const timestamp = entry.timestamp ? new Date(entry.timestamp).toISOString() : "";
  meta.textContent = timestamp ? `Sent ${timestamp}` : "";

  item.appendChild(title);
  if (body.textContent) item.appendChild(body);
  if (meta.textContent) item.appendChild(meta);
  return item;
}

export function createObservabilityPanel({
  panel,
  closeBtn,
  outputEl,
  appConfig = {},
  elements = {}
} = {}) {
  const {
    exportBtn,
    logsEl,
    logPathEl,
    notificationsToggle,
    notificationsList,
    notificationsEmpty
  } = elements;

  let logPath =
    appConfig?.observability?.logPath || appConfig?.observabilityLogPath || DEFAULT_LOG_PATH;
  let logs = normalizeLogText(
    appConfig?.observability?.logs ||
      appConfig?.observabilityLogs ||
      appConfig?.mockObservabilityLogs ||
      appConfig?.mockLogs
  );
  let notificationsEnabled = Boolean(appConfig?.observability?.notificationsEnabled);
  let notifications = [];

  function renderLogs() {
    if (logPathEl) logPathEl.textContent = logPath || DEFAULT_LOG_PATH;
    if (logsEl) logsEl.textContent = logs || "No logs loaded.";
  }

  function renderNotifications() {
    if (!notificationsList) return;
    notificationsList.innerHTML = "";
    if (!notifications.length) {
      if (notificationsEmpty) notificationsEmpty.hidden = false;
      return;
    }
    if (notificationsEmpty) notificationsEmpty.hidden = true;
    notifications.forEach((entry) => {
      notificationsList.appendChild(renderNotificationItem(entry));
    });
  }

  function setLogs(value) {
    logs = normalizeLogText(value);
    renderLogs();
    const testState = getTestState();
    if (testState) {
      testState.observability = testState.observability || {};
      testState.observability.logs = logs;
    }
  }

  function setLogPath(value) {
    const next = String(value || "").trim();
    if (next) {
      logPath = next;
    }
    renderLogs();
  }

  function setNotificationsEnabled(value) {
    notificationsEnabled = Boolean(value);
    if (notificationsToggle) notificationsToggle.checked = notificationsEnabled;
    const testState = getTestState();
    if (testState) {
      testState.observability = testState.observability || {};
      testState.observability.notificationsEnabled = notificationsEnabled;
    }
  }

  function clearNotifications() {
    notifications = [];
    renderNotifications();
    const testState = getTestState();
    if (testState) {
      testState.observability = testState.observability || {};
      testState.observability.notifications = [];
    }
  }

  function notify(entry = {}) {
    if (!notificationsEnabled) return null;
    const payload = {
      title: entry.title || "Notification",
      body: entry.body || "",
      tag: entry.tag || "",
      data: entry.data || null,
      timestamp: Date.now()
    };
    notifications = [payload, ...notifications].slice(0, MAX_NOTIFICATIONS);
    renderNotifications();

    const testState = getTestState();
    if (testState) {
      testState.observability = testState.observability || {};
      testState.observability.lastNotification = payload;
      testState.observability.notifications = notifications.map((note) => ({ ...note }));
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(payload.title, {
            body: payload.body,
            tag: payload.tag,
            data: payload.data
          });
        } catch {
          // ignore notification errors
        }
      }
    }

    return payload;
  }

  function exportTranscript() {
    const entries = collectMessages(outputEl);
    const jsonl = buildJsonl(entries);
    const filename = buildExportFilename(appConfig?.observability?.exportPrefix);
    if (jsonl) {
      downloadText(jsonl, filename);
    }
    const testState = getTestState();
    if (testState) {
      testState.observability = testState.observability || {};
      testState.observability.lastExport = {
        text: jsonl,
        filename,
        count: entries.length
      };
    }
    return jsonl;
  }

  function handleEvent(event) {
    if (!event || !event.type) return;
    if (event.type === "turn.completed") {
      notify({
        title: "Turn completed",
        body: "A turn finished processing."
      });
    }
  }

  function notifyApprovalRequest(request = {}) {
    const label = request.label || request.action || "Approval";
    notify({
      title: "Approval needed",
      body: `Approval requested for ${label}.`
    });
  }

  function open() {
    renderLogs();
    renderNotifications();
    setNotificationsEnabled(notificationsEnabled);
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      exportTranscript();
    });
  }

  if (notificationsToggle) {
    notificationsToggle.addEventListener("change", () => {
      setNotificationsEnabled(notificationsToggle.checked);
    });
  }

  renderLogs();
  renderNotifications();
  setNotificationsEnabled(notificationsEnabled);

  return {
    open,
    close,
    refresh: () => {
      renderLogs();
      renderNotifications();
    },
    setLogs,
    setLogPath,
    exportTranscript,
    handleEvent,
    notifyApprovalRequest,
    setNotificationsEnabled,
    getNotifications: () => notifications.map((note) => ({ ...note })),
    clearNotifications,
    getLogs: () => logs
  };
}
