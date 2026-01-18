import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

async function setPrompts(world, prompts) {
  await ensureConnected(world);
  world.promptFixtures = prompts;
  await world.page.evaluate((data) => {
    window.__TEST__?.setPrompts?.(data);
  }, prompts);
}

async function openPromptPalette(world) {
  await ensureConnected(world);
  await world.page.locator('#promptsPaletteBtn').click();
  await expect(world.page.locator('#promptsPalette')).toBeVisible({ timeout: 5000 });
}

async function closePromptPalette(world) {
  const closeBtn = world.page.locator('#closePromptsPaletteBtn');
  if (await closeBtn.isVisible().catch(() => false)) {
    await closeBtn.click();
  }
  await expect(world.page.locator('#promptsPalette')).toBeHidden({ timeout: 5000 });
}

Given(/^prompts exist in ~\/\.codex\/prompts$/, async function () {
  const prompts = [
    {
      id: 'daily-summary',
      name: 'Daily summary',
      description: 'Summarize the day',
      template: 'Summarize work completed today',
    },
    {
      id: 'bug-triage',
      name: 'Bug triage',
      description: 'Review open bugs',
      template: 'Triage issues for the {{team}} team',
    },
  ];
  this.promptList = prompts.map((prompt) => prompt.name);
  await setPrompts(this, prompts);
});

When('I open the prompt palette', async function () {
  await openPromptPalette(this);
});

Then('I see the prompts listed', async function () {
  for (const name of this.promptList || []) {
    await expect(this.page.locator(`#promptsPaletteList [data-prompt-name="${name}"]`)).toBeVisible();
  }
});

Given('a prompt with positional placeholders', async function () {
  const prompt = {
    id: 'positional-demo',
    name: 'Deploy report',
    description: 'Positional placeholders',
    template: 'Deploy {{1}} to {{2}}',
  };
  this.promptToRun = prompt;
  this.placeholderKeys = ['1', '2'];
  await setPrompts(this, [prompt]);
});

When('I run the prompt', async function () {
  await openPromptPalette(this);
  const name = this.promptToRun?.name || this.promptList?.[0];
  await this.page.locator(`#promptsPaletteList [data-prompt-name="${name}"]`).click();
});

Then('I am asked to fill each placeholder', async function () {
  await expect(this.page.locator('#promptFillPanel')).toBeVisible({ timeout: 5000 });
  const inputs = this.page.locator('#promptFillFields [data-placeholder]');
  await expect(inputs).toHaveCount(this.placeholderKeys?.length || 0);
});

Given('a prompt with named placeholders', async function () {
  const prompt = {
    id: 'named-demo',
    name: 'Issue draft',
    description: 'Named placeholders',
    template: 'Create {{title}} for {{owner}} in {{project}}',
  };
  this.promptToRun = prompt;
  this.placeholderKeys = ['title', 'owner', 'project'];
  await setPrompts(this, [prompt]);
});

Then('I can fill placeholders by name', async function () {
  await expect(this.page.locator('#promptFillPanel')).toBeVisible({ timeout: 5000 });
  for (const key of this.placeholderKeys || []) {
    await expect(this.page.locator(`#promptFillFields [data-placeholder="${key}"]`)).toBeVisible();
    await this.page.locator(`#promptFillFields [data-placeholder="${key}"]`).fill(`value-${key}`);
  }
});

Given('two prompts with the same name', async function () {
  const prompts = [
    {
      id: 'deploy-fast',
      name: 'Deploy',
      description: 'Fast deploy',
      template: 'Run fast deploy now',
    },
    {
      id: 'deploy-safe',
      name: 'Deploy',
      description: 'Safe deploy',
      template: 'Run safe deploy with checks',
    },
  ];
  this.duplicateName = 'Deploy';
  this.duplicatePrompts = prompts;
  await setPrompts(this, prompts);
});

Then('only one is shown but both are invocable', async function () {
  const group = this.page.locator(`#promptsPaletteList [data-prompt-name="${this.duplicateName}"]`);
  await expect(group).toHaveCount(1);
  await group.click();

  const duplicates = this.page.locator('#promptsDuplicatesList [data-prompt-id]');
  await expect(duplicates).toHaveCount(this.duplicatePrompts?.length || 0);

  await this.page
    .locator(`#promptsDuplicatesList [data-prompt-id="${this.duplicatePrompts?.[0]?.id}"]`)
    .click();
  await expect(this.page.locator('#prompt')).toHaveValue(this.duplicatePrompts?.[0]?.template || '');

  await openPromptPalette(this);
  await this.page.locator(`#promptsPaletteList [data-prompt-name="${this.duplicateName}"]`).click();
  await this.page
    .locator(`#promptsDuplicatesList [data-prompt-id="${this.duplicatePrompts?.[1]?.id}"]`)
    .click();
  await expect(this.page.locator('#prompt')).toHaveValue(this.duplicatePrompts?.[1]?.template || '');
});

Given('I create a new session', async function () {
  const previousPrompts = [
    {
      id: 'legacy',
      name: 'Legacy prompt',
      description: 'Old set',
      template: 'Legacy template',
    },
  ];
  const latestPrompts = [
    {
      id: 'session-latest',
      name: 'Session prompt',
      description: 'Fresh set',
      template: 'Latest template',
    },
  ];
  this.latestPromptNames = latestPrompts.map((prompt) => prompt.name);
  this.previousPromptNames = previousPrompts.map((prompt) => prompt.name);

  await setPrompts(this, previousPrompts);
  await openPromptPalette(this);
  await closePromptPalette(this);

  await setPrompts(this, latestPrompts);
  await this.page.evaluate(() => {
    window.__TEST__?.startNewSession?.();
  });
});

Then('the latest prompts are loaded', async function () {
  for (const name of this.latestPromptNames || []) {
    await expect(this.page.locator(`#promptsPaletteList [data-prompt-name="${name}"]`)).toBeVisible();
  }
  for (const name of this.previousPromptNames || []) {
    await expect(this.page.locator(`#promptsPaletteList [data-prompt-name="${name}"]`)).toHaveCount(0);
  }
});
