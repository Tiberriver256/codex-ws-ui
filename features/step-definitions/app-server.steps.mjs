import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

When('the UI connects to app-server', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.connect?.();
  });
});

Then('the initialize request succeeds', async function () {
  await this.page.waitForFunction(() => {
    return window.__TEST__?.appServer?.lastRequest?.method === 'initialize';
  });

  const initId = await this.page.evaluate(() => window.__TEST__?.appServer?.lastRequest?.id ?? null);
  await this.page.evaluate((id) => {
    window.__TEST__?.appServer?.respond?.(id, { capabilities: { diffs: true } });
  }, initId);

  await this.page.waitForFunction((id) => {
    const completed = window.__TEST__?.appServer?.completedRequests || [];
    return completed.some((entry) => entry.id === id && entry.method === 'initialize' && !entry.error);
  }, initId);
});

Given('a request uses id 0', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.queueRequest?.({ id: 0, method: 'test/zero', params: { ok: true } });
  });
});

When('a response is received', async function () {
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.respond?.(0, { ok: true });
  });
});

Then('it is matched to the correct request', async function () {
  await this.page.waitForFunction(() => {
    const completed = window.__TEST__?.appServer?.completedRequests || [];
    return completed.some((entry) => entry.id === 0 && entry.method === 'test/zero');
  });

  const completed = await this.page.evaluate(() => window.__TEST__?.appServer?.completedRequests || []);
  const match = completed.find((entry) => entry.id === 0);
  expect(match).toBeTruthy();
  expect(match.result?.ok).toBe(true);
});

Given('app-server sends mixed notifications', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.emitMixed?.();
  });
});

When('events are received', async function () {
  await this.page.waitForFunction(() => {
    return (window.__TEST__?.appServer?.normalizedEvents || []).length > 0;
  });
});

Then('they are normalized into the UI event model', async function () {
  const types = await this.page.evaluate(() =>
    (window.__TEST__?.appServer?.normalizedEvents || []).map((event) => event.type)
  );
  expect(types).toContain('thread.started');
  expect(types).toContain('item.updated');
  expect(types).toContain('turn.completed');
  expect(types.some((type) => type.includes('/'))).toBe(false);
});

Given('a file change occurs', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.emitMixed?.({ includeFileChange: true });
  });
});

When('app-server emits diff updates', async function () {
  await this.page.evaluate(() => {
    window.__TEST__?.appServer?.emitDiffUpdate?.();
  });
});

Then('the UI renders the updated diff', async function () {
  const fileMessage = this.page.locator('.message.file-change');
  await expect(fileMessage).toBeVisible({ timeout: 5000 });
  await expect(fileMessage).toContainText('@@');
});
