# Resume Cloud File and AI Retry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make original resumes available across authorized devices while preserving local-first intake, and make resume AI retries stage-aware and usable from existing raw text.

**Architecture:** Add a focused browser-side resume file service that coordinates IndexedDB cache and the existing private Supabase Storage client. Extend resume-version metadata with cloud synchronization and AI-stage state, then wire both single and batch intake to independent file-sync and AI queues. Keep the current static GitHub Pages architecture and preserve all candidate and business history.

**Tech Stack:** Vanilla JavaScript IIFE modules, Vue 3 runtime template, IndexedDB, Supabase JavaScript Storage API, Node.js built-in test runner, Vite/Tailwind production build.

---

## File map

- Create `src/services/resume-file-sync.js`: pure orchestration for cloud paths, upload/download fallback, safe file errors, task deduplication, and interrupted-state recovery.
- Create `src/services/resume-file-sync.test.mjs`: unit tests for local-first reads, cloud caching, upload failure, duplicate tasks, and safe errors.
- Modify `src/supabase-workspace.js`: preserve safe Storage error classifications without exposing credentials or response bodies.
- Modify `src/workbench-v2.js`: normalize and serialize original-file synchronization metadata and AI stage/error code fields.
- Modify `src/workbench-v2.test.mjs`: cover new fields and legacy normalization.
- Modify `src/services/resume-ai-processing.js`: track source/basic/profile/format stages and keep successful prior results.
- Modify `src/services/resume-ai-processing.test.mjs`: cover text-only retries, source refresh, per-stage failures, throttling, and preservation of old formatted output.
- Modify `index.html`: load the file service; start file sync after reliable intake; download remote originals; expose recovery actions and two AI retry modes.
- Modify `src/batch-upload.test.mjs`: verify file synchronization starts only after the version is persisted and cannot turn a successful intake into failure.
- Create `src/ui/resume-file-and-ai-retry.test.mjs`: static UI contract tests for status labels, buttons, stage errors, and script wiring.
- Modify `package.json`: include the two new tests in the full suite.
- Create `supabase/workbuddy-files-storage.sql`: idempotent private bucket and role-aware RLS policies for the existing `profiles` authorization model.

### Task 1: Normalize resume version storage and AI state

**Files:**
- Modify: `src/workbench-v2.js:356-378`
- Modify: `src/workbench-v2.js:717-741`
- Modify: `src/workbench-v2.js:817-835`
- Test: `src/workbench-v2.test.mjs`

- [ ] **Step 1: Write failing normalization tests**

Add tests that build a new version and validate a legacy bundle:

```js
test('新简历版本包含本机原件、云端同步和 AI 阶段默认值', () => {
  const version = WorkbenchV2.buildResumeVersionFromForm({
    fileName: 'candidate.pdf', fileId: 'f1', fileType: 'application/pdf',
    fileSize: 42, fileHash: 'h1', rawText: 'raw text',
  });
  assert.equal(version.originalFileStatus, 'local-only');
  assert.equal(version.cloudFilePath, '');
  assert.equal(version.originalFileError, '');
  assert.equal(version.originalFileSyncedAt, '');
  assert.equal(version.aiStage, '');
  assert.equal(version.formatErrorCode, '');
});

test('旧版本只有 fileId 时保留引用但不伪装为云端已同步', () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  bundle.candidates.push({ id: 'c1', name: '候选人', resumeVersions: [{ id: 'r1', fileId: 'f1', rawText: 'raw' }] });
  const clean = WorkbenchV2.validateBundle(bundle);
  const version = clean.candidates[0].resumeVersions[0];
  assert.equal(version.fileId, 'f1');
  assert.equal(version.cloudFilePath, '');
  assert.equal(version.originalFileStatus, 'local-only');
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test src/workbench-v2.test.mjs`

Expected: FAIL because `originalFileStatus`, `cloudFilePath`, `aiStage`, and `formatErrorCode` are undefined.

- [ ] **Step 3: Add minimal normalization fields**

Extend `normalizeResumeVersion()` with explicit defaults:

