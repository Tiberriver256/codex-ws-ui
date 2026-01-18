const DEFAULT_MOCK_SERVERS = [
  {
    id: "mcp-local",
    name: "Local MCP",
    url: "http://127.0.0.1:5150",
    requiresAuth: false,
    authStatus: "not-required"
  },
  {
    id: "mcp-secure",
    name: "Secure MCP",
    url: "https://mcp.example",
    requiresAuth: true,
    authStatus: "logged-out"
  }
];

function normalizeId(value, index) {
  const raw = String(value || "").trim();
  if (raw) return raw;
  return `mcp-${index + 1}`;
}

function normalizeAuthStatus(entry, requiresAuth) {
  if (!requiresAuth) return "not-required";
  if (entry?.authenticated === true) return "logged-in";
  if (entry?.authenticated === false) return "logged-out";
  const raw = String(entry?.authStatus || entry?.auth_state || entry?.status || "").toLowerCase();
  if (raw === "logged-in" || raw === "authenticated" || raw === "ok") return "logged-in";
  if (raw === "logged-out" || raw === "unauthenticated") return "logged-out";
  return "logged-out";
}

function normalizeServer(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const id = normalizeId(entry.id || entry.key || entry.name || entry.url, index);
  const name = entry.name || entry.label || entry.title || `MCP Server ${index + 1}`;
  const url = entry.url || entry.endpoint || entry.address || "";
  const requiresAuth = Boolean(entry.requiresAuth || entry.authRequired || entry.requires_auth || entry.auth);
  const authStatus = normalizeAuthStatus(entry, requiresAuth);
  return {
    id,
    name,
    url,
    requiresAuth,
    authStatus
  };
}

function normalizeServers(list, fallback = []) {
  const base = Array.isArray(list) ? list : [];
  const normalized = base
    .map((entry, index) => normalizeServer(entry, index))
    .filter(Boolean);
  if (normalized.length) return normalized;
  return fallback
    .map((entry, index) => normalizeServer(entry, index))
    .filter(Boolean);
}

function buildAuthLabel(server) {
  if (!server.requiresAuth) return "Auth not required";
  return server.authStatus === "logged-in" ? "Logged in" : "Logged out";
}

