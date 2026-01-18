import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { openApp } from '../support/ui.mjs';

const baseServers = [
  {
    id: 'mcp-local',
    name: 'Local MCP',
    url: 'http://127.0.0.1:5150',
    requiresAuth: false
  },
  {
    id: 'mcp-secure',
    name: 'Secure MCP',
    url: 'https://mcp.example',
    requiresAuth: true,
    authStatus: 'logged-out'
  }
];

async function ensureMcpPanelOpen(world) {
  const panel = world.page.locator('#mcpPanel');
  const isHidden = await panel.evaluate((node) => node.hidden);
  if (isHidden) {
    await world.page.locator('#mcpPanelBtn').click();
    await expect(panel).toBeVisible({ timeout: 5000 });
  }
}

When('I open the MCP panel', async function () {
  await openApp(this);
  await this.page.evaluate((servers) => {
    window.__TEST__?.setMcpServers?.(servers);
  }, baseServers);
  await ensureMcpPanelOpen(this);
});

Then('I see available MCP servers and auth status', async function () {
  const cards = this.page.locator('[data-mcp-server]');
  expect(await cards.count()).toBeGreaterThan(0);
  const status = cards.first().locator('[data-mcp-status]');
  await expect(status).not.toHaveText('');
});

When('I add an MCP server', async function () {
  await openApp(this);
  await this.page.evaluate(() => {
    window.__TEST__?.setMcpServers?.([]);
  });
  await ensureMcpPanelOpen(this);
  this.mcpName = `Test MCP ${Date.now()}`;
  await this.page.locator('[data-mcp-input="name"]').fill(this.mcpName);
  await this.page.locator('[data-mcp-input="url"]').fill('https://mcp.test');
  await this.page.locator('[data-mcp-input="auth"]').check();
  await this.page.locator('[data-mcp-action="add"]').click();
});

Then('the server appears in the list', async function () {
  const list = this.page.locator('[data-mcp-list]');
  await expect(list).toContainText(this.mcpName || '');
});

Given('an MCP server exists', async function () {
  await openApp(this);
  await this.page.evaluate((servers) => {
    window.__TEST__?.setMcpServers?.(servers);
  }, baseServers);
  await ensureMcpPanelOpen(this);
  const first = this.page.locator('[data-mcp-server]').first();
  this.mcpId = await first.getAttribute('data-mcp-id');
  expect(this.mcpId).toBeTruthy();
});

When('I remove the server', async function () {
  const row = this.page.locator(`[data-mcp-id="${this.mcpId}"]`);
  await row.locator('[data-mcp-action="remove"]').click();
});

Then('it is removed from the list', async function () {
  await expect(this.page.locator(`[data-mcp-id="${this.mcpId}"]`)).toHaveCount(0);
});

Given('an MCP server requires auth', async function () {
  await openApp(this);
  const servers = [
    {
      id: 'mcp-auth',
      name: 'Auth MCP',
      url: 'https://auth.mcp',
      requiresAuth: true,
      authStatus: 'logged-out'
    }
  ];
  await this.page.evaluate((data) => {
    window.__TEST__?.setMcpServers?.(data);
  }, servers);
  await ensureMcpPanelOpen(this);
  this.mcpId = await this.page.locator('[data-mcp-server]').first().getAttribute('data-mcp-id');
});

When('I login to the server', async function () {
  const row = this.page.locator(`[data-mcp-id="${this.mcpId}"]`);
  await row.locator('[data-mcp-action="login"]').click();
});

Then('auth status is updated', async function () {
  const row = this.page.locator(`[data-mcp-id="${this.mcpId}"]`);
  const status = row.locator('[data-mcp-status]');
  await expect(status).toContainText('Logged in');
});

When('I logout of the server', async function () {
  const row = this.page.locator(`[data-mcp-id="${this.mcpId}"]`);
  await row.locator('[data-mcp-action="logout"]').click();
});

Then('auth status is cleared', async function () {
  const row = this.page.locator(`[data-mcp-id="${this.mcpId}"]`);
  const status = row.locator('[data-mcp-status]');
  await expect(status).toContainText('Logged out');
});