```js
const cloudFilePath = String(source.cloudFilePath || '');
const originalFileStatus = ['local-only', 'syncing', 'synced', 'sync-failed', 'missing'].includes(source.originalFileStatus)
  ? source.originalFileStatus
  : cloudFilePath ? 'synced' : source.fileId || source.fileData || source.sourceResumeId ? 'local-only' : 'missing';
return {
  ...source,
  cloudFilePath,
  originalFileStatus: originalFileStatus === 'syncing' ? 'local-only' : originalFileStatus,
  originalFileError: String(source.originalFileError || ''),
  originalFileSyncedAt: String(source.originalFileSyncedAt || ''),
  rawText: String(source.rawText || ''),
  formattedText,
  aiStage: String(source.aiStage || ''),
  formatStatus,
  formatErrorCode: String(source.formatErrorCode || ''),
  formatError: String(source.formatError || ''),
  formattedAt: String(source.formattedAt || ''),
};
```

Copy these fields through `appendTalentResumeVersion()` and initialize new file versions with `originalFileStatus: form.fileId ? 'local-only' : 'missing'`.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test src/workbench-v2.test.mjs`

Expected: all workbench tests PASS and existing version IDs, hashes, and timestamps remain unchanged.

- [ ] **Step 5: Commit the data-model slice**

```powershell
git add src/workbench-v2.js src/workbench-v2.test.mjs
git commit -m "feat: track resume original file state"
```

### Task 2: Implement the local-first private file service

**Files:**
- Create: `src/services/resume-file-sync.js`
- Create: `src/services/resume-file-sync.test.mjs`
- Modify: `src/supabase-workspace.js:11-17`
- Modify: `package.json`

- [ ] **Step 1: Write failing service tests**

Cover stable paths, local-first load, remote cache fill, non-destructive upload failure, object-exists recovery, and task deduplication:

```js
test('云端路径不包含候选人姓名和原文件名', () => {
  assert.equal(Files.buildCloudPath({ candidateId: 'c1', versionId: 'r1', fileId: 'f1' }), 'workspace/main/resumes/c1/r1/f1');
});

test('本机有 blob 时不请求云端', async () => {
  let downloads = 0;
  const result = await Files.loadOriginal({ fileId: 'f1', cloudFilePath: 'remote/f1' }, {
    getLocal: async () => ({ blob: new Blob(['local'], { type: 'application/pdf' }), fileType: 'application/pdf' }),
    download: async () => { downloads++; },
    saveLocal: async () => assert.fail('不应回写已有本地文件'),
  });
  assert.equal(result.source, 'local');
  assert.equal(downloads, 0);
});

test('本机缺失时下载私有云端文件并缓存', async () => {
  const cached = [];
  const blob = new Blob(['remote'], { type: 'application/pdf' });
  const result = await Files.loadOriginal({ fileId: 'f1', fileName: 'a.pdf', fileType: 'application/pdf', cloudFilePath: 'remote/f1' }, {
    getLocal: async () => null,
    download: async path => { assert.equal(path, 'remote/f1'); return blob; },
    saveLocal: async (...args) => cached.push(args),
  });
  assert.equal(result.source, 'cloud');
  assert.equal(result.blob, blob);
  assert.equal(cached.length, 1);
});

test('本机和云端均无原件时使用旧来源并缓存', async () => {
  const legacyBlob = new Blob(['legacy'], { type: 'application/pdf' });
  const result = await Files.loadOriginal({ fileId: 'f1', fileName: 'old.pdf' }, {
    getLocal: async () => null,
    loadLegacy: async () => ({ blob: legacyBlob, fileType: 'application/pdf' }),
    saveLocal: async () => {},
  });
  assert.equal(result.source, 'legacy');
});

test('云端上传失败保留本地状态并返回安全原因', async () => {
  const version = { fileId: 'f1', originalFileStatus: 'local-only' };
  await assert.rejects(() => Files.syncOriginal({ candidateId: 'c1', versionId: 'r1', version }, {
    getLocal: async () => ({ blob: new Blob(['x']) }),
    upload: async () => { const error = new Error('BACKEND_REQUEST_FAILED'); error.code = 'STORAGE_NETWORK'; throw error; },
    persist: async () => true,
  }), /原始文件云端同步失败/);
  assert.equal(version.originalFileStatus, 'sync-failed');
  assert.equal(version.fileId, 'f1');
});
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `node --test src/services/resume-file-sync.test.mjs`

Expected: FAIL because `resume-file-sync.js` does not exist.

- [ ] **Step 3: Implement the focused IIFE service**

Expose a small API:

