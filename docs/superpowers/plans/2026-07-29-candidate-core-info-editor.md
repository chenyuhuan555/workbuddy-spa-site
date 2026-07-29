# Candidate Core Info Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow writable users to edit candidate skills, directions, owner, phone, and email from the candidate detail core-information card without changing unrelated candidate or business-history data.

**Architecture:** Put draft normalization and save/rollback orchestration in a focused browser/Node-compatible module under `src/ui/`. Keep only Vue reactive state and event handlers in `index.html`. The save helper receives the existing `WorkbenchV2.updateTalent()` and `saveWorkbenchV2()` functions as dependencies, updates only the allowlisted fields, and restores the prior values if durable persistence returns failure.

**Tech Stack:** Vue 3 global build, WorkBuddy V2 domain module, browser-compatible JavaScript, Node `node:test`, Tailwind CSS, GitHub Pages.

---

## File structure

- Create `src/ui/candidate-core-editor.js`: pure draft/tag helpers plus permission-aware save and rollback orchestration.
- Create `src/ui/candidate-core-editor.test.mjs`: behavioral tests for normalization, field allowlist, persistence rollback, permissions, and static UI wiring.
- Modify `index.html`: load the module, render card-level edit controls, hold local draft state, and connect save/cancel/navigation cleanup.
- Modify `package.json`: add the focused test file to the complete test command.

The uncommitted resume-AI design draft is outside this plan and must not be staged or edited.

### Task 1: Create the tested core-editor module

**Files:**

- Create: `src/ui/candidate-core-editor.test.mjs`
- Create: `src/ui/candidate-core-editor.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for draft creation and tag normalization**

Create `src/ui/candidate-core-editor.test.mjs` with imports, source fixtures, and these tests:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

await import('./candidate-core-editor.js');
const Editor = globalThis.WorkBuddyCandidateCoreEditor;

const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('createDraft copies only editable core fields', () => {
  const candidate = {
    id: 'c1', name: '雷艺旋', skills: ['培训', '企业文化'], directions: ['人才发展'],
    owner: '顾问A', phone: '15500000000', email: 'lei@example.com',
    resumeVersions: [{ id: 'r1' }], note: '业务备注',
  };
  const draft = Editor.createDraft(candidate);
  assert.deepEqual(draft, {
    skills: ['培训', '企业文化'], directions: ['人才发展'],
    owner: '顾问A', phone: '15500000000', email: 'lei@example.com',
  });
  draft.skills.push('新增');
  assert.deepEqual(candidate.skills, ['培训', '企业文化'], '草稿不得直接修改人才对象');
  assert.equal('resumeVersions' in draft, false);
});

test('normalizeTags supports arrays and comma-separated pending input', () => {
  assert.deepEqual(
    Editor.normalizeTags([' Java ', '企业文化', 'Java', ''], '人才发展，HRBP, 企业文化'),
    ['Java', '企业文化', '人才发展', 'HRBP'],
  );
});

test('buildPatch returns only the five editable storage fields', () => {
  const patch = Editor.buildPatch({
    skills: [' 培训 '], directions: ['人才发展'], owner: ' 顾问B ',
    phone: ' 15500000000 ', email: ' lei@example.com ', name: '不得写入',
  }, '企业文化', '组织发展');
  assert.deepEqual(patch, {
    skills: ['培训', '企业文化'], directions: ['人才发展', '组织发展'],
    owner: '顾问B', phone: '15500000000', email: 'lei@example.com',
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test src/ui/candidate-core-editor.test.mjs
```

Expected: FAIL because `src/ui/candidate-core-editor.js` does not exist.

- [ ] **Step 3: Implement the minimal pure helpers**

Create `src/ui/candidate-core-editor.js` as a browser/Node-compatible module:

