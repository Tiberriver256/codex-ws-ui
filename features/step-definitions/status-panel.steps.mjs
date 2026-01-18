import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

Given('a session is active', async function () {
  await openApp(this);
  const input = this.page.locator('#prompt');
  const sendButton = this.page.locator('button[type="submit"]');
  await input.fill('Status panel check');
  await sendButton.click();
  await expect(this.page.locator('.message.usage')).toBeVisible({ timeout: 10000 });
});

When('I open the status card', async function () {
  await this.page.locator('#statusPanelBtn').click();
  await expect(this.page.locator('#statusPanel')).toBeVisible();
});

Then('I see model, sandbox, approvals, cwd, add-dirs, and tokens', async function () {
  const panel = this.page.locator('#statusPanel');
  await expect(panel.locator('#statusModel')).not.toHaveText('');
  await expect(panel.locator('#statusSandbox')).not.toHaveText('');
  await expect(panel.locator('#statusApprovals')).not.toHaveText('');
  await expect(panel.locator('#statusCwd')).not.toHaveText('');
  await expect(panel.locator('#statusAddDirs')).not.toHaveText('');
  await expect(panel.locator('#statusTokens')).not.toHaveText('');
});

Then('I see the AGENTS discovery path and active instructions', async function () {
  const panel = this.page.locator('#statusPanel');
  await expect(panel.locator('#statusAgentsPath')).not.toHaveText('');
  await expect(panel.locator('#statusAgentsInstructions')).not.toHaveText('');
});
