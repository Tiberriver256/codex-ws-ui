# Quick Start Guide

## For Testing/Development (No API Key Required)

```bash
# Clone the repository
git clone https://github.com/Tiberriver256/codex-ws-ui.git
cd codex-ws-ui

# Install dependencies
npm install

# Start in mock mode
npm run start:mock
```

Open http://127.0.0.1:8080 in your browser and start chatting!

## For Production Use (With Real Codex SDK)

```bash
# Set your API key
export CODEX_API_KEY=your_actual_api_key_here

# Start the enhanced server
npm run start:enhanced
```

## Quick Test

```bash
# Run the test suite
npm test
```

## Try These Commands in the UI

When running in mock mode, try these to see different features:

- **"Hello!"** - See basic interaction with todo lists
- **"Run npm install"** - See command execution simulation
- **"Create a new file"** - See file change simulation
- **"Help"** - Get information about mock capabilities

## Comparing Servers

### server.mjs (Original)
- Minimal, single-file implementation
- Good for quick one-liner usage with npx
- Basic text streaming only

### server-enhanced.mjs (New)
- Rich UI with event visualization
- Mock mode support for testing
- Better error handling
- Shows todos, reasoning, commands, files, etc.

## Environment Variables

- `CODEX_API_KEY` - Your Codex API key (required for real mode)
- `CODEX_MOCK` - Set to `1` or `true` to enable mock mode
- `PORT` - Server port (default: 8080)

## Troubleshooting

**Problem**: "Cannot find package 'ws'"
**Solution**: Run `npm install`

**Problem**: "Set CODEX_API_KEY and rerun"
**Solution**: Either set the API key OR run in mock mode with `CODEX_MOCK=1`

**Problem**: Server won't start on port 8080
**Solution**: Change the port with `PORT=3000 npm run start:mock`
