import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

async function openAuthPanel(world) {
  await openApp(world);
  await world.page.locator('#authPanelBtn').click();
  await expect(world.page.locator('#authPanel')).toBeVisible();
}

Given('I am logged in', async function () {
  await openAuthPanel(this);
  await this.page.locator('#authApiKeyBtn').click();
  await this.page.locator('#authApiKeyInput').fill('sk-test-1234');
  await this.page.locator('#authApiKeySubmit').click();
  await expect(this.page.locator('#authStatusText')).toContainText('Logged in');
  await this.page.locator('#closeAuthBtn').click();
});

Given('I am in a headless environment', async function () {
  await openApp(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setHeadless?.(true);
  });
});

When('I choose auth option {string}', async function (label) {
  await openAuthPanel(this);
  if (label === 'Login') {
    await this.page.locator('#authOAuthBtn').click();
    return;
  }
  if (label === 'Login with API key') {
    await this.page.locator('#authApiKeyBtn').click();
    return;
  }
  if (label === 'Device auth') {
    await this.page.locator('#authDeviceBtn').click();
    return;
  }
  if (label === 'Logout') {
    await this.page.locator('#authLogoutBtn').click();
  }
});

When('I submit a valid API key', async function () {
  await this.page.locator('#authApiKeyInput').fill('sk-valid-123456');
  await this.page.locator('#authApiKeySubmit').click();
});

Then('I am guided through OAuth', async function () {
  await expect(this.page.locator('#authGuidance')).toBeVisible();
});

Then('login status reflects success', async function () {
  await expect(this.page.locator('#authStatusText')).toContainText('Logged in');
});

Then('I see device auth instructions', async function () {
  await expect(this.page.locator('#authDeviceInstructions')).toBeVisible();
});

Then('login status reflects success after completion', async function () {
  await this.page.locator('#authDeviceCompleteBtn').click();
  await expect(this.page.locator('#authStatusText')).toContainText('Logged in');
});

When('I open the status panel', async function () {
  await this.page.locator('#statusPanelBtn').click();
  await expect(this.page.locator('#statusPanel')).toBeVisible();
});

Then('I see current auth state and workspace', async function () {
  const workspaceRoot = await this.page.evaluate(() => window.__APP_CONFIG__?.workspaceRoot || '');
  await expect(this.page.locator('#statusAuthState')).toContainText('Logged in');
  if (workspaceRoot) {
    await expect(this.page.locator('#statusWorkspace')).toContainText(workspaceRoot);
  }
});

Then('I am logged out and status updates', async function () {
  await expect(this.page.locator('#authStatusText')).toContainText('Logged out');
});

Then('I see copyable port-forward guidance', async function () {
  await expect(this.page.locator('#authHeadlessGuidance')).toBeVisible();
  await expect(this.page.locator('#authHeadlessGuidance')).toHaveValue(/ssh -L/);
});
