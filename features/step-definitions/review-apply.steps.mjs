import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

async function openPalette(world) {
  await ensureConnected(world);
  await world.page.locator('#commandPaletteBtn').click();
  await expect(world.page.locator('#commandPalette')).toBeVisible({ timeout: 5000 });
}

async function ensureAdvancedOpen(world) {
  const details = world.page.locator('#commandPaletteAdvanced');
  const isOpen = await details.evaluate((node) => node.hasAttribute('open'));
  if (!isOpen) {
    await world.page.locator('#commandPaletteAdvanced summary').click();
  }
}

Given('a latest diff exists', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setLocalChanges?.(true);
  });
  await this.page.waitForFunction(() => window.__TEST__?.hasLocalChanges?.());
});

When('I run review', async function () {
  await openPalette(this);
  await ensureAdvancedOpen(this);
  await this.page.locator('[data-command="/review"]').click();
});

Then('I see a summary of changes', async function () {
  await expect(this.page.locator('#reviewPanel')).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#reviewSummary')).not.toHaveText('');
});

When('I apply the diff', async function () {
  await openPalette(this);
  await ensureAdvancedOpen(this);
  await this.page.locator('[data-command="/apply"]').click();
});

Then('I must confirm before applying', async function () {
  const overlay = this.page.locator('#modalOverlay');
  await expect(overlay).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#modalTitle')).toContainText('Apply');
  await this.page.locator('#modalActions button', { hasText: 'Apply' }).click();
});

Then('the apply result is shown', async function () {
  await expect(this.page.locator('#applyResult')).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#applyResult')).toContainText('Changes applied');
});
