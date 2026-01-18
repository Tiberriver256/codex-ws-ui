import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

const baseTasks = [
  {
    id: 'cloud-build-preview',
    name: 'Build preview',
    description: 'Compile and deploy a preview build.',
    status: 'ready'
  },
  {
    id: 'cloud-test-suite',
    name: 'Run test suite',
    description: 'Execute CI checks in the cloud.',
    status: 'ready'
  }
];

async function ensureCloudPanelOpen(world) {
  const panel = world.page.locator('#cloudPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#cloudPanelBtn').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
  }
}

When('I open the cloud tasks panel', async function () {
  await openApp(this);
  await this.page.evaluate((tasks) => {
    window.__TEST__?.setCloudTasks?.(tasks);
  }, baseTasks);
  await ensureCloudPanelOpen(this);
});

Then('I see available tasks', async function () {
  const tasks = this.page.locator('[data-cloud-task]');
  expect(await tasks.count()).toBeGreaterThan(0);
});

Given('a cloud task is available', async function () {
  await openApp(this);
  await this.page.evaluate((tasks) => {
    window.__TEST__?.setCloudTasks?.(tasks);
  }, baseTasks);
  await ensureCloudPanelOpen(this);
  const firstTask = this.page.locator('[data-cloud-task]').first();
  this.cloudTaskId = await firstTask.getAttribute('data-cloud-id');
  expect(this.cloudTaskId).toBeTruthy();
});

When('I run the task', async function () {
  const row = this.page.locator(`[data-cloud-id="${this.cloudTaskId}"]`);
  await row.locator('[data-cloud-action="run"]').click();
});

Then('I see task status updates', async function () {
  const row = this.page.locator(`[data-cloud-id="${this.cloudTaskId}"]`);
  const status = row.locator('[data-cloud-status]');
  await expect(status).toHaveText(/Queued/i, { timeout: 5000 });
  await expect(status).toHaveText(/Running/i, { timeout: 5000 });
  await expect(status).toHaveText(/Completed/i, { timeout: 5000 });
});
