const DEFAULT_COMMANDS = [];

function normalizeCommand(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function createCommandButton(command, onRun) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "command-item";
  button.dataset.command = command.value;

  const label = document.createElement("span");
  label.className = "command-label";
  label.textContent = command.label || command.value;

  const description = document.createElement("span");
  description.className = "command-desc";
  description.textContent = command.description || "";

  const text = document.createElement("span");
  text.className = "command-text";
  text.appendChild(label);
  if (description.textContent) {
    text.appendChild(description);
  }

  button.appendChild(text);
  button.addEventListener("click", () => onRun(command.value));
  return button;
}

function renderCommandList({ listEl, commands, onRun }) {
  if (!listEl) return;
  listEl.innerHTML = "";
  (commands || []).forEach((command) => {
    listEl.appendChild(createCommandButton(command, onRun));
  });
}

export function createCommandPalette({
  overlay,
  closeBtn,
  input,
  listEl,
  advancedDetails,
  advancedListEl,
  commands = DEFAULT_COMMANDS,
  advancedCommands = DEFAULT_COMMANDS,
} = {}) {
  if (!overlay) {
    return {
      open() {},
      close() {},
      runCommand() {
        return false;
      },
    };
  }

  const commandMap = new Map();
  [...commands, ...advancedCommands].forEach((command) => {
    if (!command?.value) return;
    commandMap.set(command.value, command);
  });

  function close() {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
  }

  function open() {
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");
    if (advancedDetails) {
      advancedDetails.open = false;
    }
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  function runCommand(rawValue) {
    const normalized = normalizeCommand(rawValue);
    const command = commandMap.get(normalized);
    if (!command) return false;
    close();
    const result = command.action?.();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
    return true;
  }

  function handleInputKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      runCommand(input.value);
    }
  }

  function handleOverlayClick(event) {
    if (event.target === overlay) close();
  }

  if (closeBtn) closeBtn.addEventListener("click", close);
  if (input) input.addEventListener("keydown", handleInputKeydown);
  overlay.addEventListener("click", handleOverlayClick);

  renderCommandList({ listEl, commands, onRun: runCommand });
  renderCommandList({ listEl: advancedListEl, commands: advancedCommands, onRun: runCommand });

  return { open, close, runCommand };
}
