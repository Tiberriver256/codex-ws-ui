import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

async function ensureConfigPanelOpen(world) {
  const panel = world.page.locator('#configPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#configPanelBtn').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
  }
}

async function ensureFeatureFlagsOpen(world) {
  const panel = world.page.locator('#featureFlagsPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#featureFlagsBtn').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
  }
}

When('I choose a profile', async function () {
  await openApp(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setConfigProfiles?.(
      [
        {
          id: 'default',
          name: 'Default',
          overrides: { model: 'gpt-test-model' }
        },
        {
          id: 'focus',
          name: 'Focus',
          overrides: { model: 'gpt-test-model-lite', sandboxMode: 'read-only' }
        }
      ],
      { approvalPolicy: 'on-request', model: 'gpt-test-model' }
    );
  });
  await ensureConfigPanelOpen(this);
  await this.page.locator('#configProfileSelect').selectOption('focus');
});

Then('I see the effective config preview', async function () {
  const preview = this.page.locator('#effectiveConfigPreview');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('sandboxMode');
  await expect(preview).toContainText('read-only');
});

When('I choose a model provider or OSS provider', async function () {
  await openApp(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setConfigProviders?.({
      model: [
        { id: 'openai', label: 'OpenAI' },
        { id: 'azure-openai', label: 'Azure OpenAI' }
      ],
      oss: [
        { id: 'ollama', label: 'Ollama' },
        { id: 'vllm', label: 'vLLM' }
      ]
    });
  });
  await ensureConfigPanelOpen(this);
  await this.page.locator('#modelProviderSelect').selectOption('azure-openai');
  await this.page.locator('#ossProviderSelect').selectOption('ollama');
  this.expectedModelProvider = 'Azure OpenAI';
  this.expectedOssProvider = 'Ollama';
  await this.page.locator('#closeConfigPanelBtn').click();
});

Then('the selection is reflected in thread options', async function () {
  await this.page.locator('#threadOptionsBtn').click();
  await expect(this.page.locator('#threadOptionsPanel')).toBeVisible({ timeout: 5000 });
  const summary = this.page.locator('#providerSummary');
  await expect(summary).toContainText(this.expectedModelProvider);
  await expect(summary).toContainText(this.expectedOssProvider);
  await expect(this.page.locator('#providerModelValue')).toContainText(this.expectedModelProvider);
  await expect(this.page.locator('#providerOssValue')).toContainText(this.expectedOssProvider);
});

When('I open the feature flags panel', async function () {
  await openApp(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setFeatureFlags?.([
      { id: 'flag-alpha', label: 'Flag Alpha', description: 'Alpha test flag', enabled: false },
      { id: 'flag-bravo', label: 'Flag Bravo', description: 'Bravo test flag', enabled: true }
    ]);
  });
  await ensureFeatureFlagsOpen(this);
});

Then('I can enable or disable flags', async function () {
  const toggles = this.page.locator('#featureFlagsList input[type="checkbox"]');
  const count = await toggles.count();
  expect(count).toBeGreaterThan(0);
  const firstToggle = toggles.first();
  const wasChecked = await firstToggle.isChecked();
  await firstToggle.click();
  if (wasChecked) {
    await expect(firstToggle).not.toBeChecked();
  } else {
    await expect(firstToggle).toBeChecked();
  }
  const status = firstToggle.locator('..').locator('span');
  await expect(status).toContainText(wasChecked ? 'Off' : 'On');
});