```js
;(function initResumeFileSync(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyResumeFileSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createResumeFileSync() {
  function buildCloudPath({ candidateId, versionId, fileId }) {
    return `workspace/main/resumes/${encodeURIComponent(candidateId)}/${encodeURIComponent(versionId)}/${encodeURIComponent(fileId)}`;
  }
  function createQueue() { return { tail: Promise.resolve(), active: new Map() }; }
  function enqueue(queue, task, runner) {
    const key = `${task.candidateId}:${task.versionId}`;
    if (queue.active.has(key)) return queue.active.get(key);
    const run = queue.tail.then(() => runner(task));
    queue.tail = run.catch(() => {});
    queue.active.set(key, run);
    run.finally(() => queue.active.delete(key)).catch(() => {});
    return run;
  }
  function sanitizeFileError(error) {
    const code = String(error?.code || error?.message || '');
    if (code === 'AUTH_REQUIRED') return { code, message: '登录状态已失效，请重新登录后重试' };
    if (code === 'STORAGE_FORBIDDEN') return { code, message: '当前账号没有原始文件访问权限' };
    if (code === 'STORAGE_NOT_FOUND') return { code, message: '云端原始文件不存在' };
    if (code === 'STORAGE_RATE_LIMITED') return { code, message: '原始文件同步请求过于频繁，请稍后重试' };
    if (/network|fetch|BACKEND_REQUEST_FAILED/i.test(code)) return { code: 'STORAGE_NETWORK', message: '原始文件云端同步失败，请检查网络后重试' };
    return { code: 'STORAGE_FAILED', message: '原始文件云端同步失败，请重试' };
  }
  async function syncOriginal({ candidateId, versionId, version }, deps) {
    const local = await deps.getLocal(version.fileId);
    if (!local?.blob) throw Object.assign(new Error('本机原始文件不存在'), { code: 'LOCAL_FILE_MISSING' });
    const path = version.cloudFilePath || buildCloudPath({ candidateId, versionId, fileId: version.fileId });
    version.cloudFilePath = path;
    version.originalFileStatus = 'syncing';
    version.originalFileError = '';
    await deps.persist();
    try {
      await deps.upload({ path, blob: local.blob, contentType: version.fileType || local.fileType || local.blob.type });
    } catch (error) {
      if (error?.code !== 'STORAGE_ALREADY_EXISTS') {
        const safe = sanitizeFileError(error);
        version.originalFileStatus = 'sync-failed';
        version.originalFileError = safe.message;
        await deps.persist();
        throw Object.assign(new Error(safe.message), { code: safe.code });
      }
      await deps.download(path);
    }
    version.originalFileStatus = 'synced';
    version.originalFileError = '';
    version.originalFileSyncedAt = deps.now ? deps.now() : new Date().toISOString();
    await deps.persist();
    deps.scheduleSync?.();
    return { path };
  }
  async function loadOriginal(version, deps) {
    if (version.fileId) {
      const local = await deps.getLocal(version.fileId);
      if (local?.blob) return { ...local, source: 'local' };
    }
    if (version.cloudFilePath) {
      try {
        const blob = await deps.download(version.cloudFilePath);
        if (!(blob instanceof Blob)) throw Object.assign(new Error('云端原始文件不可用'), { code: 'STORAGE_NOT_FOUND' });
        await deps.saveLocal(version.fileId, blob, {
          fileName: version.fileName, fileType: version.fileType || blob.type,
          fileSize: version.fileSize || blob.size, fileHash: version.fileHash,
        });
        return { blob, fileType: version.fileType || blob.type, source: 'cloud' };
      } catch (error) {
        if (error?.code !== 'STORAGE_NOT_FOUND') throw error;
      }
    }
    const legacy = await deps.loadLegacy?.(version);
    if (legacy?.blob) {
      await deps.saveLocal(version.fileId, legacy.blob, {
        fileName: version.fileName, fileType: legacy.fileType || version.fileType,
        fileSize: version.fileSize || legacy.blob.size, fileHash: version.fileHash,
      });
      return { ...legacy, source: 'legacy' };
    }
    throw Object.assign(new Error('原始文件不可用'), { code: 'ORIGINAL_NOT_FOUND' });
  }
  function recoverInterrupted(version) {
    if (version?.originalFileStatus === 'syncing') version.originalFileStatus = 'local-only';
    return version;
  }
  return { buildCloudPath, createQueue, enqueue, syncOriginal, loadOriginal, recoverInterrupted, sanitizeFileError };
});
```

