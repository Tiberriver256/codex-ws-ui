const THREAD_ID_DISPLAY_LENGTH = 25;

export function createThreadState({
  outputEl,
  threadSelector,
  threadIdDisplayLength = THREAD_ID_DISPLAY_LENGTH
}) {
  let currentThreadId = null;
  const threads = [];
  const threadOutputs = new Map();

  function getCurrentThreadId() {
    return currentThreadId;
  }

  function setCurrentThreadId(threadId) {
    currentThreadId = threadId;
  }

  function hasThread(threadId) {
    return threads.includes(threadId);
  }

  function ensureThread(threadId) {
    if (!threads.includes(threadId)) {
      threads.push(threadId);
    }
  }

  function updateThreadSelector() {
    threadSelector.innerHTML = '<option value="">Select a thread...</option>';

    threads.forEach((threadId) => {
      const option = document.createElement("option");
      option.value = threadId;
      option.textContent = threadId.substring(0, threadIdDisplayLength) + "...";
      if (threadId === currentThreadId) {
        option.selected = true;
      }
      threadSelector.appendChild(option);
    });
  }

  function saveCurrentOutput() {
    if (currentThreadId) {
      threadOutputs.set(currentThreadId, outputEl.innerHTML);
    }
  }

  function loadThreadOutput(threadId) {
    if (threadOutputs.has(threadId)) {
      outputEl.innerHTML = threadOutputs.get(threadId);
    } else {
      outputEl.innerHTML = "";
    }
    outputEl.scrollTop = outputEl.scrollHeight;
  }

  function clearOutput() {
    outputEl.innerHTML = "";
  }

  function setThreadOutput(threadId, html) {
    threadOutputs.set(threadId, html);
  }

  function replaceThreadId(tempId, realId) {
    const tempIndex = threads.indexOf(tempId);
    if (tempIndex !== -1) {
      threads.splice(tempIndex, 1, realId);
    } else if (!threads.includes(realId)) {
      threads.push(realId);
    }
    if (threadOutputs.has(tempId)) {
      threadOutputs.set(realId, threadOutputs.get(tempId));
      threadOutputs.delete(tempId);
    }
    if (currentThreadId === tempId) {
      currentThreadId = realId;
    }
  }

  function switchThread(threadId) {
    if (threadId && threadId !== currentThreadId) {
      saveCurrentOutput();
      currentThreadId = threadId;
      loadThreadOutput(threadId);
      return true;
    }
    return false;
  }

  return {
    clearOutput,
    ensureThread,
    getCurrentThreadId,
    hasThread,
    loadThreadOutput,
    replaceThreadId,
    saveCurrentOutput,
    setCurrentThreadId,
    setThreadOutput,
    switchThread,
    updateThreadSelector
  };
}
