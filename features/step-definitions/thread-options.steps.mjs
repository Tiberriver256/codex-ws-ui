import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureAdvancedOptionsOpen, ensureConnected, openApp } from '../support/ui.mjs';

async function getWorkspaceRoot(page) {
  return page.evaluate(() => window.__APP_CONFIG__?.workspaceRoot || '');
}

async function ensureOptionsPanelOpen(world) {
  const panel = world.page.locator('#threadOptionsPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#threadOptionsBtn').click();
    await expect(world.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  }
}

async function applyIfUpdating(world) {
  const label = await world.page.locator('#applyOptionsBtn').textContent();
  if (label && label.toLowerCase().includes('apply')) {
    await world.page.locator('#applyOptionsBtn').click();
    await expect(world.page.locator('.message').filter({ hasText: /Thread options updated:/ })).toBeVisible({ timeout: 5000 });
  }
}

When('I create the thread without changes', async function () {
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /New thread created:/ })).toBeVisible({ timeout: 5000 });
});

Then('the thread header shows default settings', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  await expect(summary).toContainText('Defaults');
});

When('I set working directory to a valid path', async function () {
  const workspaceRoot = await getWorkspaceRoot(this.page);
  const workingDir = workspaceRoot || '/tmp';
  await this.page.locator('#threadWorkingDir').fill(workingDir);
  this.workingDir = workingDir;
});

When('I add two additional directories', async function () {
  const workspaceRoot = await getWorkspaceRoot(this.page);
  const dirOne = workspaceRoot ? `${workspaceRoot}/public` : '/tmp/one';
  const dirTwo = workspaceRoot ? `${workspaceRoot}/features` : '/tmp/two';
  await this.page.locator('#threadAdditionalDirs').fill(`${dirOne}\n${dirTwo}`);
  this.additionalDirs = [dirOne, dirTwo];
});

When('I enable skip git repo check', async function () {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadSkipRepoCheck').selectOption('on');
  this.skipRepoCheck = true;
  await applyIfUpdating(this);
});

Then('the thread summary reflects all selected settings', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  if (this.selectedModel) {
    await expect(summary).toContainText(`Model: ${this.selectedModel}`);
  }
  if (this.selectedReasoning) {
    await expect(summary).toContainText(`Reasoning: ${this.selectedReasoning}`);
  }
  if (this.selectedSandbox) {
    await expect(summary).toContainText(`Sandbox: ${this.selectedSandbox}`);
  }
  await expect(summary).toContainText('Network: on');
  await expect(summary).toContainText('Search: on');
  if (this.workingDir) {
    await expect(summary).toContainText(`Dir: ${this.workingDir}`);
  }
  if (Array.isArray(this.additionalDirs)) {
    await expect(summary).toContainText(`Add Dirs: ${this.additionalDirs.length}`);
  }
  if (this.skipRepoCheck) {
    await expect(summary).toContainText('Repo Check: skip');
  }
});

When('I disable network access', async function () {
  await ensureOptionsPanelOpen(this);
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('off');
  this.selectedNetwork = 'off';
  await applyIfUpdating(this);
});

When('I attempt to enable web search', async function () {
  await ensureAdvancedOptionsOpen(this.page);
  const webSearch = this.page.locator('#threadWebSearch');
  if (await webSearch.isDisabled()) {
    this.webSearchAttemptBlocked = true;
    return;
  }
  await webSearch.selectOption('on');
});

Then('web search stays disabled or network is auto-enabled with confirmation', async function () {
  const webSearchValue = await this.page.$eval('#threadWebSearch', (el) => el.value);
  const networkValue = await this.page.$eval('#threadNetwork', (el) => el.value);
  const modalVisible = await this.page.locator('#modalOverlay').isVisible().catch(() => false);
  expect(webSearchValue === 'off' || networkValue === 'on' || modalVisible).toBeTruthy();
  if (modalVisible) {
    await this.page.locator('#modalActions [data-modal-action="cancel"]').click();
  }
});

When('I set working directory to an invalid path', async function () {
  const workspaceRoot = await getWorkspaceRoot(this.page);
  const invalidPath = workspaceRoot ? `${workspaceRoot}/../not-allowed` : '/not-allowed';
  await this.page.locator('#threadWorkingDir').fill(invalidPath);
  this.invalidWorkingDir = invalidPath;
});

Then('I see a validation error', async function () {
  const error = this.page.locator('#threadWorkingDirError');
  await expect(error).toBeVisible();
});

Then('I cannot apply the options', async function () {
  const applyBtn = this.page.locator('#applyOptionsBtn');
  await expect(applyBtn).toBeDisabled();
});

When('I remove one additional directory', async function () {
  const remaining = Array.isArray(this.additionalDirs) ? this.additionalDirs[0] : '';
  await this.page.locator('#threadAdditionalDirs').fill(remaining);
  this.additionalDirs = remaining ? [remaining] : [];
});

Then('only the remaining directory is saved', async function () {
  await this.page.locator('#threadOptionsBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  const value = await this.page.locator('#threadAdditionalDirs').inputValue();
  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  expect(lines.length).toBe(1);
  if (Array.isArray(this.additionalDirs) && this.additionalDirs[0]) {
    expect(lines[0]).toBe(this.additionalDirs[0]);
  }
});

When('I change model and reasoning effort', async function () {
  await this.page.locator('#threadModel').selectOption('gpt-test-model-lite');
  await this.page.locator('#threadReasoning').selectOption('high');
  this.selectedModel = 'gpt-test-model-lite';
  this.selectedReasoning = 'high';
});

Then('a settings changed marker appears with both fields', async function () {
  const marker = this.page.locator('.message').filter({ hasText: /Settings changed:/ });
  await expect(marker).toContainText(`Model: ${this.selectedModel}`);
  await expect(marker).toContainText(`Reasoning: ${this.selectedReasoning}`);
});

Given('I have an active thread with sandbox {string}', async function (mode) {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadSandbox').selectOption(mode);
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
  this.selectedSandbox = mode;
});

Then('I must confirm the risk before applying', async function () {
  await this.page.locator('#applyOptionsBtn').click();
  const modal = this.page.locator('#modalOverlay');
  await expect(modal).toBeVisible();
  await this.page.locator('#modalActions [data-modal-action="confirm"]').click();
});

Given('I have an active thread with network access enabled', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('on');
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
});