`loadOriginal()` must call `getLocal` first, then `download`, then `saveLocal`. `syncOriginal()` must persist `syncing`, then either `synced` or `sync-failed`; it must never clear `fileId` or delete local data.

- [ ] **Step 4: Preserve safe Supabase Storage error categories**

Update `mapError()` so downstream code can distinguish authentication, permission, object absence, duplicate object, throttling, and network/backend failure without copying response bodies:

```js
if (/not.?found|\b404\b/i.test(text)) return appError('STORAGE_NOT_FOUND', error);
if (/already exists|duplicate|\b409\b/i.test(text)) return appError('STORAGE_ALREADY_EXISTS', error);
if (/unauthorized|\b401\b/i.test(text)) return appError('AUTH_REQUIRED', error);
if (/forbidden|row.level.security|\b403\b/i.test(text)) return appError('STORAGE_FORBIDDEN', error);
if (/rate|limit|\b429\b/i.test(text)) return appError('STORAGE_RATE_LIMITED', error);
```

Do not expose `error.message` from Supabase directly to the page.

- [ ] **Step 5: Add tests to the full suite and confirm GREEN**

Add `src/services/resume-file-sync.test.mjs` to the `npm test` command. Task 5 will append the UI test after that file exists. Run:

Run: `node --test src/services/resume-file-sync.test.mjs`

Expected: all file service tests PASS.

- [ ] **Step 6: Commit the service slice**

```powershell
git add src/services/resume-file-sync.js src/services/resume-file-sync.test.mjs src/supabase-workspace.js package.json
git commit -m "feat: add private resume file sync service"
```

### Task 3: Make AI processing stage-aware and preserve successful results

**Files:**
- Modify: `src/services/resume-ai-processing.js:32-138`
- Modify: `src/services/resume-ai-processing.test.mjs`

- [ ] **Step 1: Write failing stage and retry tests**

Add tests for text-only processing, exact stage errors, old formatted content preservation, and rate-limit classification:

```js
test('现有文本重试不读取原始文件', async () => {
  const bundle = makeBundle();
  const deps = successfulDeps([]);
  deps.loadRawText = async () => assert.fail('已有 rawText 时不应读取原件');
  await Processor.process({ bundle, candidateId: 'candidate_lei', versionId: 'resume_lei', canWrite: true, canUseAi: true, refreshRawText: false, deps });
  assert.equal(bundle.candidates[0].resumeVersions[0].formatStatus, 'done');
});

test('画像阶段失败时保存阶段和安全错误码', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  const deps = successfulDeps([]);
  deps.extractProfile = async () => { throw new Error('HTTP 429 rate limit'); };
  await assert.rejects(() => Processor.process({ bundle, candidateId: 'candidate_lei', versionId: 'resume_lei', canWrite: true, canUseAi: true, deps }), /画像提取失败/);
  assert.equal(version.aiStage, 'profile');
  assert.equal(version.formatErrorCode, 'AI_RATE_LIMITED');
});

test('新排版失败时继续保留上一次成功排版', async () => {
  const bundle = makeBundle();
  const version = bundle.candidates[0].resumeVersions[0];
  version.formattedText = '### 上一次成功结果';
  const deps = successfulDeps([]);
  deps.format = async () => { throw new Error('timeout'); };
  await assert.rejects(() => Processor.process({ bundle, candidateId: 'candidate_lei', versionId: 'resume_lei', canWrite: true, canUseAi: true, deps }), /电子简历排版失败/);
  assert.equal(version.formattedText, '### 上一次成功结果');
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test src/services/resume-ai-processing.test.mjs`

Expected: stage assertions fail because the current processor only stores one generic message.

- [ ] **Step 3: Implement stage-aware failures**

Track the current stage before each external action:

```js
function setStage(version, stage) {
  version.aiStage = stage;
  version.formatErrorCode = '';
  version.formatError = '';
}

setStage(version, 'basic');
const basic = await deps.extractBasic(rawText, version.fileName || '', candidate);
// persist
setStage(version, 'profile');
const profile = await deps.extractProfile(rawText, version.fileName || '', candidate);
// persist
setStage(version, 'format');
const formattedText = String(await deps.format(rawText, version.fileName || '', candidate) || '').trim();
```

Replace `sanitizeError()` with a classifier returning `{ code, message }`. Include `AI_RATE_LIMITED` for 429/rate/quota errors and prefix safe messages with the stage label. On success clear `aiStage`, `formatErrorCode`, and `formatError`. On failure preserve `formattedText` and any successful candidate fields.