function buildAuthDetail(server) {
  if (!server.requiresAuth) return "Ready";
  return server.authStatus === "logged-in" ? "Authenticated" : "Not authenticated";
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function createMcpPanel({ panel, closeBtn, appConfig = {}, elements = {} } = {}) {
  const { listEl, emptyEl, nameInput, urlInput, authToggle, addBtn } = elements;
  const fallbackServers = appConfig.mockMode ? DEFAULT_MOCK_SERVERS : [];
  let servers = normalizeServers(
    appConfig.mcpServers || appConfig.mockMcpServers || appConfig.mcp?.servers,
    fallbackServers
  );
  let idCounter = servers.length + 1;

  function ensureId(server) {
    if (server.id) return server;
    const base = slugify(server.name || server.url || "mcp");
    const id = base ? `${base}-${idCounter++}` : `mcp-${idCounter++}`;
    return { ...server, id };
  }

  function renderList() {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!servers.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    servers.forEach((server) => {
      const card = document.createElement("div");
      card.className = "mcp-card";
      card.dataset.mcpServer = "true";
      card.dataset.mcpId = server.id;
      card.dataset.mcpAuth = server.requiresAuth ? "required" : "none";
      card.dataset.mcpStatus = server.authStatus;

      const header = document.createElement("div");
      header.className = "mcp-card-header";

      const title = document.createElement("div");
      title.className = "mcp-card-title";

      const nameEl = document.createElement("div");
      nameEl.className = "mcp-name";
      nameEl.dataset.mcpField = "name";
      nameEl.textContent = server.name;

      const urlEl = document.createElement("div");
      urlEl.className = "mcp-url";
      urlEl.dataset.mcpField = "url";
      urlEl.textContent = server.url || "(no endpoint)";

      title.appendChild(nameEl);
      title.appendChild(urlEl);

      const actions = document.createElement("div");
      actions.className = "mcp-actions";

      const loginBtn = document.createElement("button");
      loginBtn.type = "button";
      loginBtn.className = "ghost-btn";
      loginBtn.dataset.mcpAction = "login";
      loginBtn.textContent = "Login";

      const logoutBtn = document.createElement("button");
      logoutBtn.type = "button";
      logoutBtn.className = "ghost-btn";
      logoutBtn.dataset.mcpAction = "logout";
      logoutBtn.textContent = "Logout";

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "ghost-btn";
      removeBtn.dataset.mcpAction = "remove";
      removeBtn.textContent = "Remove";

      if (!server.requiresAuth) {
        loginBtn.hidden = true;
        logoutBtn.hidden = true;
      } else if (server.authStatus === "logged-in") {
        loginBtn.hidden = true;
        logoutBtn.hidden = false;
      } else {
        loginBtn.hidden = false;
        logoutBtn.hidden = true;
      }

      actions.appendChild(loginBtn);
      actions.appendChild(logoutBtn);
      actions.appendChild(removeBtn);

      header.appendChild(title);
      header.appendChild(actions);

      const meta = document.createElement("div");
      meta.className = "mcp-meta";

      const status = document.createElement("div");
      status.className = "mcp-status";
      status.dataset.mcpStatus = server.authStatus;
      status.textContent = `Auth: ${buildAuthLabel(server)} · ${buildAuthDetail(server)}`;

      meta.appendChild(status);

      card.appendChild(header);
      card.appendChild(meta);
      listEl.appendChild(card);
    });
  }

  function setServers(nextServers) {
    servers = normalizeServers(nextServers, []);
    servers = servers.map((server, index) => ensureId({ ...server, id: server.id || normalizeId(server.id, index) }));
    renderList();
  }

  function addServer(entry) {
    const normalized = normalizeServer(entry, servers.length) || {
      id: `mcp-${idCounter++}`,
      name: entry?.name || `MCP Server ${servers.length + 1}`,
      url: entry?.url || "",
      requiresAuth: Boolean(entry?.requiresAuth),
      authStatus: entry?.requiresAuth ? "logged-out" : "not-required"
    };
    servers = [...servers, ensureId(normalized)];
    renderList();
  }

  function removeServer(id) {
    servers = servers.filter((server) => server.id !== id);
    renderList();
  }

  function updateAuth(id, status) {
    servers = servers.map((server) => {
      if (server.id !== id) return server;
      if (!server.requiresAuth) return server;
      return { ...server, authStatus: status };
    });
    renderList();
  }

  function open() {
    renderList();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const name = nameInput?.value?.trim() || "";
      const url = urlInput?.value?.trim() || "";
      if (!name && !url) return;
      const requiresAuth = Boolean(authToggle?.checked);
      addServer({ name: name || url || "MCP Server", url, requiresAuth });
      if (nameInput) nameInput.value = "";
      if (urlInput) urlInput.value = "";
      if (authToggle) authToggle.checked = false;
    });
  }

  if (listEl) {
    listEl.addEventListener("click", (event) => {
      const actionEl = event.target.closest("[data-mcp-action]");
      if (!actionEl) return;
      const card = actionEl.closest("[data-mcp-server]");
      if (!card) return;
      const id = card.dataset.mcpId || "";
      const action = actionEl.dataset.mcpAction || "";
      if (!id) return;
      if (action === "remove") removeServer(id);
      if (action === "login") updateAuth(id, "logged-in");
      if (action === "logout") updateAuth(id, "logged-out");
    });
  }

  renderList();

  return {
    open,
    close,
    setServers,
    getServers: () => servers.slice(),
    addServer,
    removeServer,
    loginServer: (id) => updateAuth(id, "logged-in"),
    logoutServer: (id) => updateAuth(id, "logged-out")
  };
}
