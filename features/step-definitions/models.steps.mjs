import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Then('the model list includes the default models', async function () {
  const modelValues = await this.page.$$eval('#threadModel option', (options) =>
    options.map((option) => option.value).filter(Boolean)
  );
  expect(modelValues).toContain('gpt-test-model');
  expect(modelValues).toContain('gpt-test-model-lite');
});

Then('the thread options summary shows the selected model', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  await expect(summary).toContainText(`Model: ${this.selectedModel}`);
});

Then('the thread options summary shows the reasoning effort', async function () {
  const summary = this.page.locator('#threadOptionsSummary');
  await expect(summary).toContainText(`Reasoning: ${this.selectedReasoning}`);
});
