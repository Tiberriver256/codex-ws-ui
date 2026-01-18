import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected, ensureAdvancedOptionsOpen } from '../support/ui.mjs';

const APPROVAL_ACTION = 'workspace-write';
const PRESET_MAP = {
  lockdown: { approval: 'on-request', sandbox: 'read-only' },
  balanced: { approval: 'on-request', sandbox: 'workspace-write' },
  fast: { approval: 'never', sandbox: 'workspace-write' },
};

async function createThreadWithApprovalPolicy(world, policy) {
  await ensureConnected(world);
  await world.page.locator('#newThreadBtn').click();
  await expect(world.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(world.page);
  await world.page.locator('#threadApproval').selectOption(policy);
  await world.page.locator('#applyOptionsBtn').click();
  await expect(world.page.locator('.message').filter({ hasText: /Thread options set:/ })).toBeVisible({ timeout: 5000 });
}

Given('approval policy is {string}', async function (policy) {
  await createThreadWithApprovalPolicy(this, policy);
});

When('an action requires approval', async function () {
  await this.page.locator('#approvalActionBtn').click();
});

Then('I see an approval request with details', async function () {
  const card = this.page.locator('.approval-card');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Approval');
  await expect(card).toContainText('Action');
  await expect(card).toContainText('Workspace write');
});

Given('an approval request is shown', async function () {
  await createThreadWithApprovalPolicy(this, 'on-request');
  await this.page.locator('#approvalActionBtn').click();
  const card = this.page.locator('.approval-card');
  await expect(card).toBeVisible();
});

When('I approve the request', async function () {
  await this.page.locator('[data-approval-action="approve"]').click();
});

Then('the action proceeds and the timeline records approval', async function () {
  const message = this.page.locator('.message').filter({ hasText: /Approval granted/ });
  await expect(message).toBeVisible();
});

When('I deny the request', async function () {
  await this.page.locator('[data-approval-action="deny"]').click();
});

Then('the action is canceled and the timeline records denial', async function () {
  const message = this.page.locator('.message').filter({ hasText: /Approval denied/ });
  await expect(message).toBeVisible();
});

When('I choose "Always allow"', async function () {
  await this.page.locator('[data-approval-action="always"]').click();
});

Then('a rule is added and future actions proceed without prompts', async function () {
  const ruleMessage = this.page.locator('.message').filter({ hasText: /Rule added/ });
  await expect(ruleMessage).toBeVisible();

  const rules = await this.page.evaluate(() => {
    try {
      const raw = window.localStorage.getItem('codex-approval-rules-v1');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.rules) ? parsed.rules : [];
    } catch {
      return [];
    }
  });
  expect(rules.length).toBeGreaterThan(0);
  expect(rules.some((rule) => rule.action === APPROVAL_ACTION)).toBeTruthy();

  await this.page.locator('#approvalActionBtn').click();
  await expect(this.page.locator('.approval-card')).toHaveCount(0);
  const autoMessage = this.page.locator('.message').filter({ hasText: /auto-approved/ });
  await expect(autoMessage).toBeVisible();
});

When('I open execpolicy rules', async function () {
  await ensureConnected(this);
  await this.page.locator('#execpolicyPanelBtn').click();
  await expect(this.page.locator('#execpolicyPanel')).toBeVisible();
});

Then('I can view rules and preview a check', async function () {
  const list = this.page.locator('#execpolicyRulesList');
  await expect(list).toHaveCount(1);

  const emptyState = this.page.locator('#execpolicyRulesEmpty');
  const ruleCount = await this.page.locator('.execpolicy-rule').count();
  const emptyVisible = await emptyState.isVisible();
  expect(ruleCount > 0 || emptyVisible).toBeTruthy();

  await this.page.locator('#execpolicyPreviewInput').fill(APPROVAL_ACTION);
  await this.page.locator('#execpolicyPreviewBtn').click();
  const preview = this.page.locator('#execpolicyPreviewResult');
  await expect(preview).toContainText(/Approval required|Allowed by rule/);
});

When('I choose a preset', async function () {
  await ensureConnected(this);
  await this.page.locator('#newThreadBtn').click();
  await expect(this.page.locator('#applyOptionsBtn')).toBeVisible({ timeout: 5000 });
  await ensureAdvancedOptionsOpen(this.page);
  const preset = 'lockdown';
  await this.page.locator('#threadApprovalPreset').selectOption(preset);
  this.selectedPreset = preset;
});

Then('sandbox and approval settings update together', async function () {
  const preset = this.selectedPreset || 'lockdown';
  const expected = PRESET_MAP[preset];
  expect(expected).toBeTruthy();
  const approvalValue = await this.page.locator('#threadApproval').inputValue();
  const sandboxValue = await this.page.locator('#threadSandbox').inputValue();
  expect(approvalValue).toBe(expected.approval);
  expect(sandboxValue).toBe(expected.sandbox);
});
