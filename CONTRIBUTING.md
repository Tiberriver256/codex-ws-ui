# Contributing to Codex WebSocket UI

## Development Setup

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Tiberriver256/codex-ws-ui.git
cd codex-ws-ui

# Install dependencies
npm install
```

## Running the Server

### Mock Mode (No API Key Required)

Perfect for development and testing:

```bash
npm run start:mock
```

This runs the server with a mock Codex SDK that simulates all features without requiring authentication.

### Real Mode

```bash
npm start
```

## Testing

Run the test suite:

```bash
npm test
```

The test suite validates the mock Codex SDK implementation and ensures all event types work correctly.

## Project Structure

```
codex-ws-ui/
├── server.mjs          # Main server with UI and WebSocket handling
├── mock-codex.mjs      # Mock Codex SDK for testing without auth
├── test-mock.mjs       # Test suite for mock implementation
├── package.json        # Dependencies and scripts
└── README.md           # User documentation
```

## Features in the Server

The `server.mjs` includes:
- **Mock Mode Support** - Set `CODEX_MOCK=1` to use mock SDK
- **Multiple Thread Management** - Create and switch between conversation threads
- **Rich Event Visualization** - Display todos, reasoning, commands, files, etc.
- **WebSocket Communication** - Real-time bidirectional messaging
- **Responsive UI** - Dark-themed interface with visual feedback

## Making Changes

### Adding New Features

1. Make changes to `server.mjs` (server and UI code)
2. Update `mock-codex.mjs` if adding new SDK features
3. Add tests to `test-mock.mjs` if needed
4. Test in both mock and real modes
5. Update README.md documentation

### Testing Your Changes

```bash
# Test the mock implementation
npm test

# Test the server in mock mode
npm run start:mock

# Test with real Codex SDK
npm start
```

## Code Style

- ES Modules (`.mjs` extension)
- Async/await for asynchronous operations
- Minimal dependencies
- Self-contained server file

## Submitting Changes

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Environment Variables

- `CODEX_MOCK` - Set to `1` or `true` to enable mock mode
- `PORT` - Server port (default: 8080)

## Troubleshooting

**Cannot find package 'ws'**
```bash
npm install
```

**Run in mock mode**
```bash
CODEX_MOCK=1 npm start
```

**Port already in use**
```bash
PORT=3000 npm start
```
