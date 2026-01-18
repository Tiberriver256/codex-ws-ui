import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

async function openSessionsPanel(world) {
  await openApp(world);
  await world.page.locator('#sessionsPanelBtn').click();
  await expect(world.page.locator('#sessionsPanel')).toBeVisible();
}

Given('sessions exist for this workspace', async function () {
  await openApp(this);
  this.workspaceRoot = await this.page.evaluate(() => window.__APP_CONFIG__?.workspaceRoot || '');
  const hasSessions = await this.page.evaluate(() => (window.__APP_CONFIG__?.mockSessions || []).length > 0);
  expect(hasSessions).toBeTruthy();
});

When('I open the session picker', async function () {
  await openSessionsPanel(this);
});

Then('I see sessions with id, cwd, branch, and last run', async function () {
  const card = this.page.locator('.session-card').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.session-id')).not.toHaveText('');
  await expect(card.locator('[data-session-field="cwd"]')).not.toHaveText('');
  await expect(card.locator('[data-session-field="branch"]')).not.toHaveText('');
  await expect(card.locator('[data-session-field="lastRun"]')).not.toHaveText('');
});

Given('a session exists', async function () {
  await openSessionsPanel(this);
  const first = this.page.locator('.session-card').first();
  this.sessionId = await first.getAttribute('data-session-id');
  expect(this.sessionId).toBeTruthy();
});

When('I resume the session by id', async function () {
  await this.page.locator('#resumeSessionId').fill(this.sessionId || '');
  await this.page.locator('#resumeSessionBtn').click();
});

Then('the session loads and the thread is active', async function () {
  await expect(this.page.locator('#activeSessionId')).toHaveText(this.sessionId || '');
  await expect(this.page.locator('.message').filter({ hasText: /Resumed session/ })).toBeVisible();
});

Given('I have a previous session', async function () {
  await openSessionsPanel(this);
  const sessions = await this.page.$$eval('.session-card', (cards) =>
    cards.map((card) => ({
      id: card.dataset.sessionId,
      lastRun: Number(card.dataset.lastRun || 0),
    }))
  );
  sessions.sort((a, b) => b.lastRun - a.lastRun);
  this.lastSessionId = sessions[0]?.id;
  expect(this.lastSessionId).toBeTruthy();
});

When('I choose resume last', async function () {
  await this.page.locator('#resumeLastSessionBtn').click();
});

Then('the most recent session is restored', async function () {
  await expect(this.page.locator('#activeSessionId')).toHaveText(this.lastSessionId || '');
});

Given('sessions exist in other workspaces', async function () {
  await openApp(this);
  this.workspaceRoot = await this.page.evaluate(() => window.__APP_CONFIG__?.workspaceRoot || '');
  const hasOther = await this.page.evaluate((root) =>
    (window.__APP_CONFIG__?.mockSessions || []).some((session) => session.workspaceRoot && session.workspaceRoot !== root),
    this.workspaceRoot
  );
  expect(hasOther).toBeTruthy();
});

When('I enable show all sessions', async function () {
  await openSessionsPanel(this);
  const toggle = this.page.locator('#showAllSessions');
  await toggle.check();
});

Then('the session picker includes them', async function () {
  const hasOther = await this.page.$$eval('.session-card', (cards, root) =>
    cards.some((card) => card.dataset.workspaceRoot && card.dataset.workspaceRoot !== root),
    this.workspaceRoot
  );
  expect(hasOther).toBeTruthy();
});

Given('I want to run a prompt on the last session', async function () {
  await openSessionsPanel(this);
  this.execPrompt = 'Run follow-up check';
});

When('I run exec resume last with a new prompt', async function () {
  await this.page.locator('#execResumePrompt').fill(this.execPrompt || '');
  await this.page.locator('#execResumeLastBtn').click();
});

Then('the session resumes and the prompt runs', async function () {
  await expect(this.page.locator('.message').filter({ hasText: /Exec resume last/ })).toBeVisible();
  await expect(this.page.locator('.message').filter({ hasText: new RegExp(this.execPrompt || '') })).toBeVisible();
});

Given('I update thread options or metadata', async function () {
  await openSessionsPanel(this);
  const firstNote = this.page.locator('.session-note input').first();
  this.sessionNote = `note-${Date.now()}`;
  await firstNote.fill(this.sessionNote);
});

When('I return to the session list', async function () {
  await this.page.locator('#closeSessionsBtn').click();
  await openSessionsPanel(this);
});

Then('the metadata is preserved', async function () {
  const firstNote = this.page.locator('.session-note input').first();
  await expect(firstNote).toHaveValue(this.sessionNote || '');
});
