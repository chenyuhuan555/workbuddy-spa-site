# Talent Batch Upload Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish and harden the existing Phase 3.5 batch/drag resume intake so duplicate, cancelled, failed, and reopened jobs cannot create duplicate talents, orphan resume blobs, or invisible background work.

**Architecture:** Keep `src/workbench-v2.js` as the UI-independent batch state machine and keep `index.html` as the adapter to FileReader, IndexedDB, Vue, and the existing single-upload duplicate dialog. Defer binary persistence until the batch task has an accepted destination talent, serialize the final write through the existing batch gate, and preserve the task collection when the modal is closed and reopened.

**Tech Stack:** Vanilla JavaScript, Vue 3 global build, IndexedDB, Node.js `node:test`, Playwright browser harness.

---

### Task 1: Prove and fix duplicate/cancelled file persistence boundaries

**Files:**
- Modify: `src/batch-upload.test.mjs`
- Modify: `src/workbench-v2.js`
- Modify: `index.html`

- [x] **Step 1: Write failing engine tests**

Add tests that provide a `persistFile(task)` dependency and assert:

```js
assert.equal(fileWrites.length, 0, 'duplicate waits for a decision before writing its blob');
assert.equal(fileWrites.length, 0, 'skip/cancel never writes a blob');
assert.equal(fileWrites.length, 1, 'an accepted task writes its blob once');
```

Add a same-hash test where the first task succeeds and the second resolves with `merge` or `newVersion`; both actions must reuse the first task's real `createdId`, keep `bundle.candidates.length === 1`, and not create a second stored binary.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test src/batch-upload.test.mjs
```

Expected: new persistence and same-hash resolution assertions fail against the current implementation.

- [x] **Step 3: Implement the minimal engine boundary**

Update the batch engine so accepted writes follow this order:

```js
task.status = 'saving';
await deps.persistFile(task);
appendTalentResumeVersion(bundle, candidateId, buildResumeVersionFromForm(task.form));
await deps.persist();
task.status = 'success';
```

Resolve synthetic same-batch duplicates through the referenced task's `createdId`. If the referenced task has not finished, leave the duplicate pending instead of creating a new talent. `skip`, cancelled, parse-error, and needs-review tasks must not call `persistFile`.

- [x] **Step 4: Defer IndexedDB writes in the Vue adapter**

Extend `readAndParseResumeFile(file, options)` with a batch-only deferred mode. Single upload keeps its existing behavior; batch parsing returns the `File` on the task and calls `saveResumeBlob` only through `batchDeps.persistFile` after the user accepts the destination.

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```powershell
node --test src/batch-upload.test.mjs
```

Expected: all batch tests pass, including the new persistence lifecycle tests.

### Task 2: Preserve queue state across modal close/reopen

**Files:**
- Modify: `src/batch-upload.test.mjs`
- Modify: `index.html`

- [x] **Step 1: Add a failing source-level regression test**

Read `index.html`, isolate `openBatchUpload`, and assert that reopening only sets `batchUpload.open = true` and does not replace `tasks`, `hashes`, `gate`, or in-flight task state.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test src/batch-upload.test.mjs
```

Expected: the current `Object.assign(... tasks: [], hashes: {})` reset is detected.

- [x] **Step 3: Make the minimal UI lifecycle change**

Change `openBatchUpload()` to reopen the existing queue. New sessions begin naturally after the user clears terminal tasks; closing the modal does not cancel or hide ongoing background writes. Keep the existing `beforeunload` warning.

- [x] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
node --test src/batch-upload.test.mjs
```

Expected: all batch tests pass.

### Task 3: Full regression and browser verification

**Files:**
- Verify: `src/workbench-v2.test.mjs`
- Verify: `src/editor-deepseek-settings.test.mjs`
- Verify: `src/preview-gate.test.mjs`
- Verify: `src/batch-upload.test.mjs`
- Verify: `phase3-browser-test/batch-harness.cjs`

- [x] **Step 1: Run all Node tests**

```powershell
node --test src/workbench-v2.test.mjs src/editor-deepseek-settings.test.mjs src/preview-gate.test.mjs src/batch-upload.test.mjs
```

Expected: zero failures.

- [x] **Step 2: Parse every inline script**

Extract inline `<script>` blocks from `index.html` and compile each with `vm.Script`.

Expected: all inline scripts parse successfully.

- [x] **Step 3: Run the local browser harness**

Use a fresh Chromium profile against `http://127.0.0.1:8791`, with online Supabase and DeepSeek requests blocked. Verify success/duplicate/error states, cancel/skip leaving no file record, same-hash merge keeping one talent and one file record, close/reopen preserving tasks, refresh persistence, original-file preview, and zero business/page errors.

- [x] **Step 4: Review the final diff**

Check `git diff --check`, inspect only the three feature files plus this plan, scan for credentials/test data, and report unrelated pre-existing changes without modifying them.
