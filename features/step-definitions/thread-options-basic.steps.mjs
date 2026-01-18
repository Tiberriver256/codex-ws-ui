import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('I see a thread options set message', async function () {
  const message = this.page.locator('.message').filter({ hasText: /Thread options set:/ });
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('I see a thread options updated message', async function () {
  const message = this.page.locator('.message').filter({ hasText: /Thread options updated:/ });
  await expect(message).toBeVisible({ timeout: 5000 });
});

Then('the thread options summary shows {string}', async function (text) {
  const summary = this.page.locator('#threadOptionsSummary');
  await expect(summary).toContainText(text);
});
