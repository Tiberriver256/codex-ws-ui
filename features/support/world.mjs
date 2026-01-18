import { setWorldConstructor, setDefaultTimeout } from '@cucumber/cucumber';

setDefaultTimeout(60 * 1000);

class CustomWorld {
  constructor({ parameters }) {
    this.parameters = parameters;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.server = null;
    this.sentPrompts = [];
    this.pendingThreadIds = null;
    this.selectedModel = null;
    this.selectedReasoning = null;
    this.structuredSchema = null;
    this.structuredOutput = null;
  }
}

setWorldConstructor(CustomWorld);
