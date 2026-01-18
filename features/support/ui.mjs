import { expect } from '@playwright/test';

export async function openApp(world) {
  if (!world?.page) throw new Error('Playwright page not initialized');
  await world.page.goto('/');
  await expect(world.page.locator('#statusText')).toHaveText('Connected');
}

export async function ensureConnected(world) {
  if (!world?.page) throw new Error('Playwright page not initialized');
  await expect(world.page.locator('#statusText')).toHaveText('Connected');
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
