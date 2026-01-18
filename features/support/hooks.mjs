import { BeforeAll, AfterAll, Before, After } from '@cucumber/cucumber';
import { chromium } from 'playwright';
import { startServer, stopServer } from './server.mjs';

let browser;
let server;

function isHeadless() {
  return process.env.HEADLESS !== '0';
}

BeforeAll(async function () {
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8080';
  server = await startServer({
    env: { CODEX_MOCK: '1', MOCK_THREAD_ID_DELAY: '1' },
    url: baseURL,
  });

  browser = await chromium.launch({ headless: isHeadless() });
});

AfterAll(async function () {
  if (browser) {
    await browser.close();
    browser = null;
  }
  if (server) {
    await stopServer(server);
    server = null;
  }
});

Before(async function () {
  const baseURL = this.parameters?.baseURL || process.env.BASE_URL || 'http://127.0.0.1:8080';
  this.context = await browser.newContext({ baseURL });
  this.page = await this.context.newPage();
  this.sentPrompts = [];
  this.pendingThreadIds = null;
  this.selectedModel = null;
  this.selectedReasoning = null;
});

After(async function (scenario) {
  if (scenario.result?.status === 'FAILED' && this.page) {
    if (typeof this.attach === 'function') {
      const screenshot = await this.page.screenshot({ fullPage: true });
      await this.attach(screenshot, 'image/png');
    }
  }
  if (this.context) {
    await this.context.close();
    this.context = null;
  }
  this.page = null;
});
