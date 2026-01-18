import { test, expect } from '@playwright/test';

test.describe('Codex WebSocket UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for WebSocket connection
    await expect(page.locator('#statusText')).toHaveText('Connected');
  });

  test('should display agent message response after sending "Hello"', async ({ page }) => {
    // This test validates the bug: "I can't see the agent's output anywhere"
    // The agent message should be visible after the turn completes
    
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');
    const output = page.locator('#output');

    // Send a message
    await input.fill('Hello');
    await sendButton.click();

    // Wait for the agent message to appear (💬 emoji marks agent messages)
    // This should contain the actual response text from the mock
    const agentMessage = page.locator('.message.assistant').filter({ hasText: '💬' });
    
    await expect(agentMessage).toBeVisible({ timeout: 10000 });
    
    // Verify the agent message contains expected response content
    await expect(agentMessage).toContainText('Hello!');
    await expect(agentMessage).toContainText('mock Codex assistant');
  });

  test('should display reasoning message', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello');
    await sendButton.click();

    // Reasoning messages have the 🤔 emoji and the "reasoning" class
    const reasoningMessage = page.locator('.message.reasoning');
    
    await expect(reasoningMessage).toBeVisible({ timeout: 10000 });
    await expect(reasoningMessage).toContainText('🤔');
    await expect(reasoningMessage).toContainText('analyzing');
  });

  test('should display todo list updates', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello');
    await sendButton.click();

    // Todo list messages have the 📋 emoji and the "todo" class
    const todoMessage = page.locator('.message.todo');
    
    await expect(todoMessage.first()).toBeVisible({ timeout: 10000 });
    await expect(todoMessage.first()).toContainText('📋');
  });

  test('should display token usage stats after turn completes', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello');
    await sendButton.click();

    // Usage stats have the 📊 emoji and the "usage" class
    const usageMessage = page.locator('.message.usage');
    
    await expect(usageMessage).toBeVisible({ timeout: 10000 });
    await expect(usageMessage).toContainText('📊');
    await expect(usageMessage).toContainText('Tokens');
  });

  test('should display command execution for command requests', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    // Send a message that triggers command execution
    await input.fill('Please run npm install');
    await sendButton.click();

    // Command messages have the ⚡ emoji and the "command" class
    const commandMessage = page.locator('.message.command');
    
    await expect(commandMessage).toBeVisible({ timeout: 10000 });
    await expect(commandMessage).toContainText('⚡');
    await expect(commandMessage).toContainText('npm install');
    await expect(commandMessage).toContainText('exit: 0');
  });

  test('should display file change for file requests', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    // Send a message that triggers file changes
    await input.fill('Create a new file called test.js');
    await sendButton.click();

    // File change messages have the 📝 emoji and the "file-change" class
    const fileMessage = page.locator('.message.file-change');
    
    await expect(fileMessage).toBeVisible({ timeout: 10000 });
    await expect(fileMessage).toContainText('📝');
    await expect(fileMessage).toContainText('File Changes');
  });

  test('should stream agent message text progressively', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello');
    await sendButton.click();

    // The agent message starts empty and gets filled progressively
    // We should see intermediate states as text streams in
    const agentMessage = page.locator('.message.assistant').filter({ hasText: '💬' });
    
    // Eventually the full message should appear
    await expect(agentMessage).toBeVisible({ timeout: 10000 });
    
    // Verify final content includes expected text
    await expect(agentMessage).toContainText('Hello!');
  });

  test('should reuse the same thread for multiple messages', async ({ page }) => {
    // This test validates the fix for: "Every chat message starts a new thread"
    // Multiple messages should use the same thread, not create new ones
    
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');
    const threadSelector = page.locator('#threadSelector');
    // Send first message
    await input.fill('First message');
    await sendButton.click();

    // Wait for response to complete (usage message indicates turn completion)
    await expect(page.locator('.message.usage').first()).toBeVisible({ timeout: 10000 });

    const firstThreadIds = await page.$$eval('#threadSelector option', options =>
      options.map(o => o.value).filter(Boolean)
    );
    expect(firstThreadIds.length).toBe(1);
    const firstThreadId = firstThreadIds[0];

    // Send second message
    await input.fill('Second message');
    await sendButton.click();

    // Wait for second response to complete
    await expect(page.locator('.message.usage')).toHaveCount(2, { timeout: 10000 });

    const secondThreadIds = await page.$$eval('#threadSelector option', options =>
      options.map(o => o.value).filter(Boolean)
    );
    expect(secondThreadIds.length).toBe(1);
    const secondThreadId = secondThreadIds[0];

    // Both messages should use the SAME thread ID
    expect(secondThreadId).toBe(firstThreadId);

    // Thread selector should still only have 2 options (placeholder + 1 thread)
    await expect(threadSelector.locator('option')).toHaveCount(2);
    await expect(page.locator('.message').filter({ hasText: /Thread started:/ })).toHaveCount(1);
  });

  test('should replace pending thread ID with real thread ID after first message', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');
    const newThreadBtn = page.locator('#newThreadBtn');

    await newThreadBtn.click();

    await expect(page.locator('.message').filter({ hasText: /New thread created:/ })).toBeVisible({ timeout: 5000 });

    const pendingIds = await page.$$eval('#threadSelector option', options =>
      options.map(o => o.value).filter(Boolean)
    );
    expect(pendingIds.some(id => id.startsWith('pending_'))).toBeTruthy();

    await input.fill('Kick off the new thread');
    await sendButton.click();

    await expect(page.locator('.message').filter({ hasText: /Thread ID assigned:/ })).toBeVisible({ timeout: 10000 });

    const resolvedIds = await page.$$eval('#threadSelector option', options =>
      options.map(o => o.value).filter(Boolean)
    );
    expect(resolvedIds.some(id => id.startsWith('pending_'))).toBeFalsy();
    expect(resolvedIds.some(id => id.startsWith('thread_'))).toBeTruthy();
  });

  test('should announce thread_id_assigned in the UI', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');
    const newThreadBtn = page.locator('#newThreadBtn');

    await newThreadBtn.click();
    await expect(page.locator('.message').filter({ hasText: /New thread created:/ })).toBeVisible({ timeout: 5000 });

    await input.fill('Trigger thread assignment');
    await sendButton.click();

    await expect(page.locator('.message').filter({ hasText: /Thread ID assigned:/ })).toBeVisible({ timeout: 10000 });
  });

  test('should not announce thread started on every message in same thread', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('First message same thread');
    await sendButton.click();

    await expect(page.locator('.message').filter({ hasText: /Thread started:/ })).toHaveCount(1, { timeout: 10000 });

    await input.fill('Second message same thread');
    await sendButton.click();

    await expect(page.locator('.message').filter({ hasText: /Thread started:/ })).toHaveCount(1, { timeout: 10000 });
  });

  test('should render concurrent agent messages without overwriting', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('First concurrent message');
    await sendButton.click();

    await input.fill('Second concurrent message');
    await sendButton.click();

    const agentMessages = page.locator('.message.assistant').filter({ hasText: '💬' });
    await expect(agentMessages).toHaveCount(2, { timeout: 15000 });

    await expect(agentMessages.nth(0)).toContainText('First concurrent message');
    await expect(agentMessages.nth(1)).toContainText('Second concurrent message');
  });

  test('should support multiple threads', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');
    const newThreadBtn = page.locator('#newThreadBtn');
    const threadSelector = page.locator('#threadSelector');

    // Send a message in first thread
    await input.fill('Hello from thread 1');
    await sendButton.click();

    // Wait for response to complete
    await expect(page.locator('.message.assistant').filter({ hasText: '💬' })).toBeVisible({ timeout: 10000 });
    
    // Wait for thread to be added to selector (should have 2 options now: placeholder + thread1)
    await expect(threadSelector.locator('option')).toHaveCount(2, { timeout: 5000 });

    // Create new thread
    await newThreadBtn.click();
    
    // Wait for new thread creation to complete (thread_created event)
    await expect(threadSelector.locator('option')).toHaveCount(3, { timeout: 5000 });

    // New thread should have minimal messages
    // A fresh thread typically has 1-2 system messages (e.g., "new thread created")
    // We use threshold of 5 to allow some flexibility while catching bugs where
    // old thread content bleeds into the new thread
    const MAX_NEW_THREAD_MESSAGES = 5;
    const messages = page.locator('.message');
    const messageCount = await messages.count();
    expect(messageCount).toBeLessThan(MAX_NEW_THREAD_MESSAGES);
  });

  test('should show connected status indicator', async ({ page }) => {
    const statusDot = page.locator('#statusDot');
    const statusText = page.locator('#statusText');

    await expect(statusDot).not.toHaveClass(/disconnected/);
    await expect(statusText).toHaveText('Connected');
  });

  test('should display mock mode badge when in mock mode', async ({ page }) => {
    const mockBadge = page.locator('.mock-badge');
    
    await expect(mockBadge).toBeVisible();
    await expect(mockBadge).toHaveText('MOCK MODE');
  });

  test('should display user message with proper formatting', async ({ page }) => {
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello world');
    await sendButton.click();

    // User messages have the "user" class and start with "> "
    const userMessage = page.locator('.message.user');
    
    await expect(userMessage.first()).toBeVisible();
    await expect(userMessage.first()).toContainText('> Hello world');
  });

  test('should complete full conversation flow', async ({ page }) => {
    // This test validates the complete flow mentioned in the bug report:
    // "I get a thinking message, I get a summary, I get a started message"
    // AND the agent's output should be visible at the end
    
    const input = page.locator('#prompt');
    const sendButton = page.locator('button[type="submit"]');

    await input.fill('Hello');
    await sendButton.click();

    // 1. Should see "Processing..." message (turn.started)
    await expect(page.locator('.message').filter({ hasText: 'Processing...' })).toBeVisible({ timeout: 5000 });

    // 2. Should see reasoning/thinking message (🤔)
    await expect(page.locator('.message.reasoning')).toBeVisible({ timeout: 10000 });

    // 3. Should see todo list (summary)
    await expect(page.locator('.message.todo').first()).toBeVisible({ timeout: 10000 });

    // 4. CRITICAL: Should see the agent's output (💬) - this is the bug fix validation
    const agentMessage = page.locator('.message.assistant').filter({ hasText: '💬' });
    await expect(agentMessage).toBeVisible({ timeout: 10000 });
    
    // 5. Should see token usage (turn completed)
    await expect(page.locator('.message.usage')).toBeVisible({ timeout: 10000 });

    // Final verification: agent message has actual content, not empty
    const agentText = await agentMessage.textContent();
    expect(agentText).toBeTruthy();
    expect(agentText.length).toBeGreaterThan(10); // More than just the emoji
  });
});
