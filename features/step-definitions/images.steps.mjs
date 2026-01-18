import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

const base64Png =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgS8Z9ZQAAAAASUVORK5CYII=';

function sampleImageFile() {
  return {
    name: 'sample.png',
    mimeType: 'image/png',
    buffer: Buffer.from(base64Png, 'base64')
  };
}

async function attachImageViaPicker(world) {
  await ensureConnected(world);
  const file = sampleImageFile();
  await world.page.setInputFiles('#imageFileInput', file);
}

async function dragDropImage(world) {
  await ensureConnected(world);
  const file = sampleImageFile();
  await world.page.evaluate(
    ({ selector, name, mimeType, base64 }) => {
      const dropzone = document.querySelector(selector);
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const data = new File([bytes], name, { type: mimeType });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(data);
      const dragEnter = new DragEvent('dragenter', { bubbles: true, dataTransfer });
      const dragOver = new DragEvent('dragover', { bubbles: true, dataTransfer });
      const drop = new DragEvent('drop', { bubbles: true, dataTransfer });
      dropzone.dispatchEvent(dragEnter);
      dropzone.dispatchEvent(dragOver);
      dropzone.dispatchEvent(drop);
    },
    {
      selector: '#imageDropzone',
      name: file.name,
      mimeType: file.mimeType,
      base64: base64Png
    }
  );
}

When('I attach an image file', async function () {
  await attachImageViaPicker(this);
});

When('I drag and drop an image file', async function () {
  await dragDropImage(this);
});

Then('the image appears as a thumbnail', async function () {
  await ensureConnected(this);
  const thumbs = this.page.locator('[data-image-thumb="true"]');
  await expect(thumbs).toHaveCount(1);
});

When('I send a prompt with text and an image', async function () {
  await attachImageViaPicker(this);
  const prompt = 'Describe the image.';
  this.sentText = prompt;
  await this.page.locator('#prompt').fill(prompt);
  await this.page.locator('button[type="submit"]').click();
});

Then('the request includes both text and local_image inputs', async function () {
  await this.page.waitForFunction(() => Boolean(window.__TEST__?.lastSentPayload));
  const payload = await this.page.evaluate(() => window.__TEST__?.lastSentPayload || null);
  expect(payload?.type).toBe('message');
  expect(payload?.text).toBe(this.sentText);
  expect(Array.isArray(payload?.inputs)).toBe(true);
  const inputs = payload.inputs || [];
  const textInput = inputs.find((entry) => entry.type === 'text');
  const imageInput = inputs.find((entry) => entry.type === 'local_image');
  expect(textInput?.text).toBe(this.sentText);
  expect(imageInput?.name).toBe('sample.png');
  expect(imageInput?.mimeType).toBe('image/png');
  expect(typeof imageInput?.dataUrl).toBe('string');
  expect(imageInput?.dataUrl?.startsWith('data:image/png')).toBe(true);
});
