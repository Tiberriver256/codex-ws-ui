# Codex WebSocket UI

Minimal localhost-only WebSocket UI for the Codex TypeScript SDK. Streams AI agent responses over WebSockets with rich event handling and **multiple thread support**.

## Features

- ✨ **Real-time streaming** - See agent responses as they're generated
- 🧵 **Multiple threads** - Create and switch between multiple conversation threads
- 🎨 **Rich UI** - Visual representation of different event types (reasoning, commands, file changes, todos)
- 🧪 **Mock mode** - Test without auth using realistic simulations
- 📊 **Event visualization** - See todos, reasoning, command execution, and file changes
- 🔌 **WebSocket-based** - Efficient bidirectional communication
- ⚙️ **Thread options** - Configure model, reasoning, approvals, sandbox, and working directories per thread

## Requirements

- Node.js 18+

## Quick Start

### Method 1: Using npx

Run:
```bash
npx @tiberriver256/codex-web-ui --mock
```

Optional host/port overrides:
```bash
npx @tiberriver256/codex-web-ui --host 0.0.0.0 --port 8080
```

### Method 2: Clone and run locally

Clone this repository and run:

```bash
# Install dependencies
npm install

# Run in MOCK mode (no auth needed - perfect for testing!)
npm run start:mock

# Run in REAL mode
npm start
```

Open `http://127.0.0.1:8080` in your browser.

To expose the UI on all interfaces (e.g., for LAN access), override the host:
```bash
HOST=0.0.0.0 npm start
```

## Scripts

- `npm start` — Start in real mode (Codex SDK)
- `npm run start:mock` — Start in mock mode (sets `CODEX_MOCK=1`)
- `npm test` — Run the mock test suite
- `npm run test:e2e` — Run Playwright end-to-end tests

## Modes

The UI can run against the real Codex SDK or a local mock.

- **Mock mode**: `CODEX_MOCK=1 npm start` (or `npm run start:mock`) runs without auth.
- **Real mode**: `npm start` uses the Codex SDK. Make sure your Codex auth is set up in your environment.

## Multiple Threads

The server supports multiple independent conversation threads:
- **Create new threads** - Click "+ New Thread" to start a fresh conversation
- **Switch between threads** - Use the dropdown to switch between threads
- **Preserved history** - Each thread maintains its own conversation history
- **Thread persistence** - Threads persist during the WebSocket connection

This allows you to:
- Work on multiple tasks simultaneously
- Compare different approaches
- Keep separate contexts for different topics

## Mock Mode

Mock mode provides a realistic simulation of the Codex SDK without requiring authentication. Perfect for:
- 🧪 Testing the UI during development
- 📚 Demos and presentations
- 🎓 Learning how the SDK works
- 🔧 UI/UX experimentation

The mock implementation simulates:
- Thread and turn lifecycle events
- Todo list updates
- Reasoning items
- Command execution (with simulated output)
- File changes
- Token usage statistics
- Realistic timing and event ordering

Try it:
```bash
npm run start:mock
# or
CODEX_MOCK=1 node server.mjs
```

## Event Types Supported

The UI visualizes these Codex SDK event types:

- **Thread Events**: Created, switched, started, ID assigned, options updated
- **Turn Events**: Started/completed/failed
- **Agent Messages**: Final responses from the AI
- **Reasoning**: Internal thought process
- **Command Execution**: Shell commands with output
- **File Changes**: File additions, updates, deletions
- **Todo Lists**: Task planning and progress
- **Web Search**: Search queries (when enabled)
- **MCP Tool Calls**: Model Context Protocol integrations
- **Usage Stats**: Token consumption metrics

## Testing

Test the mock implementation:
```bash
npm test
```

This runs automated tests to verify:
- Basic interactions
- Command execution simulation
- File change simulation
- Non-streamed API
- Todo list updates

Run end-to-end tests (Playwright):
```bash
npm run test:e2e
```

## Development

```bash
# Install dependencies
npm install

# Start in mock mode for development
npm run start:mock

# Start in real mode
npm start
```

## Architecture

```
┌─────────────┐      WebSocket      ┌──────────────┐
│   Browser   │◄───────────────────►│    Server    │
│             │     JSON Events     │              │
└─────────────┘                     └──────┬───────┘
                                           │
                                    ┌──────▼───────┐
                                    │ Mock or Real │
                                    │  Codex SDK   │
                                    └──────────────┘
```

## Files

- `server.mjs` - Server + UI (rich event handling, mock support, thread options)
- `mock-codex.mjs` - Mock Codex SDK implementation
- `test-mock.mjs` - Test suite for mock implementation
- `playwright.config.mjs` - E2E test config
- `package.json` - Dependencies and scripts

## Notes

- Localhost only (`127.0.0.1`), no authentication required for the web interface
- In mock mode, no auth is needed
- In real mode, ensure you are authenticated to Codex
- Review the source code before running if you prefer to verify the script contents

## License

ISC
