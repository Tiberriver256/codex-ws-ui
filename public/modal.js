export function createModalController({ overlay, titleEl, messageEl, actionsEl }) {
  if (!overlay || !titleEl || !messageEl || !actionsEl) {
    return {
      async open() {
        return null;
      },
      async confirm({ message }) {
        return window.confirm(message || "Are you sure?");
      },
      close() {},
    };
  }

  let resolver = null;

  function clearActions() {
    while (actionsEl.firstChild) actionsEl.removeChild(actionsEl.firstChild);
  }

  function close(result) {
    overlay.hidden = true;
    overlay.setAttribute("aria-hidden", "true");
    clearActions();
    const resolve = resolver;
    resolver = null;
    if (resolve) resolve(result);
  }

  function open({ title, message, actions }) {
    titleEl.textContent = title || "Confirm";
    messageEl.textContent = message || "";
    clearActions();
    overlay.hidden = false;
    overlay.setAttribute("aria-hidden", "false");

    return new Promise((resolve) => {
      resolver = resolve;
      (actions || []).forEach((action) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = action.label;
        button.dataset.modalAction = action.value;
        if (action.variant === "danger") {
          button.classList.add("danger-btn");
        } else if (action.variant === "ghost") {
          button.classList.add("ghost-btn");
        }
        button.addEventListener("click", () => close(action.value));
        actionsEl.appendChild(button);
      });
    });
  }

  async function confirm({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
    const result = await open({
      title,
      message,
      actions: [
        { label: cancelLabel, value: "cancel", variant: "ghost" },
        { label: confirmLabel, value: "confirm" },
      ],
    });
    return result === "confirm";
  }

  return { open, confirm, close };
}
