import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

const reasoningText = 'Test reasoning message';
const rawReasoningText = 'RAW reasoning trace';

async function openReasoningPanel(world) {
  await ensureConnected(world);
  await world.page.locator('#reasoningPanelBtn').click();
  await expect(world.page.locator('#reasoningPanel')).toBeVisible();
}

async function emitReasoning(world, text) {
  await ensureConnected(world);
  await world.page.evaluate((payload) => {
    window.__TEST__?.emitReasoning?.(payload);
  }, text);
}

async function emitRawReasoning(world, text) {
  await ensureConnected(world);
  await world.page.evaluate((payload) => {
    window.__TEST__?.emitRawReasoning?.(payload);
  }, text);
}

When('I toggle reasoning off', async function () {
  this.reasoningText = reasoningText;
  await emitReasoning(this, reasoningText);
  const message = this.page
    .locator('.message.reasoning:not(.raw)')
    .filter({ hasText: reasoningText });
  await expect(message).toBeVisible();
  await openReasoningPanel(this);
  await this.page.locator('#showReasoningToggle').setChecked(false);
});

Then('reasoning messages are hidden', async function () {
  const message = this.page
    .locator('.message.reasoning:not(.raw)')
    .filter({ hasText: this.reasoningText || reasoningText });
  await expect(message).toBeHidden();
});

Given('raw reasoning is available', async function () {
  this.rawReasoningText = rawReasoningText;
  await emitRawReasoning(this, rawReasoningText);
  const message = this.page
    .locator('.message.reasoning.raw')
    .filter({ hasText: rawReasoningText });
  await expect(message).toHaveCount(1);
});

When('I toggle raw reasoning on', async function () {
  await openReasoningPanel(this);
  await this.page.locator('#showRawReasoningToggle').setChecked(true);
});

Then('raw reasoning is shown', async function () {
  const message = this.page
    .locator('.message.reasoning.raw')
    .filter({ hasText: this.rawReasoningText || rawReasoningText });
  await expect(message).toBeVisible();
});
