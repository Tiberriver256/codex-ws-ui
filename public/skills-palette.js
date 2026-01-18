const DEFAULT_SKILLS = [];

function normalizeSkill(skill, index) {
  const name = skill?.name || skill?.title || skill?.label || `Skill ${index + 1}`;
  const description = skill?.description || skill?.summary || skill?.details || "";
  const content =
    skill?.content ||
    skill?.instructions ||
    skill?.template ||
    skill?.prompt ||
    skill?.text ||
    "";
  const id = skill?.id || skill?.slug || skill?.path || `${name}-${index + 1}`;
  const source = skill?.source || skill?.path || "";
  return {
    id,
    name,
    description,
    content,
    source,
    raw: skill,
  };
}

function createSkillButton(skill, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "skill-item";
  button.dataset.skillId = skill.id;
  button.dataset.skillName = skill.name;

  const text = document.createElement("span");
  text.className = "skill-text";

  const label = document.createElement("span");
  label.className = "skill-label";
  label.textContent = skill.name;

  const desc = document.createElement("span");
  desc.className = "skill-desc";
  desc.textContent = skill.description || skill.source || "";

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

export function createSkillsPalette({
  overlay,
  closeBtn,
  input,
  listEl,
  emptyEl,
  previewPanel,
  previewTitleEl,
  previewMetaEl,
  previewBodyEl,
  insertBtn,
  getSkills = () => DEFAULT_SKILLS,
  onInsert,
} = {}) {
  if (!overlay) {
    return {
      open() {},
      close() {},
    };
  }

  let skills = [];
  let activeSkill = null;
  let buttonMap = new Map();

  function resetPreview() {
    activeSkill = null;
    if (previewTitleEl) previewTitleEl.textContent = "Select a skill";
    if (previewMetaEl) previewMetaEl.textContent = "";
    if (previewBodyEl) previewBodyEl.textContent = "";
    if (previewPanel) previewPanel.hidden = true;
    if (insertBtn) insertBtn.disabled = true;
    buttonMap.forEach((button) => button.classList.remove("is-selected"));
  }

  function renderPreview(skill) {
    if (previewTitleEl) previewTitleEl.textContent = skill.name || "Skill";
    if (previewMetaEl) {
      previewMetaEl.textContent = skill.description || skill.source || "";
    }
    if (previewBodyEl) {
      previewBodyEl.textContent = skill.content || "";
    }
    if (previewPanel) previewPanel.hidden = false;
    if (insertBtn) insertBtn.disabled = false;
  }

  function setActiveSkill(skill) {
    activeSkill = skill;
    buttonMap.forEach((button, id) => {
      button.classList.toggle("is-selected", id === skill.id);
    });
    renderPreview(skill);
  }

  function renderList(filterText = "") {
    clearElement(listEl);
    buttonMap = new Map();

    const query = filterText.trim().toLowerCase();
    const filtered = query
      ? skills.filter((skill) => {
          const inName = skill.name.toLowerCase().includes(query);
          const inDesc = (skill.description || "").toLowerCase().includes(query);
          const inContent = (skill.content || "").toLowerCase().includes(query);
          return inName || inDesc || inContent;
        })
      : skills;

    if (emptyEl) emptyEl.hidden = filtered.length > 0;

    filtered.forEach((skill) => {
      const button = createSkillButton(skill, () => setActiveSkill(skill));
      if (activeSkill?.id === skill.id) {
        button.classList.add("is-selected");
      }
      listEl?.appendChild(button);
      buttonMap.set(skill.id, button);
    });
  }

  function loadSkills() {
    const raw = typeof getSkills === "function" ? getSkills() : DEFAULT_SKILLS;
    const list = Array.isArray(raw) ? raw : [];
    skills = list.map(normalizeSkill);
    renderList(input?.value || "");
  }

  function handleInsert() {
    if (!activeSkill) return;
    onInsert?.(activeSkill.content || "", activeSkill);
    close();
  }

  function close() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function open() {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    if (input) {
      input.value = "";
      input.focus();
    }
    resetPreview();
    loadSkills();
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) close();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }

  closeBtn?.addEventListener("click", close);
  overlay.addEventListener("click", handleOverlayClick);
  input?.addEventListener("input", (event) => renderList(event.target.value || ""));
  input?.addEventListener("keydown", handleKeydown);
  insertBtn?.addEventListener("click", handleInsert);

  return { open, close };
}
