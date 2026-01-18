import { expect } from '@playwright/test';

export async function openApp(world) {
  if (!world?.page) throw new Error('Playwright page not initialized');
  const baseURL = world.parameters?.baseURL || process.env.BASE_URL || 'http://127.0.0.1:8080';
  await world.page.goto(baseURL);
  await expect(world.page.locator('#statusText')).toHaveText('Connected');
}

export async function ensureConnected(world) {
  if (!world?.page) throw new Error('Playwright page not initialized');
  const status = world.page.locator('#statusText');
  const hasStatus = await status.count();
  if (!hasStatus) {
    await openApp(world);
    return;
  }
  await expect(status).toHaveText('Connected');
}

export async function ensureAdvancedOptionsOpen(page) {
  const details = page.locator('.options-advanced');
  const isOpen = await details.evaluate((node) => node.hasAttribute('open'));
  if (!isOpen) {
    await page.locator('.options-advanced summary').click();
  }
}

export async function getThreadIds(page) {
  return page.$$eval('#threadSelector option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
}

export function assistantMessageLocator(page) {
  return page.locator('.message.assistant').filter({ hasText: '\u{1F4AC}' });
}

export function usageMessageLocator(page) {
  return page.locator('.message.usage').filter({ hasText: '\u{1F4CA}' });
}
