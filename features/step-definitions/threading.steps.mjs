import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { assistantMessageLocator, getThreadIds, usageMessageLocator } from '../support/ui.mjs';

Then('both messages use the same thread id', async function () {
  await expect(usageMessageLocator(this.page)).toHaveCount(2, { timeout: 10000 });
  const threadIds = await getThreadIds(this.page);
  expect(threadIds.length).toBe(1);
  await expect(this.page.locator('#threadSelector option')).toHaveCount(2);
});

Then('the pending thread id is replaced with a real id', async function () {
  if (Array.isArray(this.pendingThreadIds)) {
    expect(this.pendingThreadIds.some((id) => id.startsWith('pending_'))).toBeTruthy();
  }
  await expect(this.page.locator('.message').filter({ hasText: /Thread ID assigned:/ })).toBeVisible({ timeout: 10000 });
  const threadIds = await getThreadIds(this.page);
  expect(threadIds.some((id) => id.startsWith('pending_'))).toBeFalsy();
  expect(threadIds.some((id) => id.startsWith('thread_'))).toBeTruthy();
});

Then('I see only one {string} message', async function (text) {
  const threadStarted = this.page.locator('.message').filter({ hasText: new RegExp(text) });
  await expect(threadStarted).toHaveCount(1, { timeout: 10000 });
});

Then('I see two assistant messages', async function () {
  const agentMessages = assistantMessageLocator(this.page);
  await expect(agentMessages).toHaveCount(2, { timeout: 15000 });
});

Then('each assistant message matches its prompt', async function () {
  const agentMessages = assistantMessageLocator(this.page);
  expect(this.sentPrompts.length).toBeGreaterThanOrEqual(2);
  await expect(agentMessages.nth(0)).toContainText(this.sentPrompts[0], { timeout: 15000 });
  await expect(agentMessages.nth(1)).toContainText(this.sentPrompts[1], { timeout: 15000 });
});

Then('the thread selector shows two threads', async function () {
  await expect(this.page.locator('#threadSelector option')).toHaveCount(3, { timeout: 5000 });
});

Then('the new thread starts with minimal messages', async function () {
  const messageCount = await this.page.locator('.message').count();
  expect(messageCount).toBeLessThan(5);
});
