const DEFAULT_MAX_RESULTS = 30;

function normalizeFiles(files) {
  if (!Array.isArray(files)) return [];
  return files
    .map((file) => String(file || "").trim())
    .filter(Boolean);
}

function findMention(value, caret) {
  if (!value) return null;
  const safeCaret = Number.isFinite(caret) ? caret : value.length;
  const uptoCaret = value.slice(0, safeCaret);
  const atIndex = uptoCaret.lastIndexOf("@");
  if (atIndex < 0) return null;
  const charBefore = value[atIndex - 1];
  if (charBefore && !/\s/.test(charBefore)) return null;
  const query = value.slice(atIndex + 1, safeCaret);
  if (/\s/.test(query)) return null;
  return { start: atIndex, end: safeCaret, query };
}

function createMentionButton(path, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mention-item";
  button.dataset.filePath = path;

  const label = document.createElement("span");
  label.className = "mention-path";
  label.textContent = path;

  button.appendChild(label);
  button.addEventListener("click", () => onSelect(path));
  return button;
}

export function createMentions({
  inputEl,
  containerEl,
  listEl,
  emptyEl,
  getFiles,
  maxResults = DEFAULT_MAX_RESULTS
} = {}) {
  if (!inputEl || !containerEl || !listEl) {
    return {
      open() {},
      close() {},
      refresh() {},
    };
  }

  let mentionState = null;
  let isOpen = false;

  function setHidden(hidden) {
    containerEl.hidden = hidden;
    containerEl.setAttribute("aria-hidden", hidden ? "true" : "false");
    isOpen = !hidden;
  }

  function close() {
    setHidden(true);
    mentionState = null;
  }

  function open() {
    setHidden(false);
  }

  function insertPath(path) {
    if (!mentionState) return;
    const value = inputEl.value || "";
    const before = value.slice(0, mentionState.start);
    const after = value.slice(mentionState.end);
    const nextValue = `${before}${path}${after}`;
    inputEl.value = nextValue;
    const cursor = before.length + path.length;
    inputEl.focus();
    inputEl.setSelectionRange(cursor, cursor);
    close();
  }

  function renderList(paths) {
    listEl.innerHTML = "";
    const entries = paths.slice(0, maxResults);
    entries.forEach((path) => {
      listEl.appendChild(createMentionButton(path, insertPath));
    });
    if (emptyEl) {
      emptyEl.hidden = entries.length > 0;
    }
  }

  function updateFromInput() {
    if (inputEl.disabled) {
      close();
      return;
    }
    const match = findMention(inputEl.value || "", inputEl.selectionStart);
    if (!match) {
      close();
      return;
    }
    mentionState = match;
    const files = normalizeFiles(getFiles?.());
    const query = match.query.toLowerCase();
    const matches = query
      ? files.filter((file) => file.toLowerCase().includes(query))
      : files;
    renderList(matches);
    open();
  }

  function handleKeydown(event) {
    if (!isOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  function handleDocumentClick(event) {
    if (!isOpen) return;
    const target = event.target;
    if (target === inputEl) return;
    if (containerEl.contains(target)) return;
    close();
  }

  inputEl.addEventListener("input", updateFromInput);
  inputEl.addEventListener("click", updateFromInput);
  inputEl.addEventListener("keydown", handleKeydown);
  document.addEventListener("click", handleDocumentClick);

  setHidden(true);

  return {
    open,
    close,
    refresh: updateFromInput,
  };
}
