import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('the status indicator shows {string}', async function (statusText) {
  const statusDot = this.page.locator('#statusDot');
  const statusLabel = this.page.locator('#statusText');
  await expect(statusDot).not.toHaveClass(/disconnected/);
  await expect(statusLabel).toHaveText(statusText);
});

Then('I see the mock mode badge', async function () {
  const mockBadge = this.page.locator('.mock-badge');
  await expect(mockBadge).toBeVisible();
  await expect(mockBadge).toHaveText('MOCK MODE');
});
