const STORAGE_KEY = "codex-approval-rules-v1";

function canUseStorage() {
  return typeof window !== "undefined" && window.localStorage;
}

function readStorage() {
  if (!canUseStorage()) return { rules: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { rules: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { rules: [] };
    return { rules: Array.isArray(parsed.rules) ? parsed.rules : [] };
  } catch {
    return { rules: [] };
  }
}

function writeStorage(state) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

function normalizeRule(rule = {}) {
  if (!rule || typeof rule !== "object") return null;
  const action = String(rule.action || "").trim();
  if (!action) return null;
  const id = String(rule.id || `${action}:${rule.createdAt || Date.now()}`);
  return {
    id,
    action,
    label: rule.label ? String(rule.label) : action,
    source: rule.source ? String(rule.source) : "user",
    createdAt: Number(rule.createdAt) || Date.now(),
  };
}

export function createApprovalRulesStore() {
  let state = readStorage();
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn(getState()));
  }

  function persist() {
    writeStorage(state);
  }

  function getState() {
    return { rules: state.rules.slice() };
  }

  function setRules(rules) {
    state = { rules: (rules || []).map(normalizeRule).filter(Boolean) };
    persist();
    notify();
  }

  function addRule(rule) {
    const normalized = normalizeRule(rule);
    if (!normalized) return null;
    const existing = state.rules.filter((entry) => entry.action !== normalized.action);
    state = { rules: [normalized, ...existing] };
    persist();
    notify();
    return normalized;
  }

  function matchAction(action) {
    const target = String(action || "").trim();
    if (!target) return null;
    return state.rules.find((entry) => entry.action === target) || null;
  }

  function clearRules() {
    state = { rules: [] };
    persist();
    notify();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return {
    addRule,
    clearRules,
    getRules: () => state.rules.slice(),
    matchAction,
    setRules,
    subscribe,
  };
}
