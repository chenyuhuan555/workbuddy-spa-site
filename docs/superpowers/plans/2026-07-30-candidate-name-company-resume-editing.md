# Candidate Name, Company, and Resume Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authorized users to edit a candidate's name, current company, and the formatted text of the currently selected resume version without changing extracted source text, original files, business records, or other versions.

**Architecture:** Extend the existing candidate core editor with `name` and `currentCompany`. Add a focused formatted-resume editor module that creates an isolated draft, validates the selected candidate/version, updates only `formattedText`, persists through the existing V2 snapshot path, and restores the previous version state if persistence fails. The Vue page owns UI state and schedules the existing cloud push only after a successful local save.

**Tech Stack:** Vue 3 global build, JavaScript modules exposed on `globalThis`, Node test runner, IndexedDB snapshot persistence, Supabase workspace synchronization, Tailwind CSS.

---

### Task 1: Extend candidate core editing

**Files:**
- Modify: `src/ui/candidate-core-editor.js`
- Modify: `src/ui/candidate-core-editor.test.mjs`
- Modify: `index.html`

- [ ] **Step 1: Write failing tests**

Add assertions that `createDraft()` and `buildPatch()` include trimmed `name` and `currentCompany`, reject a blank name, preserve unrelated fields, and render labeled inputs bound to `candidateCoreEdit.draft.name` and `candidateCoreEdit.draft.currentCompany`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test src/ui/candidate-core-editor.test.mjs`

Expected: failures because the new fields and validation are not implemented.

- [ ] **Step 3: Implement the smallest production change**

Extend the draft and patch contracts:

```js
const EDITABLE_FIELDS = ['name', 'currentCompany', 'skills', 'directions', 'owner', 'phone', 'email'];

function createDraft(candidate = {}) {
  return {
    name: String(candidate.name || ''),
    currentCompany: String(candidate.currentCompany || ''),
    // existing fields remain unchanged
  };
}

function buildPatch(draft = {}, skillInput = '', directionInput = '') {
  const name = String(draft.name || '').trim();
  if (!name) throw new Error('候选人姓名不能为空');
  return {
    name,
    currentCompany: String(draft.currentCompany || '').trim(),
    // existing fields remain unchanged
  };
}
```

Add visible `<label for>` controls for both fields in the current core edit form.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test src/ui/candidate-core-editor.test.mjs`

Expected: all candidate-core-editor tests pass.

### Task 2: Add current-version electronic resume editing

**Files:**
- Create: `src/ui/resume-formatted-text-editor.js`
- Create: `src/ui/resume-formatted-text-editor.test.mjs`
- Modify: `index.html`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests**

Cover `createDraft(version)`, blank formatted text, updating only the selected version, preserving `rawText` and original-file metadata, preserving other resume versions, setting `formatStatus: 'done'` and `formattedAt`, permission denial, missing version errors, and rollback after a failed persistence call. Add static UI assertions for edit/save/cancel actions, a labeled textarea, visible error state, and permission gating.

- [ ] **Step 2: Run the new focused test and verify RED**

Run: `node --test src/ui/resume-formatted-text-editor.test.mjs`

Expected: failure because the module and page integration do not exist.

- [ ] **Step 3: Implement the isolated editor module**

Expose a browser/CommonJS-compatible API:

```js
function createDraft(version = {}) {
  return { formattedText: String(version.formattedText || '') };
}

async function save(options = {}) {
  if (!options.canWrite) throw new Error('当前账号无权编辑电子简历');
  const candidate = options.bundle?.candidates?.find(item => item.id === options.candidateId);
  const version = candidate?.resumeVersions?.find(item => item.id === options.versionId);
  if (!version) throw new Error('当前简历版本不存在');
  const previous = { formattedText: version.formattedText, formatStatus: version.formatStatus, formatError: version.formatError, formatErrorCode: version.formatErrorCode, aiStage: version.aiStage, formattedAt: version.formattedAt, updatedAt: candidate.updatedAt };
  version.formattedText = String(options.draft?.formattedText || '').trim();
  version.formatStatus = version.formattedText ? 'done' : 'queued';
  version.formatError = '';
  version.formatErrorCode = '';
  version.aiStage = '';
  version.formattedAt = version.formattedText ? new Date().toISOString() : '';
  candidate.updatedAt = new Date().toISOString();
  if (await options.persist() !== true) {
    Object.assign(version, previous);
    candidate.updatedAt = previous.updatedAt;
    await options.persist().catch(() => false);
    throw new Error('电子简历保存失败，请重试');
  }
  return version;
}
```

Add `candidateResumeEdit` state and page handlers. The resume tab renders a Markdown textarea only while editing and continues rendering the existing formatted view otherwise. Version changes or leaving the candidate resume tab cancel the draft.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test src/ui/candidate-core-editor.test.mjs src/ui/resume-formatted-text-editor.test.mjs`

Expected: all focused tests pass.

### Task 3: Verify and deploy

**Files:**
- Modify: generated production assets only through the existing build command

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm test
npm run build
git diff --check
npm audit --audit-level=high --registry=https://registry.npmjs.org/
```

Expected: all tests pass, build exits 0, diff check is clean, and audit reports zero high/critical vulnerabilities.

- [ ] **Step 2: Review the exact diff and commit**

Verify no changes touch `rawText`, original file/blob metadata, applications, notes, ownership history, or unrelated UI. Commit with `feat: edit candidate identity and formatted resume`.

- [ ] **Step 3: Push and verify GitHub Pages**

Push the feature branch, merge it into `main`, push `main`, wait for the Pages workflow to reach terminal success, then request the deployed page and confirm it references the new editor asset and contains the three editing controls.

- [ ] **Step 4: Keep rollback ready**

If deployment or the production smoke test fails, revert the feature commit on `main` and push the revert. No data migration is required because all added fields already exist in the persisted V2 schema.