```js
;(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyCandidateCoreEditor = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const EDITABLE_FIELDS = ['skills', 'directions', 'owner', 'phone', 'email'];

  function copyTags(value) {
    return Array.isArray(value) ? value.map(item => String(item || '')) : [];
  }

  function createDraft(candidate = {}) {
    return {
      skills: copyTags(candidate.skills),
      directions: copyTags(candidate.directions),
      owner: String(candidate.owner || ''),
      phone: String(candidate.phone || ''),
      email: String(candidate.email || ''),
    };
  }

  function normalizeTags(values, pendingInput = '') {
    const pending = String(pendingInput || '').split(/[，,\n]+/);
    const source = (Array.isArray(values) ? values : []).concat(pending);
    const seen = new Set();
    return source.map(value => String(value || '').trim()).filter(value => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }

  function buildPatch(draft = {}, skillInput = '', directionInput = '') {
    return {
      skills: normalizeTags(draft.skills, skillInput),
      directions: normalizeTags(draft.directions, directionInput),
      owner: String(draft.owner || '').trim(),
      phone: String(draft.phone || '').trim(),
      email: String(draft.email || '').trim(),
    };
  }

  return { EDITABLE_FIELDS, createDraft, normalizeTags, buildPatch };
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `node --test src/ui/candidate-core-editor.test.mjs`.

Expected: 3 tests pass.

- [ ] **Step 5: Add failing save-orchestration tests**

Append:

```js
test('save applies only the core patch and persists once', async () => {
  const candidate = { id: 'c1', name: '雷艺旋', skills: [], note: '保留', resumeVersions: [{ id: 'r1' }] };
  const bundle = { candidates: [candidate] };
  const updates = [];
  let persistCalls = 0;
  const result = await Editor.save({
    canWrite: true, bundle, candidateId: 'c1',
    draft: { skills: ['培训'], directions: ['人才发展'], owner: '顾问A', phone: '155', email: 'a@b.com' },
    updateTalent(currentBundle, id, patch) {
      updates.push({ id, patch });
      Object.assign(candidate, patch);
      return candidate;
    },
    async persist() { persistCalls++; return true; },
  });
  assert.equal(result, candidate);
  assert.deepEqual(Object.keys(updates[0].patch).sort(), ['directions', 'email', 'owner', 'phone', 'skills']);
  assert.equal(candidate.note, '保留');
  assert.deepEqual(candidate.resumeVersions, [{ id: 'r1' }]);
  assert.equal(persistCalls, 1);
});

test('save rejects read-only calls before mutation', async () => {
  let updated = false;
  await assert.rejects(() => Editor.save({
    canWrite: false, bundle: {}, candidateId: 'c1', draft: {},
    updateTalent() { updated = true; }, persist: async () => true,
  }), /无权编辑/);
  assert.equal(updated, false);
});

test('save rolls editable fields back when persistence fails', async () => {
  const candidate = {
    id: 'c1', skills: ['旧技能'], directions: ['旧方向'], owner: '旧顾问',
    phone: 'old-phone', email: 'old@example.com', updatedAt: 'old-time', note: '保留',
  };
  const bundle = { candidates: [candidate] };
  let persistCalls = 0;
  await assert.rejects(() => Editor.save({
    canWrite: true, bundle, candidateId: 'c1',
    draft: { skills: ['新技能'], directions: [], owner: '', phone: '', email: '' },
    updateTalent(_bundle, _id, patch) {
      Object.assign(candidate, patch, { updatedAt: 'new-time' });
      return candidate;
    },
    persist: async () => { persistCalls++; return persistCalls > 1; },
  }), /保存失败/);
  assert.deepEqual(candidate, {
    id: 'c1', skills: ['旧技能'], directions: ['旧方向'], owner: '旧顾问',
    phone: 'old-phone', email: 'old@example.com', updatedAt: 'old-time', note: '保留',
  });
  assert.equal(persistCalls, 2, '失败后必须尽力持久化回滚状态，避免备用快照保留未保存值');
});
```

- [ ] **Step 6: Run the focused test and verify RED**

Run `node --test src/ui/candidate-core-editor.test.mjs`.

Expected: FAIL because `Editor.save` is not defined.

- [ ] **Step 7: Implement save with permission checking and rollback**

Add inside the module factory and export `save`:

```js
  async function save(options = {}) {
    if (!options.canWrite) throw new Error('当前账号无权编辑人才信息');
    const candidate = options.bundle?.candidates?.find(item => item.id === options.candidateId);
    if (!candidate) throw new Error('人才不存在');
    if (typeof options.updateTalent !== 'function' || typeof options.persist !== 'function') {
      throw new Error('核心信息保存依赖不可用');
    }
    const previous = { ...createDraft(candidate), updatedAt: candidate.updatedAt };
    const patch = buildPatch(options.draft, options.skillInput, options.directionInput);
    options.updateTalent(options.bundle, candidate.id, patch);
    let persisted = false;
    try {
      persisted = await options.persist() === true;
    } catch {}
    if (!persisted) {
      Object.assign(candidate, previous);
      try { await options.persist(); } catch {}
      throw new Error('核心信息保存失败，请重试');
    }
    return candidate;
  }
