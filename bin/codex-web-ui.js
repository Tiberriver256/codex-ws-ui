#!/usr/bin/env node

const args = process.argv.slice(2);
const usage = `codex-web-ui [options]

Options:
  --host <host>     Bind host (default: 127.0.0.1)
  --port <port>     Bind port (default: 8080)
  --mock            Enable mock mode (CODEX_MOCK=1)
  -h, --help        Show help
`;

let host = process.env.HOST || "127.0.0.1";
let port = process.env.PORT || "8080";
let mock = process.env.CODEX_MOCK === "1" || process.env.CODEX_MOCK === "true";

function readValue(index) {
  if (index >= args.length) return null;
  const value = args[index];
  return value && !value.startsWith("-") ? value : null;
}

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "-h" || arg === "--help") {
    console.log(usage);
    process.exit(0);
  }
  if (arg === "--mock") {
    mock = true;
    continue;
  }
  if (arg === "--host") {
    const value = readValue(i + 1);
    if (!value) {
      console.error("Missing value for --host");
      process.exit(1);
    }
    host = value;
    i += 1;
    continue;
  }
  if (arg === "--port") {
    const value = readValue(i + 1);
    if (!value) {
      console.error("Missing value for --port");
      process.exit(1);
    }
    port = value;
    i += 1;
    continue;
  }
  if (arg.startsWith("--host=")) {
    host = arg.slice("--host=".length) || host;
    continue;
  }
  if (arg.startsWith("--port=")) {
    port = arg.slice("--port=".length) || port;
    continue;
  }
}

process.env.HOST = host;
process.env.PORT = port;
if (mock) {
  process.env.CODEX_MOCK = "1";
}

await import(new URL("../server.mjs", import.meta.url));
