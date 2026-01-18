const THREAD_ID_DISPLAY_LENGTH = 25;

export function createThreadState({
  outputEl,
  threadSelector,
  threadIdDisplayLength = THREAD_ID_DISPLAY_LENGTH
}) {
  let currentThreadId = null;
  const threads = [];
  const threadOutputs = new Map();
  let threadBadgeProvider = () => "";

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
      const baseLabel = threadId.substring(0, threadIdDisplayLength) + "...";
      const badges = threadBadgeProvider(threadId);
      option.textContent = badges ? `${baseLabel} ${badges}` : baseLabel;
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

  function setThreadBadgeProvider(fn) {
    if (typeof fn === "function") {
      threadBadgeProvider = fn;
    }
  }

  function getThreads() {
    return [...threads];
  }

  function setThreads(threadIds = [], currentId = null) {
    threads.length = 0;
    if (Array.isArray(threadIds)) {
      threads.push(...threadIds);
    }
    currentThreadId = currentId || threads[0] || null;
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
    getThreads,
    hasThread,
    loadThreadOutput,
    replaceThreadId,
    saveCurrentOutput,
    setThreadBadgeProvider,
    setCurrentThreadId,
    setThreadOutput,
    setThreads,
    switchThread,
    updateThreadSelector
  };
}
