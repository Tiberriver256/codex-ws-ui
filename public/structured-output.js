function stringifyStructuredOutput(data) {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return "";
    try {
      return JSON.stringify(JSON.parse(trimmed), null, 2);
    } catch {
      return trimmed;
    }
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

async function copyText(text) {
  const testState = window.__TEST__ || null;
  if (testState) testState.lastCopiedStructuredOutput = text;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy copy
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  if (window.__TEST__) {
    window.__TEST__.lastDownloadedStructuredOutput = { text, filename };
  }
}

export function createStructuredOutputCard({ data, title } = {}) {
  const jsonText = stringifyStructuredOutput(data);
  const card = document.createElement("div");
  card.className = "structured-output-card";
  card.dataset.structuredOutput = "true";

  const header = document.createElement("div");
  header.className = "structured-output-header";

  const heading = document.createElement("div");
  heading.className = "structured-output-title";
  heading.textContent = title || "Structured Output";

  const actions = document.createElement("div");
  actions.className = "structured-output-actions";

  const copyBtn = document.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "ghost-btn";
  copyBtn.textContent = "Copy";
  copyBtn.dataset.structuredAction = "copy";

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = "ghost-btn";
  downloadBtn.textContent = "Download";
  downloadBtn.dataset.structuredAction = "download";

  actions.appendChild(copyBtn);
  actions.appendChild(downloadBtn);
  header.appendChild(heading);
  header.appendChild(actions);

  const pre = document.createElement("pre");
  pre.className = "structured-output-json";
  pre.textContent = jsonText;

  copyBtn.addEventListener("click", () => {
    copyText(jsonText);
  });

  downloadBtn.addEventListener("click", () => {
    const suffix = new Date().toISOString().slice(0, 10);
    downloadText(jsonText, `structured-output-${suffix}.json`);
  });

  card.appendChild(header);
  card.appendChild(pre);

  return card;
}
