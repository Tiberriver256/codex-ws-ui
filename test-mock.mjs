#!/usr/bin/env node
/**
 * Test script for the mock Codex SDK
 * This validates that the mock works correctly without needing auth
 */

import { Codex } from "./mock-codex.mjs";

console.log("🧪 Testing Mock Codex SDK\n");

async function testBasicInteraction() {
  console.log("Test 1: Basic interaction");
  const codex = new Codex();
  const thread = codex.startThread({ skipGitRepoCheck: true });
  
  // Thread ID is available immediately in the mock (for testing convenience)
  // Note: In the real SDK, thread.id would be null until first turn starts
  console.log(`  Thread ID (before turn): ${thread.id}`);
  const initialId = thread.id;
  
  const { events } = await thread.runStreamed("Hello!");
  
  let eventCount = 0;
  let threadIdFromEvent = null;
  for await (const event of events) {
    eventCount++;
    console.log(`  Event ${eventCount}: ${event.type}`);
    
    if (event.type === "thread.started") {
      threadIdFromEvent = event.thread_id;
      console.log(`  Thread ID from event: ${threadIdFromEvent}`);
    }
    
    if (event.type === "item.completed" && event.item.type === "agent_message") {
      console.log(`  Response: ${event.item.text.substring(0, 50)}...`);
    }
  }
  
  // After turn, thread ID should match the event ID
  console.log(`  Thread ID (after turn): ${thread.id}`);
  if (thread.id !== threadIdFromEvent) {
    throw new Error(`Thread ID should match the one from thread.started event. Expected: ${threadIdFromEvent}, got: ${thread.id}`);
  }
  if (thread.id !== initialId) {
    throw new Error(`Thread ID should remain consistent. Expected: ${initialId}, got: ${thread.id}`);
  }
  
  console.log(`✅ Received ${eventCount} events\n`);
}

async function testCommandExecution() {
  console.log("Test 2: Command execution");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const { events } = await thread.runStreamed("Run npm install");
  
  let hasCommand = false;
  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "command_execution") {
      console.log(`  Command: ${event.item.command}`);
      console.log(`  Status: ${event.item.status}`);
      console.log(`  Exit code: ${event.item.exit_code}`);
      hasCommand = true;
    }
  }
  
  console.log(hasCommand ? "✅ Command execution simulated\n" : "❌ No command execution\n");
}

async function testFileChanges() {
  console.log("Test 3: File changes");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const { events } = await thread.runStreamed("Create a new file");
  
  let hasFileChange = false;
  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "file_change") {
      console.log(`  File changes: ${event.item.changes.length}`);
      event.item.changes.forEach(c => {
        console.log(`    ${c.kind}: ${c.path}`);
      });
      hasFileChange = true;
    }
  }
  
  console.log(hasFileChange ? "✅ File changes simulated\n" : "❌ No file changes\n");
}

async function testNonStreamedAPI() {
  console.log("Test 4: Non-streamed API");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const result = await thread.run("Test the non-streamed API");
  
  console.log(`  Items: ${result.items.length}`);
  console.log(`  Final response: ${result.finalResponse.substring(0, 50)}...`);
  console.log(`  Usage: ${result.usage.input_tokens} input, ${result.usage.output_tokens} output`);
  console.log("✅ Non-streamed API works\n");
}

async function testTodoList() {
  console.log("Test 5: Todo list");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const { events } = await thread.runStreamed("Show me a todo list");
  
  let todoUpdates = 0;
  for await (const event of events) {
    if (event.type === "item.updated" && event.item.type === "todo_list") {
      todoUpdates++;
      const completed = event.item.items.filter(t => t.completed).length;
      console.log(`  Todo update ${todoUpdates}: ${completed}/${event.item.items.length} completed`);
    }
  }
  
  console.log(`✅ Received ${todoUpdates} todo updates\n`);
}

async function testWebSearch() {
  console.log("Test 6: Web search");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const { events } = await thread.runStreamed("Search for TypeScript best practices");
  
  let hasWebSearch = false;
  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "web_search") {
      console.log(`  Search query: ${event.item.query}`);
      hasWebSearch = true;
    }
  }
  
  console.log(hasWebSearch ? "✅ Web search simulated\n" : "❌ No web search\n");
}

async function testMcpToolCall() {
  console.log("Test 7: MCP tool call");
  const codex = new Codex();
  const thread = codex.startThread();
  
  const { events } = await thread.runStreamed("Use the MCP tool to get data");
  
  let hasMcpCall = false;
  for await (const event of events) {
    if (event.type === "item.completed" && event.item.type === "mcp_tool_call") {
      console.log(`  Server: ${event.item.server}`);
      console.log(`  Tool: ${event.item.tool}`);
      console.log(`  Status: ${event.item.status}`);
      hasMcpCall = true;
    }
  }
  
  console.log(hasMcpCall ? "✅ MCP tool call simulated\n" : "❌ No MCP tool call\n");
}

async function testResumeThread() {
  console.log("Test 8: Resume thread");
  const codex = new Codex();
  
  // Start a thread and get its ID
  const thread1 = codex.startThread();
  await thread1.run("First message");
  const threadId = thread1.id;
  console.log(`  Original thread ID: ${threadId}`);
  
  // Resume the same thread
  const thread2 = codex.resumeThread(threadId);
  console.log(`  Resumed thread ID: ${thread2.id}`);
  
  if (thread2.id !== threadId) {
    throw new Error("Resumed thread should have the same ID");
  }
  
  console.log("✅ Thread resume works\n");
}

async function testArrayInput() {
  console.log("Test 9: Array input (text + images)");
  const codex = new Codex();
  const thread = codex.startThread();
  
  // Test with array input like the real SDK supports
  const { events } = await thread.runStreamed([
    { type: "text", text: "Describe this" },
    { type: "local_image", path: "./test.png" }
  ]);
  
  let eventCount = 0;
  for await (const event of events) {
    eventCount++;
  }
  
  console.log(`  Events received: ${eventCount}`);
  console.log("✅ Array input works\n");
}

async function runAllTests() {
  try {
    await testBasicInteraction();
    await testCommandExecution();
    await testFileChanges();
    await testNonStreamedAPI();
    await testTodoList();
    await testWebSearch();
    await testMcpToolCall();
    await testResumeThread();
    await testArrayInput();
    
    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runAllTests();
