const DEFAULT_FLAGS = [
  {
    id: "streaming-ui",
    label: "Streaming UI",
    description: "Stream token updates in the UI.",
    enabled: true
  },
  {
    id: "fast-log",
    label: "Fast log batching",
    description: "Batch log updates for speed.",
    enabled: false
  },
  {
    id: "thread-auto-title",
    label: "Thread auto-title",
    description: "Generate a title after the first response.",
    enabled: true
  }
];

function normalizeFlag(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const id = String(entry.id || entry.key || entry.name || `flag-${index}`).trim();
  if (!id) return null;
  return {
    id,
    label: entry.label || entry.name || id,
    description: entry.description || entry.note || "",
    enabled: Boolean(entry.enabled)
  };
}

function normalizeFlags(list) {
  if (!Array.isArray(list)) return [];
  return list.map((entry, index) => normalizeFlag(entry, index)).filter(Boolean);
}

export function createFeatureFlagsPanel({ panel, closeBtn, appConfig = {}, elements = {} }) {
  const { listEl, emptyEl } = elements;
  let flags = normalizeFlags(appConfig.featureFlags);
  if (!flags.length) flags = DEFAULT_FLAGS;

  function render() {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!flags.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    flags.forEach((flag) => {
      const row = document.createElement("div");
      row.className = "flag-row";
      row.dataset.flagId = flag.id;

      const meta = document.createElement("div");
      meta.className = "flag-meta";
      const title = document.createElement("div");
      title.className = "flag-title";
      title.textContent = flag.label;
      const description = document.createElement("div");
      description.className = "flag-description";
      description.textContent = flag.description || "";
      meta.appendChild(title);
      if (flag.description) meta.appendChild(description);

      const toggle = document.createElement("label");
      toggle.className = "flag-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = Boolean(flag.enabled);
      input.dataset.flagId = flag.id;
      const text = document.createElement("span");
      text.textContent = input.checked ? "On" : "Off";
      input.addEventListener("change", () => {
        flag.enabled = input.checked;
        text.textContent = input.checked ? "On" : "Off";
      });
      toggle.appendChild(input);
      toggle.appendChild(text);

      row.appendChild(meta);
      row.appendChild(toggle);
      listEl.appendChild(row);
    });
  }

  function open() {
    render();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  function setFlags(nextFlags = []) {
    flags = normalizeFlags(nextFlags);
    if (!flags.length) flags = [];
    render();
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  render();

  return {
    open,
    close,
    refresh: render,
    setFlags,
    getFlags: () => flags.map((flag) => ({ ...flag }))
  };
}
