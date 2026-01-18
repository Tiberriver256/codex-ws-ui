const FILE_TYPE_PREFIX = "image/";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function createImageInput({ inputEl, dropzoneEl, thumbsEl, placeholderEl }) {
  const attachments = [];

  function setPlaceholderVisibility() {
    if (!placeholderEl) return;
    placeholderEl.hidden = attachments.length > 0;
  }

  function renderThumbs() {
    thumbsEl.innerHTML = "";
    for (const attachment of attachments) {
      const item = document.createElement("div");
      item.className = "image-input__thumb";
      item.dataset.imageThumb = "true";
      item.title = attachment.name;

      const img = document.createElement("img");
      img.src = attachment.dataUrl;
      img.alt = attachment.name;

      item.appendChild(img);
      thumbsEl.appendChild(item);
    }
    setPlaceholderVisibility();
  }

  async function addFiles(files) {
    const incoming = Array.from(files || []).filter((file) =>
      (file?.type || "").startsWith(FILE_TYPE_PREFIX)
    );
    if (!incoming.length) return;
    const prepared = await Promise.all(
      incoming.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          name: file.name || "image",
          mimeType: file.type || "application/octet-stream",
          dataUrl
        };
      })
    );
    attachments.push(...prepared);
    renderThumbs();
  }

  async function onFileInputChange(event) {
    const files = event.target?.files;
    await addFiles(files);
    if (event.target) {
      event.target.value = "";
    }
  }

  function handleDrag(event) {
    event.preventDefault();
    dropzoneEl.classList.add("is-dragover");
  }

  function handleDragLeave(event) {
    event.preventDefault();
    const related = event.relatedTarget;
    if (related && dropzoneEl.contains(related)) return;
    dropzoneEl.classList.remove("is-dragover");
  }

  async function handleDrop(event) {
    event.preventDefault();
    dropzoneEl.classList.remove("is-dragover");
    const files = event.dataTransfer?.files;
    await addFiles(files);
  }

  inputEl.addEventListener("change", onFileInputChange);
  dropzoneEl.addEventListener("dragenter", handleDrag);
  dropzoneEl.addEventListener("dragover", handleDrag);
  dropzoneEl.addEventListener("dragleave", handleDragLeave);
  dropzoneEl.addEventListener("drop", handleDrop);
  dropzoneEl.addEventListener("click", () => inputEl.click());

  setPlaceholderVisibility();

  return {
    getAttachments() {
      return attachments.map((item) => ({ ...item }));
    },
    clear() {
      attachments.splice(0, attachments.length);
      renderThumbs();
    },
    hasAttachments() {
      return attachments.length > 0;
    }
  };
}