```js
const STAGE_LABELS = { source: '原始文件提取', basic: '基础信息提取', profile: '候选人画像提取', format: '电子简历排版' };
function classifyError(error, stage) {
  const text = String(error?.message || error || '');
  let code = 'AI_FAILED';
  let reason = 'AI 处理失败，请重试';
  if (/AI 功能权限/i.test(text)) { code = 'AI_PERMISSION'; reason = '当前账号没有 AI 功能权限'; }
  else if (/api\s*key|unauthorized|\b401\b|配置/i.test(text)) { code = 'AI_CONFIG'; reason = 'DeepSeek API Key 未配置或无效'; }
  else if (/\b429\b|rate|quota|额度|限流/i.test(text)) { code = 'AI_RATE_LIMITED'; reason = 'AI 请求过于频繁或额度不足，请稍后重试'; }
  else if (/timeout|超时/i.test(text)) { code = 'AI_TIMEOUT'; reason = 'AI 请求超时，请重试'; }
  else if (/network|fetch|网络/i.test(text)) { code = 'AI_NETWORK'; reason = 'AI 网络请求失败，请检查网络后重试'; }
  else if (/json|返回.*格式|数据格式/i.test(text)) { code = 'AI_FORMAT'; reason = 'AI 返回格式错误，请重试'; }
  else if (/原文件.*不存在|无法读取原文件/i.test(text)) { code = 'SOURCE_MISSING'; reason = '原始简历文件不存在'; }
  else if (/文字.*少|文本.*少|文本不可用|原始文本为空/i.test(text)) { code = 'TEXT_UNUSABLE'; reason = '简历文字太少或不可用'; }
  const label = STAGE_LABELS[stage];
  return { code, message: label ? `${label}失败：${reason}` : reason };
}
```

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test src/services/resume-ai-processing.test.mjs`

Expected: all existing and new resume AI tests PASS.

- [ ] **Step 5: Commit the AI slice**

```powershell
git add src/services/resume-ai-processing.js src/services/resume-ai-processing.test.mjs
git commit -m "fix: report resume AI failures by stage"
```

### Task 4: Wire file synchronization into reliable intake

**Files:**
- Modify: `index.html:14-24`
- Modify: `index.html:10646-10659`
- Modify: `index.html:11230-11360`
- Modify: `index.html:12270-12355`
- Modify: `src/batch-upload.test.mjs`

- [ ] **Step 1: Write failing intake ordering tests**

Add static and behavioral assertions:

```js
test('可靠入库后独立启动原件同步和 AI，任一后台失败不改变成功状态', async () => {
  const bundle = WorkbenchV2.createEmptyBundle();
  const state = makeState(1);
  const deps = makeDeps(bundle, { parseImpl: task => formFromName(task.fileName) });
  const events = [];
  deps.afterTalentSaved = payload => { events.push(['saved', payload]); throw new Error('background offline'); };
  WorkbenchV2.batchAddFiles(state, [fakeFile('候选人.pdf')]);
  WorkbenchV2.batchPump(state, deps);
  await drain(state);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.tasks[0].status, 'success');
  assert.equal(bundle.candidates.length, 1);
  assert.equal(events.length, 1);
});

