const SAMPLE_CHANGES = [
  {
    path: "public/app.js",
    kind: "modify",
    diff: "diff --git a/public/app.js b/public/app.js\nindex 1111111..2222222 100644\n--- a/public/app.js\n+++ b/public/app.js\n@@ -1,3 +1,4 @@\n-import { createUiRenderer } from \"./ui-renderer.js\";\n+import { createUiRenderer } from \"./ui-renderer.js\";\n+import { createCommandPalette } from \"./command-palette.js\";\n",
  },
  {
    path: "public/styles.css",
    kind: "modify",
    diff: "diff --git a/public/styles.css b/public/styles.css\nindex 3333333..4444444 100644\n--- a/public/styles.css\n+++ b/public/styles.css\n@@ -120,3 +120,6 @@\n .panel-inline {\n   display: flex;\n }\n+.command-item {\n+  border-radius: 12px;\n+}\n",
  },
];

function cloneChanges(changes) {
  return (changes || []).map((change) => ({ ...change }));
}

export function createChangesStore({ initialChanges } = {}) {
  let localChanges = Array.isArray(initialChanges) ? cloneChanges(initialChanges) : [];
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(localChanges));
  }

  function setLocalChanges(value) {
    if (value === true || value === undefined) {
      localChanges = cloneChanges(SAMPLE_CHANGES);
    } else if (Array.isArray(value)) {
      localChanges = cloneChanges(value);
    } else if (value && typeof value === "object") {
      const payload = Array.isArray(value.files)
        ? value.files
        : Array.isArray(value.changes)
          ? value.changes
          : [];
      localChanges = cloneChanges(payload);
    } else {
      localChanges = [];
    }
    notify();
  }

  function getChanges() {
    return cloneChanges(localChanges);
  }

  function hasLocalChanges() {
    return localChanges.length > 0;
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    getChanges,
    hasLocalChanges,
    setLocalChanges,
    subscribe,
  };
}

export { SAMPLE_CHANGES };
