# Resume AI Processing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist raw and AI-formatted resume text separately, process every accepted V2 resume through basic extraction, profile extraction, and Markdown formatting, and let users safely reprocess an existing version without re-uploading its original file.

**Architecture:** Extend the canonical `resumeVersion` model in `src/workbench-v2.js`, and add a focused browser/Node-compatible orchestration module in `src/services/resume-ai-processing.js`. The page owns AI and persistence dependencies, while the module owns status transitions, non-destructive patch construction, sequencing, and error normalization. Upload remains successful once the file, candidate, and version are persisted; AI processing is enqueued afterward and never changes upload success into failure.

**Tech Stack:** Vue 3 global build, browser JavaScript, Workbench V2 snapshot model, IndexedDB resume cache, existing DeepSeek helpers, Node built-in test runner, Tailwind static CSS.

---

### Task 1: Canonical Resume Version Fields and Compatibility

**Files:**
- Modify: `src/workbench-v2.js`
- Modify: `src/workbench-v2.test.mjs`
- Modify: `src/batch-upload.test.mjs`

- [ ] **Step 1: Write failing model tests**

Add tests that require `buildResumeVersionFromForm`, `appendTalentResumeVersion`, and `validateBundle` to preserve this shape:

```js
{
  rawText: 'PDF text',
  formattedText: '',
  formatStatus: 'queued',
  formatError: '',
  formattedAt: '',
}
```

Also assert these compatibility rules:

```js
assert.equal(validate(oldRawOnly).formatStatus, 'queued');
assert.equal(validate(oldFormatted).formatStatus, 'done');
assert.equal(validate(oldProcessing).formatStatus, 'queued');
assert.equal(validate(oldFormatted).rawText, 'original text');
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
node --test src/workbench-v2.test.mjs src/batch-upload.test.mjs
```

Expected: failures because formatted/status fields are not normalized or persisted.

- [ ] **Step 3: Add one canonical normalization helper**

Implement and export `normalizeResumeVersion(version)` in `src/workbench-v2.js`. It must copy existing metadata, never discard unknown compatible metadata, and apply:

```js
const formattedText = String(version.formattedText || '');
const priorStatus = String(version.formatStatus || '');
const formatStatus = priorStatus === 'processing'
  ? 'queued'
  : ['queued', 'done', 'failed'].includes(priorStatus)
    ? priorStatus
    : formattedText.trim() ? 'done' : 'queued';
```

Use it from `validateBundle`, `appendTalentResumeVersion`, and `buildResumeVersionFromForm`. New accepted versions start at `queued`; `rawText` and `formattedText` are never aliases.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command and expect all tests to pass.

- [ ] **Step 5: Commit the model slice**

```powershell
git add -- src/workbench-v2.js src/workbench-v2.test.mjs src/batch-upload.test.mjs
git commit -m "feat: separate raw and formatted resume text"
```

### Task 2: Non-Destructive Resume AI Orchestrator

