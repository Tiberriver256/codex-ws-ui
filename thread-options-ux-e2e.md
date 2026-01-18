# Thread Options UX/UI + E2E Test Plan

## 1) SDK Thread Options Summary + UI Implications
Source: `sdk/typescript/src/threadOptions.ts` in the Codex repo.

**ThreadOptions fields**
- `model` (string): selects model per thread.
- `sandboxMode` ("read-only" | "workspace-write" | "danger-full-access"): controls file system access level.
- `workingDirectory` (string): active directory context for operations.
- `skipGitRepoCheck` (boolean): bypass repo validation checks.
- `modelReasoningEffort` ("minimal" | "low" | "medium" | "high" | "xhigh"): reasoning intensity.
- `networkAccessEnabled` (boolean): general network access.
- `webSearchEnabled` (boolean): web search capability.
- `approvalPolicy` ("never" | "on-request" | "on-failure" | "untrusted"): approval gate for actions.
- `additionalDirectories` (string[]): extra paths to include as accessible context.

**UI implications**
- **Risk-sensitive controls**: `sandboxMode`, `networkAccessEnabled`, `webSearchEnabled`, and `approvalPolicy` need prominent explanations, safe defaults, and clear consequences.
- **Context controls**: `workingDirectory`, `additionalDirectories`, and `skipGitRepoCheck` are about scope and trust; they should be grouped as “Workspace & Access.”
- **Performance/quality controls**: `model` and `modelReasoningEffort` need a balance between capability, speed, and cost; expose as a pair with succinct guidance.
- **Mid-thread changeability**: Users need clear visibility when a thread’s options differ from defaults or have changed mid-thread. This requires a persistent “Thread Settings” surface and event markers in the thread timeline.

## 2) Proposed UX/UI Flows and Controls

### A) Thread Creation Flow (New Thread)
**Entry**: “New Thread” action opens a configuration sheet (or inline panel) with sections:
1. **Model & Reasoning**
   - Control: Model picker (single select) + Reasoning Effort (segmented control).
   - Guidance: “Higher reasoning = slower but more thorough.”
2. **Safety & Approvals**
   - Control: Approval policy (radio group) with descriptions.
   - Control: Sandbox mode (radio group) with risk labels.
3. **Network & Search**
   - Toggles: Network Access, Web Search.
   - Dependency: Web Search disabled unless Network Access is on; show tooltip explaining dependency.
4. **Workspace Scope**
   - Field: Working Directory (path input with browser).
   - Multi-entry: Additional Directories (chip list).
   - Toggle: Skip Git Repo Check (with warning).

**Affordances**
- “Use defaults” link to reset.
- Inline validation for paths.
- Summary strip at bottom: “Thread will run with: [Model], [Sandbox], [Network], [Approvals].”

### B) In-Thread Settings Panel (Existing Thread)
**Entry**: Settings icon in thread header; shows current options and a “Change settings” action.

**Change flow**
- Changes are applied with a confirmation step: “Apply to this thread from this point forward.”
- The thread timeline shows a “Settings changed” marker with the key option deltas.
- If a risky change is applied (e.g., sandbox to danger-full-access), show a risk confirmation.

### C) Visual State Indicators
- Thread list badge: small icons for “Network”, “Search”, and “Danger Access”.
- Header summary: compact pill row showing enabled capabilities.
- In-thread callouts when a user attempts an action that violates settings (e.g., file write in read-only).

### D) Error and Boundary States
- If a user disables network but a tool requires it, show a blocking prompt: “Network is off for this thread. Change settings?”
- If a path is invalid, show inline error and prevent save.
- If permissions disallow certain options, show read-only state with “contact admin” tooltip.

## 3) Proposed E2E Test Cases (Behavioral Playwright Plan)
Each test includes Preconditions, Steps, and Assertions. All tests assume a stable seed workspace with known directories and a default thread template.

### 3.1 New Thread - Defaults
- **Preconditions**: User has permission to view and edit settings.
- **Steps**: Open New Thread panel, do not change settings, create thread.
- **Assertions**: Thread header shows default settings pills; thread metadata reflects default values; no “settings changed” marker.