test('页面在保存版本后分别排队原件同步和 AI', () => {
  const source = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(source, /function enqueueResumeFileSync\(candidateId, versionId\)/);
  assert.match(source, /afterTalentSaved:\s*\(\{ candidateId, versionId \}\) => scheduleResumePostSaveTasks\(candidateId, versionId\)/);
});
```

- [ ] **Step 2: Run batch tests and confirm RED**

Run: `node --test src/batch-upload.test.mjs`

Expected: FAIL because the file queue and combined post-save scheduler are absent.

- [ ] **Step 3: Load and initialize the file service**

Add the script before the main application code with a dated cache-busting version and initialize:

```js
const ResumeFileSync = window.WorkBuddyResumeFileSync;
const resumeFileQueue = ResumeFileSync.createQueue();
```

Implement `enqueueResumeFileSync(candidateId, versionId)` using the existing storage and save APIs:

```js
function enqueueResumeFileSync(candidateId, versionId) {
  return ResumeFileSync.enqueue(resumeFileQueue, { candidateId, versionId }, async task => {
    const { version } = ResumeAiProcessing.findVersion(workbenchV2, task.candidateId, task.versionId);
    return ResumeFileSync.syncOriginal({ ...task, version }, {
      getLocal: getResumeBlob,
      upload: options => getWorkspaceStateClient().uploadFile(options),
      download: path => getWorkspaceStateClient().downloadFile(path),
      persist: saveWorkbenchV2,
      scheduleSync: schedulePush,
    });
  });
}
```

- [ ] **Step 4: Start independent post-save tasks**

Add one non-blocking scheduler:

```js
function scheduleResumePostSaveTasks(candidateId, versionId) {
  void enqueueResumeFileSync(candidateId, versionId).catch(() => {});
  void enqueueResumeAiProcessing(candidateId, versionId).catch(() => {});
}
```

Use it in `batchDeps.afterTalentSaved`, `saveCandidateOnly`, `mergeCandidateToExisting`, and `saveAsNewResumeVersion` only after `saveWorkbenchV2()` succeeds. Do not await either background task and do not alter an already successful upload-task status.

- [ ] **Step 5: Recover interrupted file state safely**

During app initialization, convert only explicit `syncing` states to retryable `local-only`; do not scan and upload all old records. File sync is retried by user action or immediately after a new intake.

```js
function recoverInterruptedResumeFileStates() {
  let changed = false;
  workbenchV2.candidates.forEach(candidate => {
    (candidate.resumeVersions || []).forEach(version => {
      if (version.originalFileStatus !== 'syncing') return;
      ResumeFileSync.recoverInterrupted(version);
      changed = true;
    });
  });
  return changed ? saveWorkbenchV2() : Promise.resolve(true);
}
```

- [ ] **Step 6: Run batch and file service tests**

Run: `node --test src/batch-upload.test.mjs src/services/resume-file-sync.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the intake slice**

```powershell
git add index.html src/batch-upload.test.mjs
git commit -m "feat: sync resume originals after intake"
```

### Task 5: Add cross-device preview, recovery controls, and two AI retry modes

**Files:**
- Modify: `index.html:4635-4675`
- Modify: `index.html:11250-11360`
- Modify: `index.html:12400-12465`
- Create: `src/ui/resume-file-and-ai-retry.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing UI contract tests**

Create a static test that verifies user-visible recovery paths:

```js
test('简历页提供文本重试、原件重提取和原件同步恢复动作', () => {
  assert.match(INDEX_HTML, /使用现有文本重新处理/);
  assert.match(INDEX_HTML, /从原始文件重新提取并处理/);
  assert.match(INDEX_HTML, /同步原始文件/);
  assert.match(INDEX_HTML, /重新上传原件/);
  assert.match(INDEX_HTML, /originalFileStatus/);
  assert.match(INDEX_HTML, /cloudFilePath/);
});

