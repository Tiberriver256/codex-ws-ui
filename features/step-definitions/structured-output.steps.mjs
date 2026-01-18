import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

const sampleSchema = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    count: { type: 'number' }
  },
  required: ['status']
};

const sampleOutput = {
  status: 'ok',
  count: 2
};

async function emitStructuredOutput(world, payload) {
  await ensureConnected(world);
  await world.page.evaluate((data) => {
    window.__TEST__?.emitStructuredOutput?.(data);
  }, payload);
}

When('I provide a JSON schema for the next turn', async function () {
  await ensureConnected(this);
  const schemaInput = this.page.locator('#structuredSchema');
  await schemaInput.fill(JSON.stringify(sampleSchema, null, 2));
  const input = this.page.locator('#prompt');
  const sendButton = this.page.locator('button[type="submit"]');
  await input.fill('Return structured output');
  await sendButton.click();
  this.structuredSchema = sampleSchema;
});

Then('the request includes the schema', async function () {
  await this.page.waitForFunction(() => Boolean(window.__TEST__?.lastSentPayload));
  const payload = await this.page.evaluate(() => window.__TEST__?.lastSentPayload || null);
  expect(payload?.type).toBe('message');
  const schema = payload.outputSchema || payload.output_schema;
  expect(schema).toEqual(this.structuredSchema);
});

Given('the model returns structured output', async function () {
  this.structuredOutput = sampleOutput;
  await emitStructuredOutput(this, sampleOutput);
});

Then('I see a JSON viewer', async function () {
  const card = this.page.locator('[data-structured-output="true"]');
  await expect(card).toBeVisible();
  await expect(card).toContainText('Structured Output');
});

Given('structured output is shown', async function () {
  this.structuredOutput = sampleOutput;
  await emitStructuredOutput(this, sampleOutput);
});

When('I choose copy or download', async function () {
  const card = this.page.locator('[data-structured-output="true"]');
  await expect(card).toBeVisible();
  await card.locator('[data-structured-action="copy"]').click();
  await card.locator('[data-structured-action="download"]').click();
});

Then('the JSON is copied or saved', async function () {
  const testState = await this.page.evaluate(() => window.__TEST__ || {});
  expect(testState.lastCopiedStructuredOutput).toBeTruthy();
  expect(testState.lastDownloadedStructuredOutput).toBeTruthy();
});