### 3.2 New Thread - Full Customization
- **Preconditions**: Network is allowed by policy; workspace has additional directories available.
- **Steps**: Select non-default model; set reasoning to high; sandbox to workspace-write; toggle network on; toggle web search on; set working directory; add two additional directories; enable skip git repo check; create thread.
- **Assertions**: Header summary reflects all selections; thread settings panel shows selected values; network/search badges appear in thread list.

### 3.3 Dependency: Web Search Requires Network
- **Preconditions**: New Thread panel open.
- **Steps**: Attempt to enable Web Search while Network Access is off.
- **Assertions**: Web Search control is disabled or auto-enables Network with confirmation; user sees explanatory message.

### 3.4 Invalid Working Directory
- **Preconditions**: New Thread panel open.
- **Steps**: Enter invalid working directory path; attempt to save.
- **Assertions**: Inline error appears; save is blocked; invalid path not stored.

### 3.5 Additional Directories - Add/Remove
- **Preconditions**: New Thread panel open.
- **Steps**: Add two directories; remove one; create thread.
- **Assertions**: Only the remaining directory is shown in settings; UI reflects chips list update.

### 3.6 Mid-Thread Change: Model + Reasoning
- **Preconditions**: Thread exists with defaults.
- **Steps**: Open settings, change model and reasoning effort, confirm apply.
- **Assertions**: Timeline shows “Settings changed” marker listing both fields; header pills update; previous messages remain unaffected.

### 3.7 Mid-Thread Change: Sandbox Escalation
- **Preconditions**: Thread exists with read-only sandbox.
- **Steps**: Change sandbox to danger-full-access; confirm risk dialog.
- **Assertions**: Risk confirmation modal is shown; change requires explicit confirmation; header shows “danger” badge; marker added in timeline.

### 3.8 Mid-Thread Change: Network Off
- **Preconditions**: Thread has network on.
- **Steps**: Turn off network; confirm apply; attempt a network-requiring action.
- **Assertions**: Header shows network disabled; action results in a blocking prompt to re-enable or cancel; no silent failure.

### 3.9 Approval Policy: On-Request
- **Preconditions**: Thread exists; approval policy set to never.
- **Steps**: Change approval policy to on-request; attempt an action requiring approval.
- **Assertions**: Approval request modal appears; action only proceeds after approval; timeline records approval event.

### 3.10 Skip Git Repo Check Toggle
- **Preconditions**: Thread created in repo context.
- **Steps**: Toggle Skip Git Repo Check on; attempt a repo-sensitive action.
- **Assertions**: UI indicates repo checks are bypassed; action proceeds without repo check warning; settings marker includes toggle change.

### 3.11 Permissions: Restricted Options
- **Preconditions**: User role cannot enable danger-full-access or network.
- **Steps**: Open settings panel.
- **Assertions**: Restricted controls are disabled; tooltips explain restriction; no changes allowed for those fields.

### 3.12 Persistence Across Sessions
- **Preconditions**: Thread created with custom settings.
- **Steps**: Reload app; reopen thread.
- **Assertions**: Settings persist and match prior values; header pills and badges match stored options.

### 3.13 Thread List Indicators
- **Preconditions**: Two threads: one with network/search enabled, one without.
- **Steps**: View thread list.
- **Assertions**: Correct badges appear per thread; icons match capability states.

### 3.14 “Use Defaults” Reset
- **Preconditions**: New Thread panel with edited values.
- **Steps**: Click “Use defaults.”
- **Assertions**: All fields return to defaults; summary strip reflects defaults; save uses default values.

## 4) Open Questions / Risks
- What are the system defaults for each option, and are they environment-specific (e.g., network/search default off in regulated environments)?
- Are there server-side constraints that make certain combinations invalid (e.g., sandbox “read-only” + working directory change)?
- Should mid-thread changes affect only new responses or also modify pending actions?
- How should `skipGitRepoCheck` be described to non-technical users without encouraging unsafe use?
- Is `webSearchEnabled` strictly dependent on `networkAccessEnabled` or can they be independently governed?
- Do we need audit logs or history views for settings changes beyond the timeline marker?
- Are there rate/cost implications to `modelReasoningEffort` that require warnings or estimates?