test('失败时仍优先显示既有排版并显示阶段错误', () => {
  assert.match(INDEX_HTML, /activeCandidateResumeVersion\?\.formattedText/);
  assert.match(INDEX_HTML, /resumeAiStageLabel/);
  assert.match(INDEX_HTML, /formatErrorCode/);
});
```

- [ ] **Step 2: Run UI test and confirm RED**

Run: `node --test src/ui/resume-file-and-ai-retry.test.mjs`

Expected: FAIL because the new actions and status labels do not exist.

- [ ] **Step 3: Separate AI retry actions**

Replace the single handler with:

```js
async function reprocessCandidateResumeFromText() {
  return runCandidateResumeReprocess({ refreshRawText: false });
}
async function reextractCandidateResumeFromOriginal() {
  return runCandidateResumeReprocess({ refreshRawText: true });
}
```

`loadCandidateResumeRawText()` must use the file service for local/cloud retrieval when `refresh` is true. When `refresh` is false and `rawText` exists, it must return immediately without touching the file service.

```js
async function runCandidateResumeReprocess({ refreshRawText }) {
  if (!requireTalentWritePermission() || !requireTalentAiPermission()) return;
  const candidate = selectedCandidate.value;
  const version = activeCandidateResumeVersion.value;
  if (!candidate || !version) return showToast('当前没有可处理的简历版本', 'error');
  if (!refreshRawText && String(version.rawText || '').trim().length < 40) {
    return showToast('现有原始文本不足，请从原始文件重新提取', 'error');
  }
  try {
    await enqueueResumeAiProcessing(candidate.id, version.id, { refreshRawText });
    showToast(refreshRawText ? '已从原始文件重新提取并处理' : '已使用现有文本重新处理');
  } catch (error) {
    showToast(error.message || '简历重新处理失败', 'error');
  }
}
```

- [ ] **Step 4: Make original preview local-first and cloud-backed**

Replace direct `getResumeBlob()` logic in `loadCandidateResumeOriginal()` with `ResumeFileSync.loadOriginal()`. Pass dependencies that download through `getWorkspaceStateClient().downloadFile()` and cache through `saveResumeBlob()`. Keep the legacy Data URL fallback after the service returns a not-found result.

Before loading an old version, assign a stable local key if it has none, then provide the existing compatibility loader as `loadLegacy`:

```js
async function loadCandidateOriginalRecord(version) {
  if (!version.fileId) version.fileId = `fid_${version.id || Date.now().toString(36)}`;
  return ResumeFileSync.loadOriginal(version, {
    getLocal: getResumeBlob,
    download: path => getWorkspaceStateClient().downloadFile(path),
    saveLocal: saveResumeBlob,
    loadLegacy: async current => {
      let data = String(current.fileData || '');
      if (!data && (current.sourceResumeId || current.id)) {
        const legacyResume = { id: current.id, sourceResumeId: current.sourceResumeId || current.id, name: current.fileName || '简历', data: '' };
        await ensureResumeData(legacyResume);
        data = String(legacyResume.data || '');
      }
      if (!data) return null;
      const response = await fetch(data);
      const blob = await response.blob();
      return { blob, fileType: current.fileType || blob.type };
    },
  });
}
```

`retryCandidateResumeFileSync()` first calls `loadCandidateOriginalRecord(version)` so an old compatible source is materialized into IndexedDB, then calls `enqueueResumeFileSync(candidate.id, version.id)`. This makes the old-file recovery path use the same upload queue as new files.

- [ ] **Step 5: Add visible file states and recovery buttons**

Render concise states:

```html
<span v-if="activeCandidateResumeVersion?.originalFileStatus === 'syncing'">原件正在同步</span>
<span v-else-if="activeCandidateResumeVersion?.originalFileStatus === 'sync-failed'">原件仅本设备可用：{{ activeCandidateResumeVersion.originalFileError }}</span>
<button v-if="canWrite && ['local-only','sync-failed'].includes(activeCandidateResumeVersion?.originalFileStatus)" type="button" @click="retryCandidateResumeFileSync">同步原始文件</button>
<button v-if="canWrite && activeCandidateResumeVersion?.originalFileStatus === 'missing'" type="button" @click="openCandidateOriginalReplacement">重新上传原件</button>
```

The replacement handler must save the selected file under the same version, update file metadata, preserve version ID and business records, save, then enqueue file sync. It must not create a candidate or another resume version.

```js
async function replaceCandidateResumeOriginal(event) {
  if (!requireTalentWritePermission()) return;
  const file = event.target.files?.[0];
  event.target.value = '';
  const version = activeCandidateResumeVersion.value;
  const candidate = selectedCandidate.value;
  if (!file || !version || !candidate) return;
  const fileData = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('原始文件读取失败'));
    reader.readAsDataURL(file);
  });
  const fileId = (crypto.randomUUID && crypto.randomUUID()) || `fid_${Date.now().toString(36)}`;
  const fileHash = await hashResumeData(fileData);
  await saveResumeBlob(fileId, file, { fileName: file.name, fileType: file.type, fileSize: file.size, fileHash });
  Object.assign(version, {
    fileId, fileName: file.name, fileType: file.type || '', fileSize: file.size,
    fileHash, cloudFilePath: '', originalFileStatus: 'local-only',
    originalFileError: '', originalFileSyncedAt: '',
  });
  await saveWorkbenchV2();
  if (cloudReady) schedulePush();
  void enqueueResumeFileSync(candidate.id, version.id).catch(error => showToast(error.message, 'error'));
}
```

- [ ] **Step 6: Preserve prior formatted output on failed refresh**

Render `formattedText` whenever present, including after a failed refresh. Show the failure alert above it. Render `rawText` fallback only when no formatted output exists. Add `resumeAiStageLabel()` for source/basic/profile/format user labels.

- [ ] **Step 7: Run UI, AI, and accessibility tests**

Run: `node --test src/ui/resume-file-and-ai-retry.test.mjs src/services/resume-ai-processing.test.mjs src/accessibility-static.test.mjs`

Expected: all tests PASS; all new buttons have `type="button"` and alerts retain accessible roles.

- [ ] **Step 8: Commit the UI and recovery slice**

```powershell
git add index.html src/ui/resume-file-and-ai-retry.test.mjs package.json
git commit -m "feat: recover resume originals across devices"
```

### Task 6: Add private bucket and RLS deployment SQL

**Files:**
- Create: `supabase/workbuddy-files-storage.sql`

- [ ] **Step 1: Write the idempotent bucket configuration**

Create a private bucket with explicit constraints:

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workbuddy-files',
  'workbuddy-files',
  false,
  20971520,
  array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
```