When('I attempt a network-required action', async function () {
  await this.page.locator('#networkActionBtn').click();
});

Then('I see a blocking prompt to re-enable or cancel', async function () {
  const modal = this.page.locator('#modalOverlay');
  await expect(modal).toBeVisible();
  await expect(this.page.locator('#modalMessage')).toContainText('Network is off');
  await this.page.locator('#modalActions [data-modal-action="cancel"]').click();
});

When('I attempt an action requiring approval', async function () {
  await applyIfUpdating(this);
  await this.page.locator('#approvalActionBtn').click();
});

Then('an approval request is shown', async function () {
  const modal = this.page.locator('#modalOverlay');
  await expect(modal).toBeVisible();
  await expect(this.page.locator('#modalTitle')).toContainText('Approval');
  await this.page.locator('#modalActions [data-modal-action="deny"]').click();
});

Given('I have an active thread in a git repo', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /New thread created:/ })).toBeVisible({ timeout: 5000 });
});

Then('repo checks are bypassed and the change is recorded', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  await expect(summary).toContainText('Repo Check: skip');
});

Given('my permissions restrict dangerous settings', async function () {
  await ensureConnected(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setRestricted?.(true);
  });
});

Then('restricted controls are disabled with an explanation', async function () {
  await expect(this.page.locator('#restrictedSettingsNote')).toBeVisible();
  await expect(this.page.locator('#threadSandbox')).toBeDisabled();
  await expect(this.page.locator('#threadNetwork')).toBeDisabled();
  await expect(this.page.locator('#threadWebSearch')).toBeDisabled();
  await expect(this.page.locator('#threadSkipRepoCheck')).toBeDisabled();
});

Given('I have a thread with custom settings', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await this.page.locator('#threadModel').selectOption('gpt-test-model-lite');
  await this.page.locator('#threadReasoning').selectOption('high');
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('on');
  await this.page.locator('#threadWebSearch').selectOption('on');
  const workspaceRoot = await getWorkspaceRoot(this.page);
  const workingDir = workspaceRoot || '/tmp';
  await this.page.locator('#threadWorkingDir').fill(workingDir);
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
  this.expectedSummaryParts = [
    'Model: gpt-test-model-lite',
    'Reasoning: high',
    'Network: on',
    'Search: on',
    `Dir: ${workingDir}`
  ];
});

When('I reload the app', async function () {
  await this.page.reload();
  await openApp(this);
});

Then('the thread settings match the previous values', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  for (const part of this.expectedSummaryParts || []) {
    await expect(summary).toContainText(part);
  }
});

Given('I have two threads with different network and search settings', async function () {
  await ensureConnected(this);

  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('on');
  await this.page.locator('#threadWebSearch').selectOption('on');
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });

  let threadIds = await this.page.$$eval('#threadSelector option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
  const firstThreadId = threadIds[threadIds.length - 1];

  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('off');
  await this.page.locator('#threadWebSearch').selectOption('off');
  await this.page.locator('#applyOptionsBtn').click();
  await expect(this.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });

  threadIds = await this.page.$$eval('#threadSelector option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
  const secondThreadId = threadIds[threadIds.length - 1];

  this.threadBadgeExpectations = new Map([
    [firstThreadId, ['[NET]', '[SEARCH]']],
    [secondThreadId, ['[NET-OFF]', '[SEARCH-OFF]']]
  ]);
});

When('I view the thread list', async function () {
  await expect(this.page.locator('#threadSelector')).toBeVisible();
});

Then('each thread shows the correct badges', async function () {
  for (const [threadId, badges] of this.threadBadgeExpectations.entries()) {
    const option = this.page.locator(`#threadSelector option[value="${threadId}"]`);
    for (const badge of badges) {
      await expect(option).toContainText(badge);
    }
  }
});

When('I change multiple settings', async function () {
  await this.page.locator('#threadModel').selectOption('gpt-test-model-lite');
  await this.page.locator('#threadReasoning').selectOption('high');
  await ensureAdvancedOptionsOpen(this.page);
  await this.page.locator('#threadNetwork').selectOption('on');
  await this.page.locator('#threadWebSearch').selectOption('on');
  await this.page.locator('#threadWorkingDir').fill('/tmp');
  await this.page.locator('#threadAdditionalDirs').fill('/tmp/one');
});

When('I choose "Use defaults"', async function () {
  await this.page.locator('#resetOptionsBtn').click();
});

Then('all fields return to defaults', async function () {
  await expect(this.page.locator('#threadModel')).toHaveValue('');
  await expect(this.page.locator('#threadReasoning')).toHaveValue('default');
  await expect(this.page.locator('#threadApproval')).toHaveValue('default');
  await expect(this.page.locator('#threadSandbox')).toHaveValue('default');
  await expect(this.page.locator('#threadSkipRepoCheck')).toHaveValue('default');
  await expect(this.page.locator('#threadNetwork')).toHaveValue('default');
  await expect(this.page.locator('#threadWebSearch')).toHaveValue('default');
  await expect(this.page.locator('#threadWorkingDir')).toHaveValue('');
  await expect(this.page.locator('#threadAdditionalDirs')).toHaveValue('');
});
