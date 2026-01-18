import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

const LOG_FIXTURE = [
  '[info] tailing ~/.codex/log',
  '[info] 2025-01-15T00:00:00Z session started'
].join('\n');

Given('a session has completed', async function () {
  await ensureConnected(this);
  const input = this.page.locator('#prompt');
  const sendButton = this.page.locator('button[type="submit"]');
  const prompt = 'Observability export check';
  await input.fill(prompt);
  await sendButton.click();
  this.exportPrompt = prompt;
  await expect(this.page.locator('.message.usage')).toBeVisible({ timeout: 10000 });
});

When('I export the transcript', async function () {
  await this.page.locator('#observabilityPanelBtn').click();
  await expect(this.page.locator('#observabilityPanel')).toBeVisible();
  await this.page.locator('#observabilityExportBtn').click();
  await this.page.waitForFunction(() => Boolean(window.__TEST__?.observability?.lastExport));
});

Then('I receive a JSONL file', async function () {
  const exportInfo = await this.page.evaluate(() => window.__TEST__?.observability?.lastExport || null);
  expect(exportInfo?.text).toBeTruthy();
  expect(exportInfo?.filename).toMatch(/\.jsonl$/);
  const lines = exportInfo.text.split('\n').filter(Boolean);
  expect(lines.length).toBeGreaterThan(0);
  const parsed = lines.map((line) => JSON.parse(line));
  if (this.exportPrompt) {
    const hasPrompt = parsed.some((entry) => entry.text?.includes(this.exportPrompt));
    expect(hasPrompt).toBeTruthy();
  }
});

When('I open the logs viewer', async function () {
  await ensureConnected(this);
  await this.page.evaluate((logs) => {
    window.__TEST__?.setObservabilityLogs?.(logs);
    window.__TEST__?.setObservabilityLogPath?.('~/.codex/log');
  }, LOG_FIXTURE);
  await this.page.locator('#observabilityPanelBtn').click();
  await expect(this.page.locator('#observabilityPanel')).toBeVisible();
});

Then(/^I can read logs from (.+)$/, async function (path) {
  const logPath = this.page.locator('#observabilityLogPath');
  await expect(logPath).toHaveText(path);
  const logs = this.page.locator('#observabilityLogs');
  await expect(logs).toContainText(path);
});

Given('notifications are enabled', async function () {
  await ensureConnected(this);
  await this.page.locator('#observabilityPanelBtn').click();
  await expect(this.page.locator('#observabilityPanel')).toBeVisible();
  await this.page.evaluate(() => window.__TEST__?.clearObservabilityNotifications?.());
  const toggle = this.page.locator('#observabilityNotificationsToggle');
  await toggle.check();
  await expect(toggle).toBeChecked();
});

When('a turn completes or approval is needed', async function () {
  await this.page.evaluate(() => {
    window.__TEST__?.emitObservabilityTurnCompleted?.();
    window.__TEST__?.emitObservabilityApprovalRequest?.({
      action: 'workspace-write',
      label: 'Workspace write'
    });
  });
});

Then('I receive a browser notification', async function () {
  await this.page.waitForFunction(
    () => (window.__TEST__?.observability?.notifications || []).length > 0
  );
  const notifications = await this.page.evaluate(
    () => window.__TEST__?.observability?.notifications || []
  );
  expect(notifications.length).toBeGreaterThan(0);
});
