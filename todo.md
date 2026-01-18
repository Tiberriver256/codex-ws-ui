# TODO (BDD)

## Current testing strategy (today)
- Mock SDK smoke script in `test-mock.mjs` validates event stream basics (thread id, command, file change, todo, web search, MCP, images, resume, models).
- Playwright E2E in `e2e/chat.spec.mjs` covers UI rendering, threading, options summary, mock mode, and streaming.
- UX plan in `thread-options-ux-e2e.md` lists additional scenarios not yet automated.

## Port strategy to @cucumber/cucumber
- Use Gherkin `.feature` files as the primary acceptance spec; implement step definitions in support files and run via `npx cucumber-js`. citeturn2search0turn3search3
- Keep Playwright as the browser driver inside Cucumber World; use hooks to create/close browser context per scenario. citeturn1search0
- Tag scenarios by priority and type (e.g., `@p0`, `@smoke`) to slice runs and target hooks. citeturn1search0
- Preserve mock-mode default runs; add a tagged path for real app-server runs.
- Migrate existing Playwright cases into Gherkin; keep selectors and UI ids stable to reduce churn.

## Prioritized checklist (features + scenarios)
### P0
- [x] App-server protocol integration (`features/app-server.feature`) - init, numeric ids, event normalization, diff streaming.
- [x] Core chat rendering (`features/core-chat.feature`) - assistant output, reasoning, todo, usage, command, file change, diff, streaming, user formatting.
- [x] Thread lifecycle (`features/threading.feature`) - reuse, pending id replacement, no repeated started, concurrency, multi-thread isolation.
- [x] Connection + mock indicators (`features/connection-status.feature`) - connected status, mock badge.
- [x] Models + reasoning effort (`features/models.feature`) - catalog, selection, summary.
- [x] Thread options UX (`features/thread-options.feature`) - defaults, customization, validation, dependency, mid-thread changes, badges, persistence.
- [x] Sessions + resume (`features/sessions.feature`) - list, resume by id/last, show all, exec resume, metadata persist.
- [x] Auth flows (`features/auth.feature`) - OAuth, API key, device auth, status, logout, headless guidance.
- [x] Approvals + execpolicy (`features/approvals.feature`) - prompt, approve/deny, always allow, rules preview, presets.
- [x] Status + context visibility (`features/status-panel.feature`) - session card, AGENTS discovery view.
- [x] Images (`features/images.feature`) - picker, drag/drop, mixed text+image send.
- [x] Structured output (`features/structured-output.feature`) - schema per turn, JSON viewer, copy/download.

### P1
- [x] Command palette + slash (`features/command-palette.feature`) - core commands, diff/review/apply, collapsed advanced.
- [x] Custom prompts (`features/prompts.feature`) - discovery, placeholders, collisions, reload.
- [x] File mentions (`features/mentions.feature`) - search, insert.
- [x] Profiles/providers/flags (`features/config-profiles.feature`) - profile preview, provider selection, flags toggle.
- [x] Refactor: publishable `npx` package (`@tiberriver256/codex-web-ui`) with bin CLI, host/port flags, publishConfig/files/engines, docs update.
- [x] Refactor: split frontend into `public/index.html`, `public/app.js`, `public/styles.css`; server serves static; keep mock mode + WS protocol unchanged.

### P2
- [x] MCP management (`features/mcp.feature`) - list/add/remove/login/logout.
- [x] Skills discovery (`features/skills.feature`) - list and insert.
- [x] Review/apply flows (`features/review-apply.feature`) - review summary, apply confirmation.
- [x] Cloud tasks (`features/cloud.feature`) - list/run.
- [x] Optional refactor: split server modules (ws/codex/diff/static) and add build/minify only if perf requires. (Skipped: not needed now)

### P3
- [x] Export + logs + notifications (`features/observability.feature`) - JSONL export, log viewer, browser notify.
- [x] Reasoning visibility (`features/reasoning-display.feature`) - hide/show reasoning, raw reasoning toggle.

## Best practices (implementation loop)
1) Pick one scenario; mark it as the only failing test.
2) Implement the smallest step definitions to make it pass.
3) Run the scenario only (tag or file-level), then full P0 smoke.
4) Do manual exploratory testing for the touched UI flow.
5) Refactor step code + UI code; keep steps stable and readable.
6) Commit with Conventional Commits; push; keep PR scope tight.
