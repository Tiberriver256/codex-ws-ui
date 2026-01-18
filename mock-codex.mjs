// Mock implementation of the Codex SDK for testing without auth
// This simulates the behavior of the real @openai/codex-sdk

/**
 * Mock Codex class that simulates the real SDK behavior
 */
export class MockCodex {
  constructor(options = {}) {
    this.options = options;
  }

  startThread(options = {}) {
    return new MockThread(options);
  }

  resumeThread(id, options = {}) {
    return new MockThread(options, id);
  }
}

/**
 * Mock Thread class that simulates agent interactions
 */
class MockThread {
  constructor(options = {}, id = null) {
    this.options = options;
    this._id = id || `thread_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  get id() {
    return this._id;
  }

  /**
   * Simulates a streamed response with various event types
   */
  async runStreamed(input, turnOptions = {}) {
    const events = this.generateMockEvents(input);
    return { events };
  }

  /**
   * Simulates a non-streamed response
   */
  async run(input, turnOptions = {}) {
    const items = [];
    let finalResponse = "";
    let usage = null;

    // Collect all events
    const { events } = await this.runStreamed(input, turnOptions);
    for await (const event of events) {
      if (event.type === "item.completed") {
        if (event.item.type === "agent_message") {
          finalResponse = event.item.text;
        }
        items.push(event.item);
      } else if (event.type === "turn.completed") {
        usage = event.usage;
      }
    }

    return { items, finalResponse, usage };
  }

  /**
   * Generates mock events to simulate a realistic agent interaction
   */
  async *generateMockEvents(input) {
    const turnId = `turn_${Date.now()}`;
    
    // Thread started event
    yield {
      type: "thread.started",
      thread_id: this._id
    };

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
      
      yield {
        type: "item.completed",
        item: {
          id: fileId,
          type: "file_change",
          changes: [
            { path: "example.js", kind: "update" }
          ],
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
    const response = this.generateResponse(input);
    
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
   * Generates a mock command based on the input
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
   */
  generateResponse(input) {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes("hello") || lowerInput.includes("hi")) {
      return "Hello! I'm a mock Codex assistant. I can help you test the WebSocket UI without needing a real API key. Try asking me to do different things!";
    }
    
    if (lowerInput.includes("help")) {
      return "I'm a mock assistant that simulates the Codex SDK behavior. I can demonstrate:\n- Todo lists\n- Reasoning\n- Command execution (when you mention 'run', 'execute', 'build', 'test')\n- File changes (when you mention 'file', 'create', 'write', 'edit')\n\nTry asking me to 'run a build' or 'create a file'!";
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
   * Helper to add delays in the event stream
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const Codex = MockCodex;