**Files:**
- Create: `src/services/resume-ai-processing.js`
- Create: `src/services/resume-ai-processing.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing orchestration tests**

Cover these behaviors with dependency spies:

```js
await Processor.process({ candidate, version, deps });
assert.deepEqual(calls, ['persist:processing', 'basic', 'persist:basic', 'profile', 'persist:profile', 'format', 'persist:done']);
assert.equal(version.rawText, originalRawText);
assert.equal(version.formattedText, '### 电子简历');
assert.equal(version.formatStatus, 'done');
assert.equal(candidate.name, '人工姓名');
assert.equal(candidate.currentCompany, 'AI 公司'); // only when it was empty
assert.deepEqual(applications, applicationsBefore);
```

Add failure tests for missing permission, missing API configuration, short/unavailable text, an AI step throwing, and persistence failure. Assert errors are sanitized and persisted without API keys or resume body text.

Assert the corresponding candidate-level fields move through the same lifecycle:

```js
assert.equal(candidate.profileProcessStatus, 'done');
assert.equal(candidate.profileProcessError, '');
assert.ok(candidate.profileProcessedAt);
```

- [ ] **Step 2: Run the new test and verify RED**

```powershell
node --test src/services/resume-ai-processing.test.mjs
```

Expected: module-not-found failure.

- [ ] **Step 3: Implement the processor module**

Expose a browser/Node IIFE as `globalThis.WorkBuddyResumeAiProcessing` with:

```js
createQueue()
findVersion(bundle, candidateId, versionId)
process({ bundle, candidateId, versionId, canWrite, canUseAi, deps })
enqueue(queue, task, runner)
recoverInterrupted(bundle, taskKeys)
```

`process` must:

1. Locate the candidate and exact version.
2. Check write permission and AI availability before any AI call.
3. Set `processing`, clear the old error, and persist.
4. Resolve text from existing `rawText`, otherwise call `deps.loadRawText(version)` and only then fill missing `rawText`.
5. Reject source text shorter than 40 characters.
6. Call `extractBasic`, merge only empty `name/currentCompany/currentTitle/city`, then persist.
7. Call `extractProfile`, update only AI-derived `summary/keywords/skills/profileText/trajectory/directions` returned by the extractor, then persist.
8. Call `format`, write `formattedText`, `done`, `formattedAt`, clear error, then persist and schedule sync.
9. On any error set `failed`, write a sanitized user-visible `formatError`, persist best-effort, and rethrow.

At the same boundaries, update `candidate.profileProcessStatus`, `candidate.profileProcessError`, and `candidate.profileProcessedAt`. Profile completion is marked only after the profile step succeeds; a later formatting failure keeps the extracted profile fields while the version remains `failed` with the formatting error.

The queue must serialize tasks with a promise tail and deduplicate simultaneous requests for the same `candidateId:versionId`.

- [ ] **Step 4: Run orchestrator tests and verify GREEN**

```powershell
node --test src/services/resume-ai-processing.test.mjs
```

- [ ] **Step 5: Add the test to `npm test` and commit**

```powershell
git add -- src/services/resume-ai-processing.js src/services/resume-ai-processing.test.mjs package.json
git commit -m "feat: orchestrate resume AI processing"
```

### Task 3: Upload-Then-Process Integration

**Files:**
- Modify: `index.html`
- Modify: `src/batch-upload.test.mjs`
- Modify: `src/services/resume-ai-processing.test.mjs`

- [ ] **Step 1: Write failing integration contracts**

Assert the page loads `resume-ai-processing.js` before setup, constructs one queue, and exposes `enqueueResumeAiProcessing(candidateId, versionId)`. For batch processing, assert `batchGate` and duplicate resolution invoke a non-blocking `deps.afterTalentSaved({ candidateId, versionId })` only after `deps.persist()` succeeds.

The test must prove upload success is retained if `afterTalentSaved` later rejects:

```js
assert.equal(task.status, 'success');
assert.equal(bundle.candidates.length, 1);
assert.equal(bundle.candidates[0].resumeVersions.length, 1);
```

- [ ] **Step 2: Run focused tests and verify RED**

```powershell
node --test src/batch-upload.test.mjs src/services/resume-ai-processing.test.mjs
```

- [ ] **Step 3: Wire page dependencies and all accepted-upload paths**

Add the versioned script reference and one page adapter:

```js
const resumeAiQueue = ResumeAiProcessing.createQueue();
function enqueueResumeAiProcessing(candidateId, versionId) {
  return ResumeAiProcessing.enqueue(resumeAiQueue, { candidateId, versionId }, processResumeAiVersion);
}
```

`processResumeAiVersion` injects the existing helpers:

```js
extractCandidateBasicInfoWithDeepSeek
extractCandidateProfileWithDeepSeek
formatElectronicResumeWithDeepSeek
saveWorkbenchV2
schedulePush
loadCandidateResumeRawText
```

Extend batch dependencies with `afterTalentSaved`, and call the enqueue adapter after successful persistence for:

- new batch candidate;
- batch force-create;
- batch merge/new-version;
- standalone new candidate;
- standalone merge/new-version.

The callback must be fired without awaiting it:

```js
void Promise.resolve(deps.afterTalentSaved({ candidateId, versionId }))
  .catch(error => console.error('简历 AI 后台处理失败:', error.message));
