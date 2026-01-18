// Mock implementation of the Codex SDK for testing without auth
// This simulates the behavior of the real @openai/codex-sdk
// Based on https://github.com/openai/codex/tree/main/sdk/typescript

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * @typedef {Object} CodexOptions
 * @property {string} [codexPathOverride]
 * @property {string} [baseUrl]
 * @property {string} [apiKey]
 * @property {Record<string, string>} [env]
 */

/**
 * @typedef {Object} ThreadOptions
 * @property {string} [model]
 * @property {'read-only' | 'workspace-write' | 'danger-full-access'} [sandboxMode]
 * @property {string} [workingDirectory]
 * @property {boolean} [skipGitRepoCheck]
 * @property {'minimal' | 'low' | 'medium' | 'high' | 'xhigh'} [modelReasoningEffort]
 * @property {boolean} [networkAccessEnabled]
 * @property {'disabled' | 'cached' | 'live'} [webSearchMode]
 * @property {boolean} [webSearchEnabled]
 * @property {'never' | 'on-request' | 'on-failure' | 'untrusted'} [approvalPolicy]
 * @property {string[]} [additionalDirectories]
 */

/**
 * @typedef {Object} TurnOptions
 * @property {unknown} [outputSchema]
 * @property {AbortSignal} [signal]
 */

/**
 * @typedef {Object} Usage
 * @property {number} input_tokens
 * @property {number} cached_input_tokens
 * @property {number} output_tokens
 */

/**
 * @typedef {Object} AgentMessageItem
 * @property {string} id
 * @property {'agent_message'} type
 * @property {string} text
 */

/**
 * @typedef {Object} ReasoningItem
 * @property {string} id
 * @property {'reasoning'} type
 * @property {string} text
 */

/**
 * @typedef {Object} CommandExecutionItem
 * @property {string} id
 * @property {'command_execution'} type
 * @property {string} command
 * @property {string} aggregated_output
 * @property {number} [exit_code]
 * @property {'in_progress' | 'completed' | 'failed'} status
 */

/**
 * @typedef {Object} FileUpdateChange
 * @property {string} path
 * @property {'add' | 'delete' | 'update'} kind
 */

/**
 * @typedef {Object} FileChangeItem
 * @property {string} id
 * @property {'file_change'} type
 * @property {FileUpdateChange[]} changes
 * @property {'completed' | 'failed'} status
 */

/**
 * @typedef {Object} TodoItem
 * @property {string} text
 * @property {boolean} completed
 */

/**
 * @typedef {Object} TodoListItem
 * @property {string} id
 * @property {'todo_list'} type
 * @property {TodoItem[]} items
 */

/**
 * @typedef {Object} WebSearchItem
 * @property {string} id
 * @property {'web_search'} type
 * @property {string} query
 */

/**
 * @typedef {Object} McpToolCallItem
 * @property {string} id
 * @property {'mcp_tool_call'} type
 * @property {string} server
 * @property {string} tool
 * @property {unknown} arguments
 * @property {{ content: unknown[], structured_content: unknown }} [result]
 * @property {{ message: string }} [error]
 * @property {'in_progress' | 'completed' | 'failed'} status
 */

/**
 * @typedef {Object} ErrorItem
 * @property {string} id
 * @property {'error'} type
 * @property {string} message
 */

/**
 * @typedef {AgentMessageItem | ReasoningItem | CommandExecutionItem | FileChangeItem | TodoListItem | WebSearchItem | McpToolCallItem | ErrorItem} ThreadItem
 */

/**
 * Mock Codex class that simulates the real SDK behavior
 * @see https://github.com/openai/codex/blob/main/sdk/typescript/src/codex.ts
 */