```

Return `save` from the module API.

- [ ] **Step 8: Run the focused test and verify GREEN**

Run `node --test src/ui/candidate-core-editor.test.mjs`.

Expected: 6 tests pass.

- [ ] **Step 9: Add the focused test to the complete suite**

Append `src/ui/candidate-core-editor.test.mjs` to the `npm test` command in `package.json` without changing dependency versions or other scripts.

- [ ] **Step 10: Commit the tested module**

Run the focused test, inspect the staged diff and commit:

```powershell
git add -- src/ui/candidate-core-editor.js src/ui/candidate-core-editor.test.mjs package.json
git diff --cached --check
git commit -m "feat: add candidate core editor model"
```

### Task 2: Wire the Vue card-level editing experience

**Files:**

- Modify: `index.html:23` (local module scripts)
- Modify: `index.html:4476-4483` (core-information card)
- Modify: `index.html:10400-10480` (setup state area)
- Modify: `index.html:10946-10958` (candidate detail helpers)
- Modify: `index.html:22616-22630` (setup return surface)
- Modify: `src/ui/candidate-core-editor.test.mjs`

- [ ] **Step 1: Write failing static UI contract tests**

Append tests that require:

```js
test('candidate core card exposes card-level edit controls and labeled fields', () => {
  assert.match(INDEX_HTML, /@click="startCandidateCoreEdit"[^>]*>编辑</);
  assert.match(INDEX_HTML, /@click="saveCandidateCoreEdit"/);
  assert.match(INDEX_HTML, /@click="cancelCandidateCoreEdit"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.owner"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.phone"/);
  assert.match(INDEX_HTML, /v-model="candidateCoreEdit\.draft\.email"/);
  assert.match(INDEX_HTML, /list="candidate-core-owner-options"/);
  assert.match(INDEX_HTML, /id="candidate-core-owner-options"/);
});

