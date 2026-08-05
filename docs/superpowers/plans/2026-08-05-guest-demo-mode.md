# Guest Demo Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let unauthenticated visitors use a persistent, clearly fictional local sandbox while authenticated members continue to use isolated real business data and Supabase sync.

**Architecture:** Authentication decides the runtime mode before Vue mounts. Guest mode uses a dedicated `WorkBuddyGuestDemo` module backed by one namespaced browser-storage key, skips all real IndexedDB/Supabase initialization, and routes AI calls to deterministic local mock responses. Live mode keeps the existing startup and persistence path unchanged; login and logout reload the page so demo and live state never coexist in one Vue instance.

**Tech Stack:** Vue 3 IIFE SPA, browser localStorage, Node test runner, Supabase authentication/RLS, GitHub Pages static build.

---

### Task 1: Guest runtime and persistent fictional workspace

**Files:**
- Create: `src/guest-demo.js`
- Create: `src/guest-demo.test.mjs`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write the failing storage and seed tests**

Test that `createGuestDemo({ storage })` seeds a schema-v2 fictional workspace when empty, saves edits under only `workbuddy.guest-demo.workspace.v1`, reloads those edits, recovers from malformed JSON, and resets to a fresh clone.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/guest-demo.test.mjs`

Expected: FAIL because `src/guest-demo.js` does not exist.

- [ ] **Step 3: Implement the minimal guest module**

Expose an immutable `window.WorkBuddyGuestDemo` API with `STORAGE_KEY`, `createInitialWorkspace`, `loadWorkspace`, `saveWorkspace`, and `resetWorkspace`. The seed contains only names and entities explicitly marked as demonstration data, and every public read returns a deep clone.

- [ ] **Step 4: Load the module before authentication bootstrap**

Add `<script src="./src/guest-demo.js?...">` before `auth-bootstrap.js` and add the focused test to the repository test command.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test src/guest-demo.test.mjs`

Run: `npm test`

Expected: all tests pass.

### Task 2: Authentication-controlled boot modes

**Files:**
- Modify: `src/auth-bootstrap.js`
- Create: `src/guest-auth-bootstrap.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing authentication mode tests**

Assert that anonymous restore enters guest mode with local-write/cloud-deny access, authenticated restore enters live mode, login from an already-mounted guest reloads before live data starts, and the login overlay can be opened from the guest UI.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/guest-auth-bootstrap.test.mjs`

Expected: FAIL because the anonymous branch still shows the blocking login shell.

- [ ] **Step 3: Implement guest and live boot helpers**

Set `window.WorkBuddyRuntimeMode` to `guest` or `live` before calling `WorkBuddyBootApp`. Guest access has `canWrite: true`, `canAccessCloud: false`, `canConfigureAi: true`, `canManageMembers: false`, and `isGuest: true`. Expose a small `WorkBuddyAuthUi.openLogin()` bridge and reload after successful guest login.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test src/guest-auth-bootstrap.test.mjs`

Run: `npm test`

Expected: all tests pass.

### Task 3: Hard persistence and network isolation

**Files:**
- Modify: `index.html`
- Create: `src/guest-data-boundary.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing boundary tests**

Assert that guest mount loads only `WorkBuddyGuestDemo`, skips `localLoad`, `loadWorkbenchV2`, private todos, real AI config, resume caches, `initCloud`, and polling. Assert guest saves call only `WorkBuddyGuestDemo.saveWorkspace`, while live saves retain existing IndexedDB and Supabase behavior.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/guest-data-boundary.test.mjs`

Expected: FAIL because the current lifecycle always loads local business caches and cloud state.

- [ ] **Step 3: Add mode-gated load and save functions**

Implement `isGuestMode`, `loadGuestWorkspace`, and `saveGuestWorkspace`. Branch `localSave`, `saveWorkbenchV2`, the save coordinator, and `onMounted` before any live cache or cloud client is touched. Guest workspace packing includes the current local company, position, candidate, application, knowledge, and todo state but never API keys.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test src/guest-data-boundary.test.mjs`

Run: `npm test`

Expected: all tests pass.

### Task 4: Visible guest identity, login, and reset controls

**Files:**
- Modify: `index.html`
- Create: `src/ui/guest-demo-ui.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing UI contract tests**

Assert that guest mode renders a persistent “游客演示模式” banner, “虚构数据” disclosure, “登录查看真实数据” button, “重置演示数据” button, local-only save wording, and a confirmation before reset.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/ui/guest-demo-ui.test.mjs`

Expected: FAIL because the controls do not exist.

- [ ] **Step 3: Add the guest UI and actions**

Add compact controls to the V2 top bar and a disclosure banner above the main content. `openGuestLogin` opens the existing modal login shell. `resetGuestDemo` confirms, resets only the guest key, and reloads. Hide the real settings route from guests.

- [ ] **Step 4: Run accessibility, focused, and full tests**

Run: `node --test src/ui/guest-demo-ui.test.mjs src/services/accessibility-static.test.mjs`

Run: `npm test`

Expected: all tests pass.

### Task 5: Local-only simulated AI

**Files:**
- Create: `src/guest-demo-ai.js`
- Create: `src/guest-demo-ai.test.mjs`
- Modify: `src/auth-bootstrap.js`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write failing mock AI tests**

Assert deterministic text, object, and array responses for visible AI tasks; ensure the implementation contains no `fetch`, Supabase function invocation, API key read, or timer longer than a short UI delay.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/guest-demo-ai.test.mjs`

Expected: FAIL because the mock AI module does not exist.

- [ ] **Step 3: Implement and install the guest AI adapter**

Expose `createMockCall` and task-specific fictional responses. Install it only when entering guest mode, label all returned prose as simulated, and provide mock parsing fields without reading or uploading resume files. Live mode continues to use the existing AI implementation.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test src/guest-demo-ai.test.mjs`

Run: `npm test`

Expected: all tests pass.

### Task 6: Production verification and documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the user-visible guest behavior and data boundary**

Record that guest data is fictional, browser-local, resettable, never merged into live data, and that guest AI is simulated without network calls.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: exit 0 and generated Pages artifact contains the guest modules.

- [ ] **Step 3: Run static script compilation and the full test suite**

Run the repository inline-script compilation check and `npm test`.

Expected: every inline script compiles and all tests pass.

- [ ] **Step 4: Verify browser behavior**

In a clean browser profile, verify anonymous direct demo entry, persistent CRUD after refresh, reset behavior, zero Supabase business/AI requests, login transition to live data, and logout transition back to the independent guest workspace.

- [ ] **Step 5: Review the final diff**

Confirm that only guest-mode files, integration points, tests, and README changed; confirm no credentials or real customer/candidate data appear in the diff.
