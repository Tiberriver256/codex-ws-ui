import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { assistantMessageLocator, usageMessageLocator } from '../support/ui.mjs';

Then('I see an assistant message with content', async function () {
  const agentMessage = assistantMessageLocator(this.page).first();
  await expect(agentMessage).toBeVisible({ timeout: 10000 });
  const text = await agentMessage.textContent();
  expect(text?.length || 0).toBeGreaterThan(10);
});

Then('the assistant message includes {string}', async function (text) {
  const agentMessage = assistantMessageLocator(this.page).first();
  await expect(agentMessage).toContainText(text, { timeout: 10000 });
});

Then('I see a reasoning message', async function () {
  const reasoningMessage = this.page.locator('.message.reasoning');
  await expect(reasoningMessage).toBeVisible({ timeout: 10000 });
  await expect(reasoningMessage).toContainText('\u{1F914}');
});

Then('the reasoning message includes {string}', async function (text) {
  const reasoningMessage = this.page.locator('.message.reasoning');
  await expect(reasoningMessage).toContainText(text, { timeout: 10000 });
});

Then('I see a todo list update', async function () {
  const todoMessage = this.page.locator('.message.todo').first();
  await expect(todoMessage).toBeVisible({ timeout: 10000 });
  await expect(todoMessage).toContainText('\u{1F4CB}');
});

Then('I see a usage message', async function () {
  const usageMessage = usageMessageLocator(this.page).first();
  await expect(usageMessage).toBeVisible({ timeout: 10000 });
});

Then('the usage message includes {string}', async function (text) {
  const usageMessage = usageMessageLocator(this.page).first();
  await expect(usageMessage).toContainText(text, { timeout: 10000 });
});

Then('I see a command execution message', async function () {
  const commandMessage = this.page.locator('.message.command');
  await expect(commandMessage).toBeVisible({ timeout: 10000 });
  await expect(commandMessage).toContainText('\u26A1');
});

Then('the command execution includes {string}', async function (text) {
  const commandMessage = this.page.locator('.message.command');
  await expect(commandMessage).toContainText(text, { timeout: 10000 });
});

Then('I see a file change message', async function () {
  const fileMessage = this.page.locator('.message.file-change');
  await expect(fileMessage).toBeVisible({ timeout: 10000 });
  await expect(fileMessage).toContainText('\u{1F4DD}');
});

Then('the file change includes a unified diff', async function () {
  const fileMessage = this.page.locator('.message.file-change');
  await expect(fileMessage).toContainText('@@', { timeout: 10000 });
});

Then('I see the assistant message stream in', async function () {
  const agentMessage = assistantMessageLocator(this.page).first();
  await expect(agentMessage).toBeVisible({ timeout: 10000 });
});

Then('the final assistant message has content', async function () {
  const agentMessage = assistantMessageLocator(this.page).first();
  await expect(agentMessage).toBeVisible({ timeout: 10000 });
  const text = await agentMessage.textContent();
  expect(text?.length || 0).toBeGreaterThan(10);
});

Then('I see a user message starting with {string}', async function (prefix) {
  const userMessage = this.page.locator('.message.user').first();
  await expect(userMessage).toBeVisible({ timeout: 10000 });
  await expect(userMessage).toContainText(prefix, { timeout: 10000 });
});

Then('I see a processing message', async function () {
  const processingMessage = this.page.locator('.message').filter({ hasText: 'Processing...' });
  await expect(processingMessage).toBeVisible({ timeout: 5000 });
});
