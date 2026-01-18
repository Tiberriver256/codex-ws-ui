# Codex WebSocket UI (zx one-liner)

Minimal localhost-only WebSocket UI for the Codex TypeScript SDK. Starts a server on `http://127.0.0.1:8080` and streams responses over WebSockets.

## Requirements
- Node.js 18+
- A Codex API key available in `CODEX_API_KEY`

## Usage
Set `CODEX_API_KEY` in your shell, then run:
```bash
npx zx https://raw.githubusercontent.com/Tiberriver256/codex-ws-ui/main/server.mjs --install
```

Open `http://127.0.0.1:8080` in your browser.

## Notes
- The `--install` flag will automatically install `@openai/codex-sdk` and `ws` on first run.
- Localhost only, no auth.
