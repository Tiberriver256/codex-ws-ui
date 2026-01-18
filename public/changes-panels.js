function countDiffLines(diffText) {
  if (typeof diffText !== "string") return { additions: 0, deletions: 0 };
  let additions = 0;
  let deletions = 0;
  diffText.split("\n").forEach((line) => {
    if (line.startsWith("+++") || line.startsWith("---")) return;
    if (line.startsWith("+")) additions += 1;
    if (line.startsWith("-")) deletions += 1;
  });
  return { additions, deletions };
}

function summarizeChanges(changes) {
  const totals = { files: changes.length, additions: 0, deletions: 0 };
  changes.forEach((change) => {
    const counts = countDiffLines(change.diff || "");
    totals.additions += counts.additions;
    totals.deletions += counts.deletions;
  });
  return totals;
}

function formatSummary(summary) {
  if (!summary || summary.files === 0) return "No local changes.";
  const fileLabel = summary.files === 1 ? "file" : "files";
  const lineLabel = summary.additions || summary.deletions
    ? ` • +${summary.additions} -${summary.deletions}`
    : "";
  return `${summary.files} ${fileLabel} changed${lineLabel}`;
}

export function createDiffPanel({ panel, closeBtn, listEl, emptyEl, changesStore }) {
  function render() {
    if (!listEl) return;
    const changes = changesStore?.getChanges?.() || [];
    listEl.innerHTML = "";
    if (!changes.length) {
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    changes.forEach((change) => {
      const entry = document.createElement("div");
      entry.className = "diff-entry";

      const heading = document.createElement("div");
      heading.className = "diff-heading";
      heading.textContent = `${change.kind || "update"}: ${change.path || ""}`;

      const pre = document.createElement("pre");
      pre.textContent = change.diff || "";

      entry.appendChild(heading);
      entry.appendChild(pre);
      listEl.appendChild(entry);
    });
  }

  function open() {
    render();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  changesStore?.subscribe?.(() => {
    if (!panel?.hidden) render();
  });

  return { open, close, refresh: render };
}

export function createReviewPanel({
  panel,
  closeBtn,
  summaryEl,
  listEl,
  emptyEl,
  applyResultEl,
  changesStore,
}) {
  function render() {
    if (!listEl) return;
    const changes = changesStore?.getChanges?.() || [];
    listEl.innerHTML = "";
    if (!changes.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (summaryEl) summaryEl.textContent = "";
      if (summaryEl) summaryEl.hidden = true;
      return;
    }
    if (emptyEl) emptyEl.hidden = true;

    const summary = summarizeChanges(changes);
    if (summaryEl) {
      summaryEl.textContent = formatSummary(summary);
      summaryEl.hidden = false;
    }

    changes.forEach((change) => {
      const row = document.createElement("div");
      row.className = "panel-row";

      const label = document.createElement("span");
      label.className = "panel-label";
      label.textContent = change.kind || "update";

      const counts = countDiffLines(change.diff || "");
      const stats = counts.additions || counts.deletions
        ? ` (+${counts.additions} -${counts.deletions})`
        : "";

      const value = document.createElement("span");
      value.className = "panel-value";
      value.textContent = `${change.path || ""}${stats}`;

      row.appendChild(label);
      row.appendChild(value);
      listEl.appendChild(row);
    });
  }

  function setApplyResult(message) {
    if (!applyResultEl) return;
    const text = typeof message === "string" ? message : "";
    applyResultEl.textContent = text;
    applyResultEl.hidden = !text;
  }

  function open() {
    render();
    if (panel) panel.hidden = false;
  }

  function close() {
    if (panel) panel.hidden = true;
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  changesStore?.subscribe?.(() => {
    if (!panel?.hidden) render();
  });

  return { open, close, refresh: render, setApplyResult };
}
