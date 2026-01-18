import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

async function closePanelIfOpen(world, panelSelector, closeSelector) {
  const panel = world.page.locator(panelSelector);
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (!isHidden) {
    await world.page.locator(closeSelector).click();
    await expect(panel).toBeHidden({ timeout: 5000 });
  }
}

async function openPalette(world) {
  await ensureConnected(world);
  await closePanelIfOpen(world, '#reviewPanel', '#closeReviewBtn');
  await closePanelIfOpen(world, '#diffPanel', '#closeDiffBtn');
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

async function runCommand(world, command) {
  await openPalette(world);
  if (['/diff', '/review', '/apply'].includes(command)) {
    await ensureAdvancedOpen(world);
  }
  await world.page.locator(`[data-command="${command}"]`).click();
}

Given('there are local changes', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setLocalChanges?.(true);
  });
  await this.page.waitForFunction(() => window.__TEST__?.hasLocalChanges?.());
});

When('I open the command palette', async function () {
  await openPalette(this);
});

Then('I see available commands', async function () {
  const visibleCommands = ['/model', '/status', '/new', '/resume'];
  const advancedCommands = ['/diff', '/review', '/apply'];
  for (const command of visibleCommands) {
    await expect(this.page.locator(`[data-command="${command}"]`)).toBeVisible();
  }
  for (const command of advancedCommands) {
    await expect(this.page.locator(`[data-command="${command}"]`)).toHaveCount(1);
  }
});

When('I run the {string} command', async function (command) {
  await runCommand(this, command);
});

Then('the model selector is shown', async function () {
  await expect(this.page.locator('#threadOptionsPanel')).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#threadModel')).toBeVisible();
});

Then('the status panel is shown', async function () {
  await expect(this.page.locator('#statusPanel')).toBeVisible({ timeout: 5000 });
});

Then('a new thread is created', async function () {
  const message = this.page.locator('.message').filter({ hasText: /New thread created:/ });
  await expect(message).toBeVisible({ timeout: 5000 });
  const threadIds = await this.page.$$eval('#threadSelector option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
  expect(threadIds.length).toBeGreaterThan(0);
});

Then('the session picker is shown', async function () {
  await expect(this.page.locator('#sessionsPanel')).toBeVisible({ timeout: 5000 });
});

Then('a diff viewer panel appears', async function () {
  await expect(this.page.locator('#diffPanel')).toBeVisible({ timeout: 5000 });
});

Then('a review summary is displayed', async function () {
  await expect(this.page.locator('#reviewPanel')).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#reviewSummary')).not.toHaveText('');
});

Then('I am asked to confirm apply', async function () {
  const overlay = this.page.locator('#modalOverlay');
  await expect(overlay).toBeVisible({ timeout: 5000 });
  await expect(this.page.locator('#modalTitle')).toContainText('Apply');
});

Then('advanced sections are collapsed', async function () {
  const isOpen = await this.page.locator('#commandPaletteAdvanced').evaluate((node) =>
    node.hasAttribute('open')
  );
  expect(isOpen).toBe(false);
});
