export function createWsClient({
  statusDot,
  statusText,
  promptInput,
  submitBtn,
  threadSelector,
  newThreadBtn,
  threadOptionsBtn,
  addSystemMessage,
  onEvent,
  onPlainMessage
}) {
  let ws;

  function connect() {
    const wsProtocol = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(wsProtocol + "://" + location.host);

    ws.onopen = () => {
      statusDot.classList.remove("disconnected");
      statusText.textContent = "Connected";
      promptInput.disabled = false;
      submitBtn.disabled = false;
      threadSelector.disabled = false;
      newThreadBtn.disabled = false;
      threadOptionsBtn.disabled = false;
      promptInput.focus();
      addSystemMessage("Connected to server");
    };

    ws.onclose = () => {
      statusDot.classList.add("disconnected");
      statusText.textContent = "Disconnected";
      promptInput.disabled = true;
      submitBtn.disabled = true;
      threadSelector.disabled = true;
      newThreadBtn.disabled = true;
      threadOptionsBtn.disabled = true;
      addSystemMessage("Disconnected from server");
    };

    ws.onerror = () => {
      addSystemMessage("WebSocket error occurred", "error");
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onEvent(data);
      } catch (err) {
        onPlainMessage(e.data);
      }
    };
  }

  function send(payload) {
    if (ws) {
      ws.send(JSON.stringify(payload));
    }
  }

  return { connect, send };
}
