const DEFAULT_PROMPTS = [];
const PLACEHOLDER_PATTERN = /\{\{\s*([\w-]+)\s*\}\}/g;

function normalizePrompt(prompt, index) {
  const name = prompt?.name || prompt?.title || prompt?.label || `Prompt ${index + 1}`;
  const template = prompt?.template || prompt?.prompt || prompt?.text || "";
  const description = prompt?.description || prompt?.summary || prompt?.details || "";
  const id = prompt?.id || prompt?.slug || prompt?.path || `${name}-${index + 1}`;
  const source = prompt?.source || prompt?.path || "";
  return {
    id,
    name,
    template,
    description,
    source,
    raw: prompt,
  };
}

function groupPrompts(prompts) {
  const groups = new Map();
  (prompts || []).forEach((prompt) => {
    const key = prompt.name || "Untitled";
    if (!groups.has(key)) {
      groups.set(key, { name: key, prompts: [] });
    }
    groups.get(key).prompts.push(prompt);
  });
  return Array.from(groups.values());
}

function parsePlaceholders(template) {
  if (!template) return [];
  const placeholders = [];
  const seen = new Set();
  PLACEHOLDER_PATTERN.lastIndex = 0;
  let match;
  while ((match = PLACEHOLDER_PATTERN.exec(template))) {
    const key = match[1];
    if (seen.has(key)) continue;
    seen.add(key);
    const isNumeric = /^\d+$/.test(key);
    placeholders.push({
      key,
      label: isNumeric ? `Placeholder ${key}` : key,
      type: isNumeric ? "positional" : "named",
    });
  }
  return placeholders;
}

function fillTemplate(template, values) {
  if (!template) return "";
  PLACEHOLDER_PATTERN.lastIndex = 0;
  return template.replace(PLACEHOLDER_PATTERN, (match, key) => {
    if (!values || !(key in values)) return match;
    return values[key];
  });
}

