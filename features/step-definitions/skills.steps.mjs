import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { ensureConnected } from '../support/ui.mjs';

async function setSkills(world, skills) {
  await ensureConnected(world);
  world.skillFixtures = skills;
  await world.page.evaluate((data) => {
    window.__TEST__?.setSkills?.(data);
  }, skills);
}

async function openSkillsPalette(world) {
  await ensureConnected(world);
  await world.page.locator('#skillsPaletteBtn').click();
  await expect(world.page.locator('#skillsPalette')).toBeVisible({ timeout: 5000 });
}

Given(/^skills exist in ~\/\.codex\/skills$/, async function () {
  const skills = [
    {
      id: 'workflow-guide',
      name: 'Workflow guide',
      description: 'Step-by-step workflow outline',
      content: 'Guide me through a release checklist with owners and timelines.'
    },
    {
      id: 'bug-hunt',
      name: 'Bug hunt',
      description: 'Investigate and summarize bug reports',
      content: 'Investigate recent bugs, categorize by severity, and list next actions.'
    }
  ];
  this.skillNames = skills.map((skill) => skill.name);
  await setSkills(this, skills);
});

When('I open the skills palette', async function () {
  await openSkillsPalette(this);
});

Then('I see available skills', async function () {
  for (const name of this.skillNames || []) {
    await expect(this.page.locator(`#skillsPaletteList [data-skill-name="${name}"]`)).toBeVisible();
  }
});

Given('a skill is selected', async function () {
  const skills = [
    {
      id: 'launch-plan',
      name: 'Launch plan',
      description: 'Create a launch checklist',
      content: 'Draft a launch plan with milestones and risk tracking.'
    }
  ];
  this.selectedSkill = skills[0];
  await setSkills(this, skills);
  await openSkillsPalette(this);
  await this.page.locator(`#skillsPaletteList [data-skill-id="${this.selectedSkill.id}"]`).click();
  await expect(this.page.locator('#skillsInsertBtn')).toBeEnabled();
});

When('I insert the skill', async function () {
  await this.page.locator('#skillsInsertBtn').click();
});

Then('the prompt is populated with the skill content', async function () {
  await expect(this.page.locator('#prompt')).toHaveValue(this.selectedSkill?.content || '');
});