- [ ] **Step 2: Add role-aware read and write policies**

Use the existing profile table and active-role checks, constrained to the bucket and `workspace/main/resumes/` prefix:

```sql
drop policy if exists "workbuddy active members read resume files" on storage.objects;
create policy "workbuddy active members read resume files"
on storage.objects for select to authenticated
using (
  bucket_id = 'workbuddy-files'
  and name like 'workspace/main/resumes/%'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  )
);

drop policy if exists "workbuddy editors upload resume files" on storage.objects;
create policy "workbuddy editors upload resume files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'workbuddy-files'
  and name like 'workspace/main/resumes/%'
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin','editor')
  )
);
```

Do not add public read, update, or delete policies.

- [ ] **Step 3: Validate SQL against the real Supabase project**

Apply the file in [Supabase SQL Editor](https://supabase.com/dashboard/project/pskqpgzwifdozaxprpik/sql/new), then verify:

```sql
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'workbuddy-files';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
```

Expected: bucket is private; one authenticated SELECT policy and one authenticated INSERT policy exist for WorkBuddy; no public policy grants resume access.

- [ ] **Step 4: Commit the deployment SQL**

```powershell
git add supabase/workbuddy-files-storage.sql
git commit -m "chore: define private resume storage policies"
```

### Task 7: Full verification, browser evidence, and deployment

**Files:**
- Verify all changed files
- Generated build: `dist/` only if the repository's existing deployment process expects it

- [ ] **Step 1: Run the complete automated test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: Tailwind CSS and site build complete successfully; the build guard confirms required source files are copied.

- [ ] **Step 3: Run dependency security audit**

Run: `npm audit --registry=https://registry.npmjs.org --audit-level=high`

Expected: zero high or critical vulnerabilities, or a documented upstream exception that does not affect shipped browser code.

- [ ] **Step 4: Test the real browser flows locally**

Start the existing Vite server and verify through browser developer tools:

1. Upload a PDF while Storage requests are blocked: candidate and raw text remain saved, status becomes “原件仅本设备可用”.
2. Restore network and click “同步原始文件”: one authenticated Storage upload succeeds and status becomes `synced`.
3. Clear only the local resume blob, reload, and open “原始文件”: one authenticated download succeeds, preview opens, and IndexedDB receives the blob.
4. Run “使用现有文本重新处理” with the local blob absent: no Storage download occurs before AI calls.
5. Force a profile or format failure: the page names the failed stage and keeps prior successful data.
6. Verify a viewer can download but cannot upload and an editor/admin can do both.

- [ ] **Step 5: Review the final diff for scope and secrets**

Run:

```powershell
git status --short
git diff main...HEAD --stat
git diff main...HEAD --check
git diff main...HEAD | Select-String -Pattern 'service_role|password|secret|private_key|bearer' -CaseSensitive:$false
```

Expected: only planned files changed; no credentials, trailing whitespace, unrelated refactors, or generated local logs are included.

- [ ] **Step 6: Request final code review and fix only actionable findings**

Review for correctness, data preservation, permissions, accessibility, and missing tests. Re-run the focused tests after each fix and the full suite after the last fix.

- [ ] **Step 7: Merge, push, and deploy through the existing GitHub Pages workflow**

After all verification passes, merge the short-lived feature branch into `main`, push `main`, and wait for the repository's Pages workflow to complete.

- [ ] **Step 8: Verify the deployed site independently**

Open [WorkBuddy production](https://chenyuhuan555.github.io/workbuddy-spa-site/) with a cache-busting query. Confirm the new script version is served, sign in, repeat one upload/download path, inspect console and network errors, and compare the deployed commit with local `main` before declaring success.

- [ ] **Step 9: Record the verified release commit**

Run: `git log -1 --oneline`

Expected: the displayed commit is the same commit served by GitHub Pages.