function createPromptButton({ name, description, count, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prompt-item";
  button.dataset.promptName = name;
  if (count) button.dataset.promptCount = String(count);

  const text = document.createElement("span");
  text.className = "prompt-text";

  const label = document.createElement("span");
  label.className = "prompt-label";
  label.textContent = name;

  const desc = document.createElement("span");
  desc.className = "prompt-desc";
  if (description) desc.textContent = description;

  text.appendChild(label);
  if (desc.textContent) text.appendChild(desc);

  const meta = document.createElement("span");
  meta.className = "prompt-meta";
  if (count && count > 1) {
    const badge = document.createElement("span");
    badge.className = "prompt-dup-badge";
    badge.textContent = `${count} variants`;
    meta.appendChild(badge);
  }

  button.appendChild(text);
  if (meta.childNodes.length > 0) button.appendChild(meta);
  button.addEventListener("click", onClick);
  return button;
}

function createVariantButton(prompt, index, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "prompt-item";
  button.dataset.promptId = prompt.id;
  button.dataset.promptName = prompt.name;

  const text = document.createElement("span");
  text.className = "prompt-text";

  const label = document.createElement("span");
  label.className = "prompt-label";
  label.textContent = prompt.description || prompt.source || `Variant ${index + 1}`;

  const desc = document.createElement("span");
  desc.className = "prompt-desc";
  desc.textContent = prompt.template ? prompt.template.slice(0, 80) : "";

  text.appendChild(label);
  if (desc.textContent) text.appendChild(desc);

  button.appendChild(text);
  button.addEventListener("click", onClick);
  return button;
}

function clearElement(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

export function createPromptsPalette({
  overlay,
  closeBtn,
  input,
  listEl,
  listSection,
  emptyEl,
  duplicatesSection,
  duplicatesListEl,
  fillPanel,
  fillFieldsEl,
  fillTitleEl,
  fillSubtitleEl,
  fillApplyBtn,
  fillCancelBtn,
  getPrompts = () => DEFAULT_PROMPTS,
  onInsert,
} = {}) {
  if (!overlay) {
    return {
      open() {},
      close() {},
    };
  }

  let groups = [];
  let activePrompt = null;
  let activePlaceholders = [];

  function hideFillPanel() {
    if (fillPanel) fillPanel.hidden = true;
    if (listSection) listSection.hidden = false;
  }

  function showFillPanel() {
    if (fillPanel) fillPanel.hidden = false;
    if (listSection) listSection.hidden = true;
    if (duplicatesSection) duplicatesSection.hidden = true;
  }

  function hideDuplicates() {
    if (duplicatesSection) duplicatesSection.hidden = true;
    clearElement(duplicatesListEl);
  }

  function renderPlaceholders() {
    clearElement(fillFieldsEl);
    activePlaceholders.forEach((placeholder) => {
      const field = document.createElement("label");
      field.className = "prompt-field";

      const label = document.createElement("span");
      label.textContent = placeholder.label;

      const inputEl = document.createElement("input");
      inputEl.type = "text";
      inputEl.dataset.placeholder = placeholder.key;
      inputEl.placeholder = placeholder.label;

      field.appendChild(label);
      field.appendChild(inputEl);
      fillFieldsEl?.appendChild(field);
    });
    if (fillTitleEl) fillTitleEl.textContent = "Fill placeholders";
    if (fillSubtitleEl) fillSubtitleEl.textContent = activePrompt?.name || "";
    showFillPanel();
    const firstInput = fillFieldsEl?.querySelector("input");
    firstInput?.focus();
  }

  function renderGroups(filterText = "") {
    clearElement(listEl);
    hideDuplicates();
    hideFillPanel();

    const query = filterText.trim().toLowerCase();
    const filtered = query
      ? groups.filter((group) => {
          const inName = group.name.toLowerCase().includes(query);
          const inDesc = group.prompts.some((prompt) =>
            (prompt.description || "").toLowerCase().includes(query)
          );
          return inName || inDesc;
        })
      : groups;

    if (emptyEl) emptyEl.hidden = filtered.length > 0;

    filtered.forEach((group) => {
      const description =
        group.prompts.length > 1
          ? "Multiple variants"
          : group.prompts[0]?.description || group.prompts[0]?.template || "";
      const button = createPromptButton({
        name: group.name,
        description,
        count: group.prompts.length,
        onClick: () => handleGroupSelect(group),
      });
      listEl?.appendChild(button);
    });
  }

  function handleGroupSelect(group) {
    activePrompt = null;
    activePlaceholders = [];
    if (group.prompts.length === 1) {
      handlePromptSelect(group.prompts[0]);
      return;
    }
    if (duplicatesSection) duplicatesSection.hidden = false;
    clearElement(duplicatesListEl);
    group.prompts.forEach((prompt, index) => {
      const button = createVariantButton(prompt, index, () => handlePromptSelect(prompt));
      duplicatesListEl?.appendChild(button);
    });
  }

  function handlePromptSelect(prompt) {
    activePrompt = prompt;
    activePlaceholders = parsePlaceholders(prompt.template);
    if (activePlaceholders.length === 0) {
      onInsert?.(prompt.template || "", prompt);
      close();
      return;
    }
    renderPlaceholders();
  }

  function handleFillApply() {
    if (!activePrompt) return;
    const values = {};
    fillFieldsEl?.querySelectorAll("input[data-placeholder]")?.forEach((inputEl) => {
      values[inputEl.dataset.placeholder] = inputEl.value;
    });
    const filled = fillTemplate(activePrompt.template || "", values);
    onInsert?.(filled, activePrompt);
    close();
  }

  function handleFillCancel() {
    hideFillPanel();
  }

  function loadPrompts() {
    const raw = typeof getPrompts === "function" ? getPrompts() : DEFAULT_PROMPTS;
    const list = Array.isArray(raw) ? raw : [];
    const normalized = list.map(normalizePrompt);
    groups = groupPrompts(normalized);
    renderGroups(input?.value || "");
  }

  function close() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    hideFillPanel();
    hideDuplicates();
  }

  function open() {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    if (input) {
      input.value = "";
      input.focus();
    }
    loadPrompts();
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) close();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      if (fillPanel && !fillPanel.hidden) {
        hideFillPanel();
        return;
      }
      close();
    }
  }

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", handleOverlayClick);
  input?.addEventListener("input", (event) => renderGroups(event.target.value || ""));
  input?.addEventListener("keydown", handleKeydown);
  fillApplyBtn?.addEventListener("click", handleFillApply);
  fillCancelBtn?.addEventListener("click", handleFillCancel);

  return { open, close };
}