export const mockModelCatalog = [
  {
    id: "mock-model-default",
    model: "gpt-test-model",
    displayName: "GPT Test Model",
    description: "Mock default model for tests",
    supportedReasoningEfforts: [
      { reasoningEffort: "minimal", description: "Minimal reasoning" },
      { reasoningEffort: "low", description: "Low reasoning" },
      { reasoningEffort: "medium", description: "Medium reasoning" },
      { reasoningEffort: "high", description: "High reasoning" },
      { reasoningEffort: "xhigh", description: "Extra high reasoning" },
    ],
    defaultReasoningEffort: "medium",
    isDefault: true,
  },
  {
    id: "mock-model-alt",
    model: "gpt-test-model-lite",
    displayName: "GPT Test Model Lite",
    description: "Mock alternate model for tests",
    supportedReasoningEfforts: [
      { reasoningEffort: "minimal", description: "Minimal reasoning" },
      { reasoningEffort: "low", description: "Low reasoning" },
      { reasoningEffort: "medium", description: "Medium reasoning" },
    ],
    defaultReasoningEffort: "low",
    isDefault: false,
  },
];

export class MockCodex {
  /**
   * @param {CodexOptions} options
   */
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Starts a new conversation with an agent.
   * @param {ThreadOptions} options
   * @returns {MockThread}
   */
  startThread(options = {}) {
    return new MockThread(this.options, options);
  }

  /**
   * Resumes a conversation with an agent based on the thread id.
   * @param {string} id - The id of the thread to resume.
   * @param {ThreadOptions} options
   * @returns {MockThread}
   */
  resumeThread(id, options = {}) {
    return new MockThread(this.options, options, id);
  }
}

/**
 * Mock Thread class that simulates agent interactions
 * @see https://github.com/openai/codex/blob/main/sdk/typescript/src/thread.ts
 */