```

AI failure updates processing status but never changes upload/task status to failed.

- [ ] **Step 4: Make AI permission/config failures visible**

The adapter must return explicit errors from `requireTalentAiPermission` and `requireDeepSeekApiKey`; it must not substitute filename-only success or swallow exceptions with `console.warn`.

- [ ] **Step 5: Run focused tests and commit**

```powershell
node --test src/batch-upload.test.mjs src/services/resume-ai-processing.test.mjs src/workbench-v2.test.mjs
git add -- index.html src/batch-upload.test.mjs src/services/resume-ai-processing.test.mjs
git commit -m "feat: process accepted resumes in background"
```

### Task 4: Electronic Resume Display and Reprocess Action

**Files:**
- Modify: `index.html`
- Modify: `src/workbench-v2.test.mjs`
- Modify: `src/accessibility-static.test.mjs`

- [ ] **Step 1: Write failing UI contract tests**

Require the candidate resume tab to:

- render `activeCandidateResumeVersion.formattedText` before any raw text;
- label raw fallback as `原始提取文本`;
- show `正在提取并排版` for `queued/processing`;
- show `formatError` in a `role="alert"` block for `failed`;
- provide a `type="button"` action labeled `重新提取并排版`;
- disable the action during processing;
- expose `reprocessCandidateResumeVersion` from setup.

- [ ] **Step 2: Run UI/static tests and verify RED**

```powershell
node --test src/workbench-v2.test.mjs src/accessibility-static.test.mjs
```

- [ ] **Step 3: Implement display priority and status states**

Use the existing safe `renderResumeMarkdown` function. Never pass raw text as formatted text. Render status/error banners independently above the content so an older successful `formattedText` remains visible while a reprocess request is running. The content area must follow:

```html
<div v-if="activeCandidateResumeVersion?.formatStatus === 'failed'" role="alert">{{ activeCandidateResumeVersion.formatError || 'AI 排版失败，请重试' }}</div>
<div v-else-if="activeCandidateResumeVersion?.formatStatus === 'processing'">正在提取并排版</div>
<div v-else-if="activeCandidateResumeVersion?.formatStatus === 'queued'">尚未完成 AI 排版</div>
<div v-if="activeCandidateResumeVersion?.formattedText" v-html="renderResumeMarkdown(activeCandidateResumeVersion.formattedText)"></div>
<section v-if="activeCandidateResumeVersion?.rawText"><h3>原始提取文本</h3><pre>{{ activeCandidateResumeVersion.rawText }}</pre></section>
```

If an old formatted result exists during reprocessing, keep it visible and show the processing banner above it.

- [ ] **Step 4: Implement safe reprocessing**

`reprocessCandidateResumeVersion()` checks write and AI permissions, operates only on the active candidate/version IDs, clears the old error through the processor, and enqueues that exact version. It does not append a version or modify original file metadata.

- [ ] **Step 5: Run UI/static tests and commit**

```powershell
node --test src/workbench-v2.test.mjs src/accessibility-static.test.mjs src/services/resume-ai-processing.test.mjs
git add -- index.html src/workbench-v2.test.mjs src/accessibility-static.test.mjs
git commit -m "feat: show and reprocess formatted resumes"
```

### Task 5: Refresh Recovery, Regression Review, and Deployment

**Files:**
- Modify: `index.html`
- Modify: `src/services/resume-ai-processing.test.mjs`
- Modify: `docs/superpowers/plans/2026-07-29-resume-ai-processing.md`

- [ ] **Step 1: Write a failing recovery test**

Given an explicit task key for a version left as `processing`, require `recoverInterrupted` to reset only that version to `queued`. It must not scan or enqueue unrelated historical raw-only versions.

- [ ] **Step 2: Add bounded recovery state**

Persist only explicit pending task keys in local storage under a versioned WorkBuddy key. On startup, restore those keys, convert interrupted tasks to `queued`, and enqueue them only when write permission and AI configuration are available. Otherwise persist a user-visible failure reason and leave the reprocess action available.

- [ ] **Step 3: Run all verification**

```powershell
npm test
npm run build
git diff --check
```

Expected: zero test failures, successful `dist/` build, and no whitespace errors.

- [ ] **Step 4: Review the complete diff against non-destructive boundaries**

Confirm with tests and diff inspection that version IDs, `fileId`, `sourceResumeId`, hashes, upload timestamps, original file storage, applications, notes, owner, categories, and other resume versions are unchanged by reprocessing.

- [ ] **Step 5: Commit recovery and request code review**

```powershell
git add -- index.html src/services/resume-ai-processing.test.mjs docs/superpowers/plans/2026-07-29-resume-ai-processing.md
git commit -m "feat: recover interrupted resume AI tasks"
```

- [ ] **Step 6: Merge, push, and verify deployment**

After independent review has no Critical or Important findings, merge into `main`, rerun `npm test` and `npm run build`, push, wait for the exact commit's Pages workflow, then verify online `index.html` and the new versioned processing module both return 200 and contain the expected display/reprocess markers.
