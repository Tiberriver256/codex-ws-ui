# Feature Parity Plan (Codex CLI -> codex-ws-ui)

Note: Most of this plan is based on the codex-cli repo. Local clone (relative): `../codex`.

Goal: CLI-like UX, web-enhanced, without re-implementing CLI logic. App-server is the source of truth; UI is a thin client.

## Principles
- App-server first. Prefer JSON-RPC passthrough over new logic.
- UI = presentation + workflow glue. Avoid feature re-builds.
- KISS layout: single-column, advanced controls collapsed by default.
- CLI-only stays CLI-only unless it improves UI value.
- Capability discovery: if app-server lacks a feature, fall back to exec or mark as not supported.

## Roadmap (app-server anchored)

### P0 — App-server parity foundation
1) **Primary runtime: app-server**
   - Use app-server for all sessions/turns (not just model list).
   - JSON-RPC client: numeric ids incl 0, multiplex requests.
   - Normalize mixed notifications into UI event model.

2) **Session + status**
   - Sessions list/resume via app-server (or CLI storage pass-through if needed).
   - Status snapshot: model, sandbox, approvals, cwd, add-dirs, tokens.
   - Auth status + login/logout actions via app-server/CLI endpoints.

3) **Approvals + policy**
   - Approval prompts streamed from app-server.
   - Approve/deny UI + "always allow" hooks (execpolicy).
   - Presets: Read Only / Auto / Full Access (UI only).

4) **Core I/O parity**
   - Image inputs forwarded as local_image.
   - Structured output schema passthrough + JSON viewer.
   - Diff streaming from app-server (turn/diff/updated).

### P1 — UX parity surfaces (thin UI)
1) **Command palette / slash**
   - Map to app-server or CLI passthrough; minimal parsing in UI.

2) **Prompts + mentions**
   - Prompt library surfaced from `~/.codex/prompts`.
   - File mention search (server-side index using `rg --files`).

3) **Session UI**
   - Session picker, resume last, show all sessions.
   - Thread metadata persistence (local UI only).

4) **Status + context**
   - AGENTS discovery path + active instructions (read-only).

### P2 — Integrations (app-server surfaced)
1) **MCP management**
   - List/get/add/remove/login/logout via app-server or CLI wrapper.

2) **Skills**
   - Discover `~/.codex/skills/**/SKILL.md`, insert into prompt.

3) **Review/apply**
   - `codex review` + `codex apply` flows via app-server/CLI wrapper.

4) **Cloud tasks**
   - Surface `codex cloud` if app-server supports.

### P3 — Observability + polish
1) **Export + logs**
   - JSONL transcript export; log viewer for `~/.codex/log/*`.

2) **Notifications**
   - Browser notifications for completion + approvals.

3) **Reasoning toggles**
   - Hide/show reasoning and raw reasoning when available.

## Dependencies / sequencing
- App-server protocol work is the blocker; do this before UI parity work.
- Add tests for new server endpoints (sessions, prompts, MCP) + e2e resume flow.