test('candidate core card displays both phone and email and keeps category flow separate', () => {
  assert.match(INDEX_HTML, /selectedCandidate\.phone/);
  assert.match(INDEX_HTML, /selectedCandidate\.email/);
  assert.match(INDEX_HTML, /updateSelectedCandidateCategories\(category\.id/);
  assert.doesNotMatch(INDEX_HTML, /Object\.assign\(selectedCandidate[^,]*,\s*candidateCoreEdit\.draft/);
});

test('candidate core editor exposes accessible tag and save controls', () => {
  assert.match(INDEX_HTML, /aria-label="添加技术栈"/);
  assert.match(INDEX_HTML, /aria-label="添加人才方向"/);
  assert.match(INDEX_HTML, /:aria-label="'删除技术栈 '/);
  assert.match(INDEX_HTML, /:aria-label="'删除人才方向 '/);
  assert.match(INDEX_HTML, /role="alert"/);
  assert.match(INDEX_HTML, /candidateCoreEdit\.saving \? '保存中…' : '保存'/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test src/ui/candidate-core-editor.test.mjs`.

Expected: the three UI tests fail because the card has no editor controls.

- [ ] **Step 3: Load the focused editor module**

Add before the inline Vue application script:

```html
<script src="./src/ui/candidate-core-editor.js?v=20260729-core1"></script>
```

Inside setup, bind:

```js
const CandidateCoreEditor = window.WorkBuddyCandidateCoreEditor;
```

The build already copies non-test files under `src/`, so no build-script or production-build-test change is required.

- [ ] **Step 4: Add reactive draft state and small event handlers**

Add the state from the approved design and handlers with these responsibilities:

```js
const candidateCoreEdit = reactive({
  active: false, saving: false, error: '',
  draft: CandidateCoreEditor.createDraft(), skillInput: '', directionInput: '',
});

function resetCandidateCoreEdit() {
  candidateCoreEdit.active = false;
  candidateCoreEdit.saving = false;
  candidateCoreEdit.error = '';
  candidateCoreEdit.draft = CandidateCoreEditor.createDraft();
  candidateCoreEdit.skillInput = '';
  candidateCoreEdit.directionInput = '';
}

function startCandidateCoreEdit() {
  if (!requireTalentWritePermission() || !selectedCandidate.value) return;
  candidateCoreEdit.draft = CandidateCoreEditor.createDraft(selectedCandidate.value);
  candidateCoreEdit.skillInput = '';
  candidateCoreEdit.directionInput = '';
  candidateCoreEdit.error = '';
  candidateCoreEdit.active = true;
}

function addCandidateCoreTags(field, inputField) {
  candidateCoreEdit.draft[field] = CandidateCoreEditor.normalizeTags(
    candidateCoreEdit.draft[field], candidateCoreEdit[inputField],
  );
  candidateCoreEdit[inputField] = '';
}

function removeCandidateCoreTag(field, value) {
  candidateCoreEdit.draft[field] = candidateCoreEdit.draft[field].filter(item => item !== value);
}

function cancelCandidateCoreEdit() {
  resetCandidateCoreEdit();
}

async function saveCandidateCoreEdit() {
  if (!requireTalentWritePermission() || !selectedCandidate.value || candidateCoreEdit.saving) return;
  candidateCoreEdit.saving = true;
  candidateCoreEdit.error = '';
  try {
    await CandidateCoreEditor.save({
      canWrite, bundle: workbenchV2, candidateId: selectedCandidate.value.id,
      draft: candidateCoreEdit.draft,
      skillInput: candidateCoreEdit.skillInput,
      directionInput: candidateCoreEdit.directionInput,
      updateTalent: WorkbenchV2.updateTalent,
      persist: saveWorkbenchV2,
    });
    resetCandidateCoreEdit();
    if (cloudReady) schedulePush();
    showToast('核心信息已保存');
  } catch (error) {
    candidateCoreEdit.error = error.message || '核心信息保存失败，请重试';
    candidateCoreEdit.saving = false;
  }
}
```

Add a watcher on `[workbenchRoute.type, workbenchRoute.id, workbenchRoute.tab]` that calls `resetCandidateCoreEdit()` whenever the route no longer points at the same candidate overview. Do not add a confirmation dialog.

- [ ] **Step 5: Replace only the core card display/edit markup**

Keep the card, category markup, and existing visual language. Add:

- A write-permission-gated Edit button in display mode.
- Save/Cancel in edit mode.
- Tag chips with accessible delete buttons and an input for each tag field.
- Visible labels for owner, phone, and email.
- A `datalist` populated from `workbenchOwners`.
- A `role="alert"` error block.
- AI actions visible only outside edit mode.
- Display-mode contact markup that renders phone and email independently.

Every new button must use `type="button"`. Keep the existing category checkbox block and its `updateSelectedCandidateCategories()` call unchanged.

- [ ] **Step 6: Expose state and handlers to the template**

Add exactly these names to the setup return surface:

```js
candidateCoreEdit, startCandidateCoreEdit, saveCandidateCoreEdit,
cancelCandidateCoreEdit, addCandidateCoreTags, removeCandidateCoreTag,
```

- [ ] **Step 7: Run the focused test and verify GREEN**

Run `node --test src/ui/candidate-core-editor.test.mjs`.

Expected: all module and UI contract tests pass.

- [ ] **Step 8: Run related regression tests**

Run:

```powershell
node --test src/workbench-v2.test.mjs src/accessibility-static.test.mjs src/production-build.test.mjs
```

Expected: all tests pass; no local-script, accessibility, or existing candidate-detail regressions.

- [ ] **Step 9: Commit the Vue integration**

Inspect and commit only the core-editor files:

```powershell
git add -- index.html src/ui/candidate-core-editor.test.mjs
git diff --cached --check
git commit -m "feat: edit candidate core information"
```

Do not stage the resume-AI draft.

### Task 3: Full verification, review, and deployment

**Files:**

- Verify only; modify production code only if a test identifies a defect and repeat RED/GREEN for that defect.

- [ ] **Step 1: Run the complete automated suite**

Run:

```powershell
npm test
npm run build
git diff --check
```

Expected: all tests pass, production build succeeds, and diff check is clean.

- [ ] **Step 2: Perform a scoped code review**

Review the branch diff against the design:

- Only the five allowlisted fields are updated.
- Failed persistence rolls editable fields and `updatedAt` back.
- Cancel and navigation cleanup never persist.
- Direct save calls enforce permission.
- Contact display shows both phone and email.
- Categories, resumes, applications, notes, and history remain untouched.
- No secrets or personal contact values are logged.

- [ ] **Step 3: Verify in an isolated browser profile**

At desktop and mobile widths, verify:

1. Writable user sees Edit; read-only user does not.
2. Enter edit mode, add/remove skill and direction tags, select or type an owner, enter phone and email.
3. Cancel restores display without saving.
4. Save persists after refresh and displays both contact values.
5. Simulated persistence failure keeps the draft and shows an error.
6. Switching candidates discards an unsaved draft.
7. Category checkboxes and AI actions still work outside edit mode.
8. Browser console has no new errors or Vue warnings.

- [ ] **Step 4: Merge the approved branch locally**

After verification, switch to `main`, merge `codex/candidate-core-info-editor` with a non-fast-forward merge, and rerun the focused test plus `npm test`. Preserve the untracked resume-AI design draft; never clean or delete it during the merge.

- [ ] **Step 5: Push and verify GitHub Pages**

Push `main`, wait for the exact commit’s GitHub Pages workflow to complete successfully, then verify:

- Online `index.html` references `candidate-core-editor.js?v=20260729-core1`.
- The online module returns HTTP 200.
- The online page contains the Edit/Save/Cancel contract.
- A real browser refresh preserves a saved core-information edit.

- [ ] **Step 6: Report completion**

Report commits, tests, build, deployment run, online fingerprints, data-preservation boundaries, and the remaining uncommitted resume-AI design draft. Do not claim the resume-AI feature is implemented.
