export function createApprovalUi({ uiRenderer, rulesStore, container } = {}) {
  const addMessage = uiRenderer?.addMessage;
  let activeRequest = null;

  function removeActive() {
    if (activeRequest?.wrapper && activeRequest.wrapper.parentNode) {
      activeRequest.wrapper.parentNode.removeChild(activeRequest.wrapper);
    }
    activeRequest = null;
  }

  function buildDetailRow(label, value) {
    const row = document.createElement("div");
    row.className = "approval-detail";

    const labelEl = document.createElement("span");
    labelEl.className = "approval-label";
    labelEl.textContent = label;

    const valueEl = document.createElement("span");
    valueEl.className = "approval-value";
    valueEl.textContent = value;

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  function renderApprovalCard(request = {}) {
    const card = document.createElement("div");
    card.className = "approval-card";

    const header = document.createElement("div");
    header.className = "approval-header";

    const title = document.createElement("h3");
    title.textContent = request.title || "Approval required";

    const subtitle = document.createElement("p");
    subtitle.textContent = request.subtitle || "Review the details before proceeding.";

    header.appendChild(title);
    header.appendChild(subtitle);

    const prompt = document.createElement("div");
    prompt.className = "approval-prompt";
    prompt.textContent = request.prompt || "Allow this action?";

    const details = document.createElement("div");
    details.className = "approval-details";

    const rows = Array.isArray(request.details) && request.details.length
      ? request.details
      : [
          { label: "Action", value: request.label || request.action || "Unknown" },
          { label: "Risk", value: request.risk || "Sensitive operation" },
          { label: "Policy", value: request.policy || "on-request" },
        ];

    rows.forEach((row) => {
      details.appendChild(buildDetailRow(row.label, row.value));
    });

    const actions = document.createElement("div");
    actions.className = "approval-actions";

    const denyBtn = document.createElement("button");
    denyBtn.type = "button";
    denyBtn.className = "ghost-btn";
    denyBtn.dataset.approvalAction = "deny";
    denyBtn.textContent = "Deny";

    const approveBtn = document.createElement("button");
    approveBtn.type = "button";
    approveBtn.dataset.approvalAction = "approve";
    approveBtn.textContent = "Approve";

    const alwaysBtn = document.createElement("button");
    alwaysBtn.type = "button";
    alwaysBtn.className = "ghost-btn";
    alwaysBtn.dataset.approvalAction = "always";
    alwaysBtn.textContent = "Always allow";

    actions.appendChild(denyBtn);
    actions.appendChild(approveBtn);
    actions.appendChild(alwaysBtn);

    card.appendChild(header);
    card.appendChild(prompt);
    card.appendChild(details);
    card.appendChild(actions);

    return { card, actions: { denyBtn, approveBtn, alwaysBtn } };
  }

  function requestApproval(request = {}) {
    const action = String(request.action || "").trim() || "unknown";
    const rule = rulesStore?.matchAction?.(action);
    if (rule) {
      return Promise.resolve({ decision: "approve", viaRule: true, rule, action });
    }

    if (activeRequest?.resolve) {
      activeRequest.resolve({ decision: "deny", superseded: true, action: activeRequest.action });
      removeActive();
    }

    const { card, actions } = renderApprovalCard({ ...request, action });

    let wrapper = null;
    if (typeof addMessage === "function") {
      wrapper = addMessage(card, "assistant", true);
    } else if (container) {
      container.appendChild(card);
      wrapper = card;
    } else {
      document.body.appendChild(card);
      wrapper = card;
    }

    if (wrapper) {
      wrapper.classList.add("approval-message");
    }

    return new Promise((resolve) => {
      const finalize = (decision) => {
        resolve({ decision, action });
        removeActive();
      };

      actions.approveBtn.addEventListener("click", () => finalize("approve"));
      actions.denyBtn.addEventListener("click", () => finalize("deny"));
      actions.alwaysBtn.addEventListener("click", () => finalize("always"));

      activeRequest = { resolve, wrapper, action };
    });
  }

  return {
    requestApproval,
    clear: removeActive,
  };
}
