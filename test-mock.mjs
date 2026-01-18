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
  
  console.log(`Thread ID: ${thread.id}`);
  
  const { events } = await thread.runStreamed("Hello!");
  
  let eventCount = 0;
  for await (const event of events) {
    eventCount++;
    console.log(`  Event ${eventCount}: ${event.type}`);
    
    if (event.type === "item.completed" && event.item.type === "agent_message") {
      console.log(`  Response: ${event.item.text.substring(0, 50)}...`);
    }
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

async function runAllTests() {
  try {
    await testBasicInteraction();
    await testCommandExecution();
    await testFileChanges();
    await testNonStreamedAPI();
    await testTodoList();
    
    console.log("✅ All tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

runAllTests();
