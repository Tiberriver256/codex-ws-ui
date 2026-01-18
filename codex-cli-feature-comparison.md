# Codex CLI vs codex-ws-ui (feature comparison)

Note: Most of this comparison is based on the codex-cli repo. Local clone (relative): `../codex`.

Sources referenced:
- Codex CLI docs in `../codex/docs/`
- Codex CLI flags in `../codex/codex-rs/cli/src/main.rs`, `../codex/codex-rs/tui/src/cli.rs`, `../codex/codex-rs/exec/src/cli.rs`
- codex-ws-ui UI + server in `./server.mjs` and `./README.md`

Legend: ✅ parity | ⚠️ partial | ❌ missing | 🟦 CLI-only/NA for UI | 🧭 app-server target (verify)

## Core interaction & sessions
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| Interactive experience | TUI with approvals/overlays | ⚠️ Streaming web UI | 🧭 Stream events + approvals | UI should render app-server events, not reimplement. |
| Prompted start (`codex "..."`) | ✅ | ✅ | 🧭 | Pass through. |
| Multi-turn chat | ✅ | ✅ | 🧭 | Pass through. |
| Sessions list + resume | ✅ (`codex resume`) | ❌ | 🧭 | Prefer app-server session APIs; else read CLI storage. |
| Non-interactive resume | ✅ (`codex exec resume`) | ❌ | 🧭 | Prefer app-server; fallback to exec wrapper. |
| New chat in-session | ✅ (`/new`) | ⚠️ | 🧭 | UI should surface via command palette. |
| Slash commands | ✅ | ❌ | 🧭 | Thin mapping to app-server/CLI wrapper. |
| Custom prompts | ✅ | ❌ | 🧭 | Load `~/.codex/prompts`, insert into input. |
| File mention search (`@`) | ✅ | ❌ | 🧭 | Server-side index using `rg --files`. |
| Edit previous prompt | ✅ (Esc-Esc) | ❌ | 🧭 | UI affordance only. |
| Image input | ✅ | ❌ | 🧭 | Forward `local_image` inputs; render thumbnails. |
| Session status | ✅ (`/status`) | ⚠️ | 🧭 | Status panel from app-server snapshot. |
| History recording | ✅ | ❌ | 🧭 | Surface existing history storage. |

## Authentication & access
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| OAuth login | ✅ | ❌ | 🧭 | UI should call login endpoints. |
| API key login | ✅ | ❌ | 🧭 | UI should surface. |
| Login status | ✅ | ❌ | 🧭 | Read-only status panel. |
| Device auth | ✅ | ❌ | 🧭 | UI surface. |
| Logout | ✅ | ❌ | 🧭 | UI surface. |

## Safety, approvals, sandbox
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| Approval prompts | ✅ | ⚠️ | 🧭 | Requires app-server event stream. |
| Sandbox modes | ✅ | ✅ | 🧭 | UI already exposes. |
| Full-auto / YOLO | ✅ | ⚠️ | 🧭 | UI presets; logic stays CLI. |
| Execpolicy rules | ✅ | ❌ | 🧭 | UI editor + `execpolicy check`. |
| Network access toggle | ✅ | ✅ | 🧭 | Maps to config override. |
| Web search toggle | ✅ | ✅ | 🧭 | UI toggle only. |

## Automation & output modes
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| Non-interactive mode (`codex exec`) | ✅ | ✅ (via SDK) | 🧭 | Prefer app-server sessions instead. |
| JSONL streaming | ✅ | ⚠️ | 🧭 | Add export/download. |
| Structured output schema | ✅ | ❌ | 🧭 | Pass through + JSON viewer. |
| Output to file | ✅ | ❌ | 🧭 | UI action to save output. |
| Color output | ✅ | 🟦 | 🟦 | CLI-only. |
| Review mode | ✅ | ❌ | 🧭 | `codex review` wrapper. |
| Apply latest diff | ✅ | ❌ | 🧭 | `codex apply` wrapper. |
| Cloud tasks | ✅ (experimental) | ❌ | 🧭 | Surface if supported. |

## Models, config, and profiles
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| Model selection | ✅ | ✅ | ✅ | Already uses app-server model list. |
| Reasoning effort | ✅ | ✅ | 🧭 | UI already exposes. |
| Reasoning summary + verbosity | ✅ | ❌ | 🧭 | UI surface. |
| Model provider / OSS provider | ✅ | ❌ | 🧭 | UI surface. |
| Profiles (`--profile`) | ✅ | ❌ | 🧭 | UI selector + config preview. |
| Config overrides (`-c`) | ✅ | ⚠️ | 🧭 | Surface more keys if needed. |
| Feature flags | ✅ | ❌ | 🧭 | `codex features list` UI. |
| `--cd` + `--add-dir` | ✅ | ✅ | ✅ | Already exposed. |
| Skip git repo check | ✅ | ✅ | ✅ | Already exposed. |
| Base URL / API key / env override | ✅ | ❌ | 🧭 | UI surface if app-server supports. |
| AGENTS.md discovery | ✅ | ⚠️ | 🧭 | Show discovery path + active instructions. |
| Shell env policy | ✅ | ❌ | 🧭 | UI surface. |

## Integrations & extensibility
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| MCP client (tool calls) | ✅ | ⚠️ | 🧭 | UI renders events; add management. |
| MCP server management | ✅ | ❌ | 🧭 | UI wrapper. |
| Run Codex as MCP server | ✅ | ❌ | 🧭 | Likely CLI-only. |
| Skills | ✅ (experimental) | ❌ | 🧭 | Discover + insert. |

## Observability & misc
| Feature | Codex CLI | codex-ws-ui today | App-server leverage | Notes |
| --- | --- | --- | --- | --- |
| Logs + RUST_LOG | ✅ | ❌ | 🧭 | Read-only log viewer. |
| Notifications | ✅ | ❌ | 🧭 | Browser notifications. |
| Shell completions | ✅ | 🟦 | 🟦 | CLI-only. |
| Sandbox debug commands | ✅ | 🟦 | 🟦 | CLI-only. |
| App-server tooling | ✅ | ⚠️ | ✅ | UI uses app-server for model list only today. |

## Current codex-ws-ui strengths (not in CLI)
- Web-native multi-thread view with persistent per-thread output panes.
- In-UI unified diffs for file changes (computed server-side).
- Mock mode with realistic event simulation for demos/tests.