class MockThread {
  /**
   * @param {CodexOptions} codexOptions
   * @param {ThreadOptions} threadOptions
   * @param {string | null} existingId
   */
  constructor(codexOptions = {}, threadOptions = {}, existingId = null) {
    this._codexOptions = codexOptions;
    this._threadOptions = threadOptions;
    // Generate the thread ID immediately
    // Note: In the real SDK, id is null initially and gets set after thread.started event.
    // However, for testing convenience, we make the ID available immediately.
    // For resumed threads in both real SDK and mock, the id is set immediately.
    this._pendingId = existingId || `thread_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const delayThreadId = process.env.MOCK_THREAD_ID_DELAY === "1" || process.env.MOCK_THREAD_ID_DELAY === "true";
    this._id = delayThreadId ? null : this._pendingId;
  }

  /**
   * Returns the ID of the thread.
   * Note: In the real SDK, this is null until the first turn starts.
   * In the mock, it's available immediately for testing convenience.
   * @returns {string | null}
   */
  get id() {
    return this._id;
  }

  async ensureWorkingDirectory() {
    if (this._threadOptions?.workingDirectory) {
      await fs.mkdir(this._threadOptions.workingDirectory, { recursive: true });
      return this._threadOptions.workingDirectory;
    }
    const created = await fs.mkdtemp(path.join(os.tmpdir(), "codex-ws-ui-mock-"));
    if (!this._threadOptions) this._threadOptions = {};
    this._threadOptions.workingDirectory = created;
    return created;
  }

  extractFileChangeFromInput(input) {
    const normalizedInput = String(input).replaceAll("\\", "/");
    const namedMatch = normalizedInput.match(/(?:called|named)\s+["'`]?([^"'`\s]+)["'`]?/i);
    const genericMatch = normalizedInput.match(/([A-Za-z0-9_./-]+\.[A-Za-z0-9]+)\b/);
    const filePath = (namedMatch && namedMatch[1]) || (genericMatch && genericMatch[1]) || "example.js";

    const kind = /delete|remove/i.test(input)
      ? "delete"
      : /create|new/i.test(input)
        ? "add"
        : "update";

    return { path: filePath, kind };
  }

  async applyMockFileChanges(changes, input) {
    const workingDirectory = await this.ensureWorkingDirectory();
    for (const change of changes) {
      const absPath = path.isAbsolute(change.path)
        ? change.path
        : path.join(workingDirectory, change.path);
      if (change.kind === "delete") {
        await fs.rm(absPath, { force: true });
        continue;
      }

      await fs.mkdir(path.dirname(absPath), { recursive: true });

      if (change.kind === "add") {
        const promptSummary = String(input).replaceAll("\n", " ").slice(0, 200);
        const contents = [
          "// mock file created by codex-ws-ui",
          `// prompt: ${promptSummary}`,
          'console.log("hello from mock");',
          "",
        ].join("\n");
        await fs.writeFile(absPath, contents, "utf8");
        continue;
      }

      // update
      let existing = "";
      try {
        existing = await fs.readFile(absPath, "utf8");
      } catch {}
      const nextLine = 'console.log("updated by mock");';
      const separator = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
      await fs.writeFile(absPath, existing + separator + nextLine + "\n", "utf8");
    }
  }

  /**
   * Provides the input to the agent and streams events as they are produced during the turn.
   * @param {string | Array<{type: 'text', text: string} | {type: 'local_image', path: string}>} input
   * @param {TurnOptions} turnOptions
   * @returns {Promise<{events: AsyncGenerator<Object>}>}
   */
  async runStreamed(input, turnOptions = {}) {
    // Normalize input - real SDK supports string or UserInput[]
    const normalizedInput = typeof input === 'string' ? input : input.map(i => i.type === 'text' ? i.text : `[image: ${i.path}]`).join('\n\n');
    const events = this.generateMockEvents(normalizedInput, turnOptions);
    return { events };
  }

  /**
   * Provides the input to the agent and returns the completed turn.
   * @param {string | Array<{type: 'text', text: string} | {type: 'local_image', path: string}>} input
   * @param {TurnOptions} turnOptions
   * @returns {Promise<{items: ThreadItem[], finalResponse: string, usage: Usage | null}>}
   */
  async run(input, turnOptions = {}) {
    const items = [];
    let finalResponse = "";
    let usage = null;
    let turnFailure = null;

    // Collect all events - matches real SDK behavior
    const { events } = await this.runStreamed(input, turnOptions);
    for await (const event of events) {
      if (event.type === "item.completed") {
        if (event.item.type === "agent_message") {
          finalResponse = event.item.text;
        }
        items.push(event.item);
      } else if (event.type === "turn.completed") {
        usage = event.usage;
      } else if (event.type === "turn.failed") {
        turnFailure = event.error;
        break;
      }
    }

    if (turnFailure) {
      throw new Error(turnFailure.message);
    }

    return { items, finalResponse, usage };
  }

  /**
   * Generates mock events to simulate a realistic agent interaction
   * @param {string} input
   * @param {TurnOptions} turnOptions
   * @returns {AsyncGenerator<Object>}
   */
  async *generateMockEvents(input, turnOptions = {}) {
    // Thread started event - sets the thread ID (matches real SDK behavior)
    // The real SDK emits this on every turn since it spawns a fresh CLI process
    yield {
      type: "thread.started",
      thread_id: this._pendingId
    };
    // Update the id after thread.started (matches real SDK)
    this._id = this._pendingId;

    // Turn started event
    yield {
      type: "turn.started"
    };

    // Simulate thinking with a todo list
    const todoId = `todo_${Date.now()}`;
    yield {
      type: "item.started",
      item: {
        id: todoId,
        type: "todo_list",
        items: [
          { text: "Understand the user's request", completed: false },
          { text: "Formulate a response", completed: false },
          { text: "Send the response", completed: false }
        ]
      }
    };

    // Delay to simulate processing
    await this.delay(300);

    // Update todo - first item completed
    yield {
      type: "item.updated",
      item: {
        id: todoId,
        type: "todo_list",
        items: [
          { text: "Understand the user's request", completed: true },
          { text: "Formulate a response", completed: false },
          { text: "Send the response", completed: false }
        ]
      }
    };

    await this.delay(200);

    // Reasoning item
    const reasoningId = `reasoning_${Date.now()}`;
    yield {
      type: "item.started",
      item: {
        id: reasoningId,
        type: "reasoning",
        text: "I'm analyzing the request to provide a helpful response."
      }
    };

    yield {
      type: "item.completed",
      item: {
        id: reasoningId,
        type: "reasoning",
        text: "I'm analyzing the request to provide a helpful response."
      }
    };

    await this.delay(200);

    // Check if the user is asking about code or commands
    const needsCommand = /run|execute|command|build|test|install/i.test(input);
    const needsFiles = /file|create|write|edit|modify/i.test(input);
    const needsWebSearch = /search|find|look up|google/i.test(input);
    const needsMcpTool = /mcp|tool|plugin/i.test(input);

    // Simulate web search if relevant
    if (needsWebSearch) {
      const searchId = `search_${Date.now()}`;
      
      yield {
        type: "item.started",
        item: {
          id: searchId,
          type: "web_search",
          query: this.extractSearchQuery(input)
        }
      };

      await this.delay(400);

      yield {
        type: "item.completed",
        item: {
          id: searchId,
          type: "web_search",
          query: this.extractSearchQuery(input)
        }
      };
    }

    // Simulate MCP tool call if relevant
    if (needsMcpTool) {
      const mcpId = `mcp_${Date.now()}`;
      
      yield {
        type: "item.started",
        item: {
          id: mcpId,
          type: "mcp_tool_call",
          server: "mock-server",
          tool: "mock-tool",
          arguments: { input: input },
          status: "in_progress"
        }
      };

      await this.delay(500);

      yield {
        type: "item.completed",
        item: {
          id: mcpId,
          type: "mcp_tool_call",
          server: "mock-server",
          tool: "mock-tool",
          arguments: { input: input },
          result: {
            content: [{ type: "text", text: "Mock MCP tool result" }],
            structured_content: null
          },
          status: "completed"
        }
      };
    }

    // Simulate command execution if relevant
    if (needsCommand) {
      const commandId = `cmd_${Date.now()}`;
      const mockCommand = this.getMockCommand(input);
      
      yield {
        type: "item.started",
        item: {
          id: commandId,
          type: "command_execution",
          command: mockCommand,
          aggregated_output: "",
          status: "in_progress"
        }
      };

      await this.delay(500);

      yield {
        type: "item.updated",
        item: {
          id: commandId,
          type: "command_execution",
          command: mockCommand,
          aggregated_output: "Executing command...\n",
          status: "in_progress"
        }
      };

      await this.delay(300);

      yield {
        type: "item.completed",
        item: {
          id: commandId,
          type: "command_execution",
          command: mockCommand,
          aggregated_output: "Executing command...\nCommand completed successfully.\n",
          exit_code: 0,
          status: "completed"
        }
      };
    }

    // Simulate file changes if relevant
    if (needsFiles) {
      const fileId = `file_${Date.now()}`;
      const fileChange = this.extractFileChangeFromInput(input);
      const changes = [fileChange];

      await this.ensureWorkingDirectory();
      
      yield {
        type: "item.started",
        item: {
          id: fileId,
          type: "file_change",
          changes,
          status: "completed"
        }
      };

      await this.applyMockFileChanges(changes, input);

      yield {
        type: "item.completed",
        item: {
          id: fileId,
          type: "file_change",
          changes,
          status: "completed"
        }
      };
    }

    await this.delay(200);

    // Update todo - second item completed
    yield {
      type: "item.updated",
      item: {
        id: todoId,
        type: "todo_list",
        items: [
          { text: "Understand the user's request", completed: true },
          { text: "Formulate a response", completed: true },
          { text: "Send the response", completed: false }
        ]
      }
    };

    await this.delay(300);

    // Agent message (final response)
    const messageId = `msg_${Date.now()}`;
    const response = turnOptions?.outputSchema
      ? JSON.stringify(this.generateStructuredOutput(input, turnOptions))
      : this.generateResponse(input);
    
    yield {
      type: "item.started",
      item: {
        id: messageId,
        type: "agent_message",
        text: ""
      }
    };

    // Stream the response word by word
    const words = response.split(" ");
    let currentText = "";
    for (const word of words) {
      currentText += (currentText ? " " : "") + word;
      yield {
        type: "item.updated",
        item: {
          id: messageId,
          type: "agent_message",
          text: currentText
        }
      };
      await this.delay(50);
    }

    yield {
      type: "item.completed",
      item: {
        id: messageId,
        type: "agent_message",
        text: response
      }
    };

    // Complete the todo list
    yield {
      type: "item.updated",
      item: {
        id: todoId,
        type: "todo_list",
        items: [
          { text: "Understand the user's request", completed: true },
          { text: "Formulate a response", completed: true },
          { text: "Send the response", completed: true }
        ]
      }
    };

    yield {
      type: "item.completed",
      item: {
        id: todoId,
        type: "todo_list",
        items: [
          { text: "Understand the user's request", completed: true },
          { text: "Formulate a response", completed: true },
          { text: "Send the response", completed: true }
        ]
      }
    };

    // Turn completed with usage stats
    yield {
      type: "turn.completed",
      usage: {
        input_tokens: Math.floor(input.length / 4),
        cached_input_tokens: 0,
        output_tokens: Math.floor(response.length / 4)
      }
    };
  }

  /**
   * Extracts a search query from the input
   * @param {string} input
   * @returns {string}
   */
  extractSearchQuery(input) {
    // Simple extraction - remove common search phrases
    const query = input
      .replace(/search for|look up|find|google/gi, '')
      .trim()
      .substring(0, 100);
    // Return fallback query if extraction results in empty string
    return query || 'mock search query';
  }

  /**
   * Generates a mock command based on the input
   * @param {string} input
   * @returns {string}
   */
  getMockCommand(input) {
    if (/npm|node/i.test(input)) return "npm install";
    if (/python|pip/i.test(input)) return "python script.py";
    if (/build/i.test(input)) return "npm run build";
    if (/test/i.test(input)) return "npm test";
    return "echo 'Command executed'";
  }

  /**
   * Generates a contextual response based on the input
   * @param {string} input
   * @returns {string}
   */
  generateResponse(input) {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
      return "Hello! I'm a mock Codex assistant. I can help you test the WebSocket UI without needing auth. Try asking me to do different things!";
    }
    
    if (lowerInput.includes("help")) {
      return "I'm a mock assistant that simulates the Codex SDK behavior. I can demonstrate:\n- Todo lists\n- Reasoning\n- Command execution (when you mention 'run', 'execute', 'build', 'test')\n- File changes (when you mention 'file', 'create', 'write', 'edit')\n- Web search (when you mention 'search', 'find', 'look up')\n- MCP tool calls (when you mention 'mcp', 'tool', 'plugin')\n\nTry asking me to 'run a build' or 'create a file'!";
    }
    
    if (lowerInput.includes("search") || lowerInput.includes("find") || lowerInput.includes("look up")) {
      return "I've simulated a web search for you. In a real scenario, I would fetch and analyze search results to provide relevant information.";
    }
    
    if (lowerInput.includes("mcp") || lowerInput.includes("tool") || lowerInput.includes("plugin")) {
      return "I've simulated an MCP tool call. The Model Context Protocol allows integration with external tools and services.";
    }
    
    if (lowerInput.includes("file") || lowerInput.includes("create") || lowerInput.includes("write")) {
      return "I've simulated creating/modifying a file for you. In a real scenario, I would make actual file changes to your codebase.";
    }
    
    if (lowerInput.includes("run") || lowerInput.includes("execute") || lowerInput.includes("command")) {
      return "I've simulated executing a command. The mock shows how command execution events flow through the system.";
    }
    
    if (lowerInput.includes("test")) {
      return "Great! This is the mock Codex SDK in action. All the events you see are simulated but follow the same structure as the real SDK. This lets you develop and test the UI without authentication.";
    }
    
    // Default response
    return `I received your message: "${input}". This is a mock response showing how the Codex SDK streams events. The real SDK would provide actual AI-powered assistance for coding tasks.`;
  }

  /**
   * Generates a structured output payload when schema is provided
   * @param {string} input
   * @param {TurnOptions} turnOptions
   * @returns {Object}
   */
  generateStructuredOutput(input, turnOptions = {}) {
    const preview = String(input).slice(0, 120);
    return {
      status: "ok",
      echo: preview,
      schemaProvided: Boolean(turnOptions.outputSchema)
    };
  }

  /**
   * Helper to add delays in the event stream
   * @param {number} ms
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const Codex = MockCodex;
