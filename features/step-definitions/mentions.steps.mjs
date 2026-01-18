import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

async function setWorkspaceFiles(world, files) {
  await ensureConnected(world);
  world.workspaceFiles = files;
  await world.page.evaluate((data) => {
    window.__TEST__?.setWorkspaceFiles?.(data);
  }, files);
}

When('I type {string} in the prompt', async function (text) {
  await ensureConnected(this);
  const input = this.page.locator('#prompt');
  await input.fill('');
  await input.type(text);
});

Then('a file search list appears', async function () {
  await expect(this.page.locator('#mentions')).toBeVisible({ timeout: 5000 });
});

Given('the workspace contains files', async function () {
  const files = ['src/app.js', 'src/styles.css', 'README.md', 'public/index.html'];
  await setWorkspaceFiles(this, files);
});

When('I search for a filename', async function () {
  await ensureConnected(this);
  this.searchTerm = 'app';
  const input = this.page.locator('#prompt');
  await input.fill('');
  await input.type(`@${this.searchTerm}`);
});

Then('matching files are shown', async function () {
  const matches = (this.workspaceFiles || []).filter((file) =>
    file.toLowerCase().includes((this.searchTerm || '').toLowerCase())
  );
  for (const file of matches) {
    await expect(this.page.locator(`#mentionsList [data-file-path="${file}"]`)).toBeVisible();
  }
  const nonMatches = (this.workspaceFiles || []).filter(
    (file) => !file.toLowerCase().includes((this.searchTerm || '').toLowerCase())
  );
  if (nonMatches.length) {
    await expect(this.page.locator(`#mentionsList [data-file-path="${nonMatches[0]}"]`)).toHaveCount(0);
  }
});

Given('the file search list is open', async function () {
  const files = ['src/components/Button.js', 'public/app.js'];
  await setWorkspaceFiles(this, files);
  const input = this.page.locator('#prompt');
  await input.fill('');
  await input.type('@');
  await expect(this.page.locator('#mentions')).toBeVisible({ timeout: 5000 });
});

When('I select a file', async function () {
  this.selectedFile = this.workspaceFiles?.[0];
  await this.page.locator(`#mentionsList [data-file-path="${this.selectedFile}"]`).click();
});

Then('the file path is inserted into the prompt', async function () {
  await expect(this.page.locator('#prompt')).toHaveValue(this.selectedFile || '');
});
