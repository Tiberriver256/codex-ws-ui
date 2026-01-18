const DEFAULT_CLIENT_INFO = {
  name: "codex-ws-ui",
  title: "Codex WS UI",
  version: "0.0.0"
};

const ITEM_TYPE_MAP = {
  agentMessage: "agent_message",
  commandExecution: "command_execution",
  fileChange: "file_change",
  reasoning: "reasoning",
  todoList: "todo_list"
};

function normalizeId(id) {
  return typeof id === "string" ? id : String(id);
}

function normalizeEventType(type) {
  if (!type) return null;
  return type.includes("/") ? type.split("/").join(".") : type;
}

function mapItemType(raw) {
  if (!raw) return null;
  if (ITEM_TYPE_MAP[raw]) return ITEM_TYPE_MAP[raw];
  return raw.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function getItemId(params) {
  if (!params || typeof params !== "object") return null;
  return params.item_id || params.itemId || params.id || params.item?.id || null;
}

function defaultUnifiedDiff() {
  return [
    "--- a/example.txt",
    "+++ b/example.txt",
    "@@ -1,1 +1,2 @@",
    "-hello",
    "+hello",
    "+world",
    ""
  ].join("\n");
}

export function createAppServerClient({ onEvent, onSend } = {}) {
  const pending = new Map();
  const itemState = new Map();
  const normalizedEvents = [];
  const completedRequests = [];
  let nextId = 1;
  let lastRequest = null;
  let lastServerRequest = null;
  let lastFileChangeItem = null;
  let autoItemId = 1;

  function recordSend(message) {
    lastRequest = message;
    if (typeof onSend === "function") {
      onSend(message);
    }
  }

  function queueRequest({ method, params, id } = {}) {
    if (!method) return { id: null, promise: Promise.resolve(null) };
    const requestId = id !== undefined ? id : nextId++;
    const message = { method, params, id: requestId };
    recordSend(message);

    let resolveFn;
    let rejectFn;
    const promise = new Promise((resolve, reject) => {
      resolveFn = resolve;
      rejectFn = reject;
    });

    pending.set(normalizeId(requestId), { id: requestId, method, resolve: resolveFn, reject: rejectFn });
    return { id: requestId, promise };
  }

  function request(method, params, options = {}) {
    return queueRequest({ method, params, id: options.id });
  }

  function connect(options = {}) {
    const clientInfo = options.clientInfo || DEFAULT_CLIENT_INFO;
    const id = options.id !== undefined ? options.id : 0;
    return request("initialize", { clientInfo }, { id });
  }

  function emitEvent(event) {
    if (!event || !event.type) return;
    normalizedEvents.push(event);
    if (typeof onEvent === "function") {
      onEvent(event);
    }
  }

  function ensureItem(itemId, type) {
    if (!itemId) return null;
    let item = itemState.get(itemId);
    if (!item) {
      item = { id: itemId, type };
      itemState.set(itemId, item);
    } else if (type && !item.type) {
      item.type = type;
    }
    return item;
  }

  function emitItemEvent(type, params = {}) {
    let rawItem = params.item && typeof params.item === "object" ? { ...params.item } : null;
    if (!rawItem && params.type) {
      const fallback = { ...params };
      delete fallback.type;
      rawItem = fallback;
    }
    if (!rawItem) return;

    const itemId = rawItem.id || getItemId(params) || `item_${autoItemId++}`;
    rawItem.id = itemId;

    const merged = itemState.has(itemId)
      ? { ...itemState.get(itemId), ...rawItem }
      : rawItem;

    if (!merged.type) {
      merged.type = mapItemType(params.itemType) || merged.type;
    }

    itemState.set(itemId, merged);
    if (merged.type === "file_change") {
      lastFileChangeItem = merged;
    }
    emitEvent({ type, item: merged });
  }

  function emitThreadEvent(type, params = {}) {
    const event = { type };
    if (params && typeof params === "object") Object.assign(event, params);
    if (!event.thread_id) {
      const threadId = params.thread?.id || params.threadId || params.id;
      if (threadId) event.thread_id = threadId;
    }
    emitEvent(event);
  }

  function emitTurnEvent(type, params = {}) {
    const event = { type };
    if (params && typeof params === "object") Object.assign(event, params);
    if (!event.usage && params.turn?.usage) {
      event.usage = params.turn.usage;
    }
    if (!event.error && params.turn?.error) {
      event.error = params.turn.error;
    }
    if (!event.turn_id && params.turn?.id) {
      event.turn_id = params.turn.id;
    }
    emitEvent(event);
  }

  function emitGenericEvent(type, params = {}) {
    const event = { type };
    if (params && typeof params === "object") Object.assign(event, params);
    emitEvent(event);
  }

  function handleItemDelta(kind, params = {}) {
    const itemId = getItemId(params) || `item_${autoItemId++}`;
    const itemType = mapItemType(kind);
    const item = ensureItem(itemId, itemType) || { id: itemId, type: itemType };
    const delta = typeof params.delta === "string"
      ? params.delta
      : typeof params.text === "string"
        ? params.text
        : "";

    if (itemType === "command_execution") {
      item.aggregated_output = (item.aggregated_output || "") + delta;
    } else if (itemType === "file_change") {
      item.diff = (item.diff || "") + delta;
    } else {
      item.text = (item.text || "") + delta;
    }

    itemState.set(itemId, item);
    if (item.type === "file_change") {
      lastFileChangeItem = item;
    }
    emitEvent({ type: "item.updated", item: { ...item } });
  }

  function normalizeDiffEntry(entry) {
    if (!entry || typeof entry !== "object") return null;
    const path = entry.path || entry.file || entry.filename || "";
    const kind = entry.kind || entry.change || entry.action || "update";
    const diff = entry.diff || entry.patch || entry.text || "";
    return { path, kind, diff };
  }

  function buildUiDiffs(params) {
    if (!params || typeof params !== "object") return [];
    if (Array.isArray(params.ui_diffs)) {
      return params.ui_diffs.map(normalizeDiffEntry).filter(Boolean);
    }
    if (Array.isArray(params.diffs)) {
      return params.diffs.map(normalizeDiffEntry).filter(Boolean);
    }
    if (Array.isArray(params.files) && typeof params.diff === "string") {
      return params.files.map((file) => {
        const path = typeof file === "string" ? file : file.path || file.file || "";
        const kind = typeof file === "object" ? file.kind || "update" : "update";
        return { path, kind, diff: params.diff };
      });
    }
    const diffText = typeof params.diff === "string" ? params.diff : typeof params.patch === "string" ? params.patch : "";
    if (diffText) {
      const fallback = lastFileChangeItem?.changes?.[0] || {};
      return [{
        path: params.path || fallback.path || "",
        kind: params.kind || fallback.kind || "update",
        diff: diffText
      }];
    }
    return [];
  }

  function buildChanges(params) {
    if (Array.isArray(params?.files)) {
      return params.files
        .map((file) => {
          if (typeof file === "string") return { path: file, kind: "update" };
          return { path: file.path || file.file || "", kind: file.kind || "update" };
        })
        .filter((change) => change.path);
    }
    if (Array.isArray(params?.changes)) {
      return params.changes
        .map((change) => ({ path: change.path || "", kind: change.kind || "update" }))
        .filter((change) => change.path);
    }
    return lastFileChangeItem?.changes || [];
  }

  function handleDiffUpdate(params = {}) {
    const uiDiffs = buildUiDiffs(params);
    const changes = buildChanges(params);
    const itemId = lastFileChangeItem?.id || `file_change_${Date.now()}`;
    const item = {
      id: itemId,
      type: "file_change",
      changes,
      status: "completed",
      ui_diffs: uiDiffs
    };

    if (params.ui_diff_error) {
      item.ui_diff_error = params.ui_diff_error;
    }

    const merged = lastFileChangeItem ? { ...lastFileChangeItem, ...item } : item;
    itemState.set(itemId, merged);
    lastFileChangeItem = merged;
    emitEvent({ type: "item.completed", item: merged });
  }

  function handleResponse(message) {
    if (!Object.prototype.hasOwnProperty.call(message, "id")) return false;
    const entry = pending.get(normalizeId(message.id));
    if (!entry) return false;

    pending.delete(normalizeId(message.id));

    if (message.error) {
      entry.reject(message.error);
    } else {
      entry.resolve(message.result);
    }

    completedRequests.push({
      id: entry.id,
      method: entry.method,
      result: message.result,
      error: message.error || null
    });

    return true;
  }

  function handleServerRequest(message) {
    lastServerRequest = message;
  }

  function handleNotification(message) {
    const method = message.method;
    const params = message.params || {};

    if (method === "turn/diff/updated" || method === "turn.diff.updated") {
      handleDiffUpdate(params);
      return;
    }

    if (method === "codex/event" && params.event) {
      const event = { ...params.event };
      const type = normalizeEventType(event.type);
      if (!type) return;
      if (type === "turn.diff.updated") {
        handleDiffUpdate(event);
        return;
      }
      event.type = type;
      if (type.startsWith("item.")) {
        emitItemEvent(type, { item: event.item || event });
        return;
      }
      if (type.startsWith("thread.")) {
        emitThreadEvent(type, event);
        return;
      }
      if (type.startsWith("turn.")) {
        emitTurnEvent(type, event);
        return;
      }
      emitGenericEvent(type, event);
      return;
    }

    if (method.startsWith("codex/event/")) {
      const legacyType = normalizeEventType(method.slice("codex/event/".length));
      if (legacyType === "turn.diff.updated") {
        handleDiffUpdate(params);
        return;
      }
      if (legacyType.startsWith("item.")) {
        emitItemEvent(legacyType, params);
        return;
      }
      if (legacyType.startsWith("thread.")) {
        emitThreadEvent(legacyType, params);
        return;
      }
      if (legacyType.startsWith("turn.")) {
        emitTurnEvent(legacyType, params);
        return;
      }
      emitGenericEvent(legacyType, params);
      return;
    }

    const parts = method.split("/");
    if (parts[0] === "item" && parts.length === 3 && parts[2] === "delta") {
      handleItemDelta(parts[1], params);
      return;
    }

    if (parts[0] === "item" && parts.length === 2) {
      const type = `item.${parts[1]}`;
      emitItemEvent(type, params);
      return;
    }

    if (parts.length === 2) {
      const type = `${parts[0]}.${parts[1]}`;
      if (type.startsWith("thread.")) {
        emitThreadEvent(type, params);
        return;
      }
      if (type.startsWith("turn.")) {
        emitTurnEvent(type, params);
        return;
      }
      emitGenericEvent(type, params);
      return;
    }

    if (method.includes(".")) {
      const type = normalizeEventType(method);
      if (!type) return;
      if (type.startsWith("item.")) {
        emitItemEvent(type, params);
        return;
      }
      if (type.startsWith("thread.")) {
        emitThreadEvent(type, params);
        return;
      }
      if (type.startsWith("turn.")) {
        emitTurnEvent(type, params);
        return;
      }
      emitGenericEvent(type, params);
    }
  }

  function receive(message) {
    if (!message) return;
    let payload = message;
    if (typeof message === "string") {
      try {
        payload = JSON.parse(message);
      } catch {
        return;
      }
    }
    if (!payload || typeof payload !== "object") return;

    const hasId = Object.prototype.hasOwnProperty.call(payload, "id");
    const hasMethod = typeof payload.method === "string";

    if (hasId && !hasMethod) {
      handleResponse(payload);
      return;
    }

    if (hasId && hasMethod) {
      handleServerRequest(payload);
      return;
    }

    if (hasMethod) {
      handleNotification(payload);
    }
  }

  function emitMixed(options = {}) {
    const threadId = options.threadId || `thread_${Date.now()}`;
    const messageId = options.messageId || `msg_${Date.now()}`;

    receive({ method: "thread/started", params: { thread: { id: threadId } } });
    receive({ method: "codex/event/turn.started", params: { turn_id: `turn_${Date.now()}` } });
    receive({ method: "item/started", params: { item: { id: messageId, type: "agent_message", text: "" } } });
    receive({ method: "item/agentMessage/delta", params: { itemId: messageId, delta: "Hello " } });
    receive({ method: "item/agentMessage/delta", params: { itemId: messageId, delta: "world" } });
    receive({ method: "item/completed", params: { item: { id: messageId, type: "agent_message", text: "Hello world" } } });
    receive({
      method: "codex/event/turn.completed",
      params: {
        usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 2 }
      }
    });

    if (options.includeFileChange) {
      const fileId = options.fileId || `file_${Date.now()}`;
      const changes = options.changes || [{ path: "example.txt", kind: "update" }];
      receive({
        method: "item/started",
        params: { item: { id: fileId, type: "file_change", changes, status: "completed" } }
      });
    }
  }

  function emitDiffUpdate(options = {}) {
    const diff = options.diff || defaultUnifiedDiff();
    const files = options.files || lastFileChangeItem?.changes || [{ path: "example.txt", kind: "update" }];
    receive({ method: "turn/diff/updated", params: { diff, files } });
  }

  return {
    connect,
    request,
    queueRequest,
    receive,
    emitMixed,
    emitDiffUpdate,
    normalizedEvents,
    completedRequests,
    get lastRequest() {
      return lastRequest;
    },
    get lastServerRequest() {
      return lastServerRequest;
    }
  };
}
