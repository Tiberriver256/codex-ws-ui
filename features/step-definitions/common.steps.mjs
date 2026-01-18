import { Given, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected, openApp, ensureAdvancedOptionsOpen } from '../support/ui.mjs';

async function ensureOptionsPanelOpen(world) {
  const panel = world.page.locator('#threadOptionsPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#threadOptionsBtn').click();
    await expect(world.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  }
}

Given('the app is running in mock mode', async function () {
  await openApp(this);
  const mockMode = await this.page.evaluate(() => window.__APP_CONFIG__?.mockMode);
  expect(mockMode).toBeTruthy();
});

Given('I am connected', async function () {
  await openApp(this);
});

When('I open the app', async function () {
  await openApp(this);
});

When('I send {string}', async function (text) {
  await ensureConnected(this);
  const input = this.page.locator('#prompt');
  const sendButton = this.page.locator('button[type="submit"]');
  await input.fill(text);
  await sendButton.click();
  this.sentPrompts.push(text);
});

When('I open new thread options', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
});

When('I open thread settings', async function () {
  await ensureConnected(this);
  await this.page.locator('#threadOptionsBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
});

When('I create the thread', async function () {
  await this.page.locator('#applyOptionsBtn').click();
});

When('I apply thread settings', async function () {
  await this.page.locator('#applyOptionsBtn').click();
});

Given('I create a new thread with options', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /New thread created:/ })).toBeVisible({ timeout: 5000 });
  this.pendingThreadIds = await this.page.$$eval('#threadSelector option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
});

Given('I have an active thread', async function () {
  await ensureConnected(this);
  const input = this.page.locator('#prompt');
  const sendButton = this.page.locator('button[type="submit"]');
  await input.fill('Start thread for options update');
  await sendButton.click();
  await expect(this.page.locator('.message.usage')).toBeVisible({ timeout: 10000 });
});

When('I set model to {string}', async function (model) {
  await ensureOptionsPanelOpen(this);
  await this.page.locator('#threadModel').selectOption(model);
  this.selectedModel = model;
});

When('I set reasoning effort to {string}', async function (effort) {
  await ensureOptionsPanelOpen(this);
  await this.page.locator('#threadReasoning').selectOption(effort);
  this.selectedReasoning = effort;
});

When('I set sandbox mode to {string}', async function (mode) {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadSandbox').selectOption(mode);
  this.selectedSandbox = mode;
});

When('I enable network access', async function () {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('on');
  this.selectedNetwork = 'on';
});

When('I enable web search', async function () {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadWebSearch').selectOption('on');
  this.selectedSearch = 'on';
});

When('I set approval policy to {string}', async function (policy) {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadApproval').selectOption(policy);
  this.selectedApproval = policy;
});

When('I create a new thread with model {string}', async function (model) {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await this.page.locator('#threadModel').selectOption(model);
  this.selectedModel = model;
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
});

When('I create a new thread with reasoning effort {string}', async function (effort) {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await this.page.locator('#threadReasoning').selectOption(effort);
  this.selectedReasoning = effort;
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
});
