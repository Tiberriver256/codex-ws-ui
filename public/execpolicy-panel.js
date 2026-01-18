function formatTimestamp(ts) {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

export function createExecPolicyPanel({ panel, closeBtn, rulesStore, elements }) {
  const {
    rulesListEl,
    emptyStateEl,
    previewInput,
    previewResult,
    previewBtn,
  } = elements;

  function renderRules() {
    if (!rulesListEl) return;
    const rules = rulesStore?.getRules?.() || [];
    rulesListEl.innerHTML = "";

    if (!rules.length) {
      if (emptyStateEl) emptyStateEl.hidden = false;
    } else if (emptyStateEl) {
      emptyStateEl.hidden = true;
    }

    rules.forEach((rule) => {
      const item = document.createElement("div");
      item.className = "execpolicy-rule";

      const title = document.createElement("div");
      title.className = "execpolicy-rule-title";
      title.textContent = rule.label || rule.action;

      const meta = document.createElement("div");
      meta.className = "execpolicy-rule-meta";
      const source = rule.source ? `source: ${rule.source}` : "source: user";
      const time = rule.createdAt ? formatTimestamp(rule.createdAt) : "Unknown";
      meta.textContent = `${rule.action} • ${source} • ${time}`;

      item.appendChild(title);
      item.appendChild(meta);
      rulesListEl.appendChild(item);
    });
  }

  function renderPreview() {
    if (!previewInput || !previewResult) return;
    const action = previewInput.value.trim();
    if (!action) {
      previewResult.textContent = "Enter an action to preview.";
      previewResult.dataset.previewState = "empty";
      return;
    }
    const match = rulesStore?.matchAction?.(action);
    if (match) {
      previewResult.textContent = `Allowed by rule: ${match.label || match.action}`;
      previewResult.dataset.previewState = "allow";
    } else {
      previewResult.textContent = "No matching rule. Approval required.";
      previewResult.dataset.previewState = "deny";
    }
  }

  function open() {
    renderRules();
    renderPreview();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);

  if (previewInput) {
    previewInput.addEventListener("input", renderPreview);
  }

  if (previewBtn) {
    previewBtn.addEventListener("click", renderPreview);
  }

  if (rulesStore?.subscribe) {
    rulesStore.subscribe(() => {
      if (!panel?.hidden) {
        renderRules();
        renderPreview();
      }
    });
  }

  return {
    open,
    close,
    refresh: () => {
      renderRules();
      renderPreview();
    },
  };
}
