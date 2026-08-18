# Orphan Application Candidate Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely repair orphaned `applications.candidateId` references without losing progression history, then prevent invalid references from passing cloud-read validation or inflating active-candidate counts.

**Architecture:** Add a pure integrity module that audits candidate/application relationships and creates only deterministic repair mappings from tombstoned source candidates to one active candidate. Add a UI action module that requires a downloaded backup, re-audits immediately before writing, performs one batch upsert, verifies the result, and rolls back application rows if verification fails. Deploy and repair production data before enabling the stricter read-path gate.

**Tech Stack:** Browser JavaScript, Vue 3 composition API, Supabase JS client, Node.js built-in test runner, Vite/Tailwind production build, GitHub Pages.

---

## File map

- Create `src/services/application-candidate-integrity.js`: pure normalization, orphan audit, deterministic mapping, plan fingerprint, patch generation, and post-repair verification.
- Create `src/services/application-candidate-integrity.test.mjs`: unit tests for safe and unsafe mapping cases.
- Create `src/ui/application-candidate-repair-actions.js`: audit, backup gate, stale-plan protection, batch write, verification, and rollback orchestration.
- Create `src/ui/application-candidate-repair-actions.test.mjs`: action-flow tests with injected repositories and backup callback.
- Modify `src/services/repo/workbench-entity-read-path.js`: include candidate-reference integrity in the Phase 3 parity report.
- Modify `src/services/repo/workbench-entity-read-path.test.mjs`: cover the cross-table read-path gate.
- Modify `src/production-build.test.mjs`: assert production wiring and corrected fallback wording/counting.
- Modify `index.html`: load the modules, add the admin repair card, wire existing repositories, expose state/actions, validate authority loads, and count only valid candidates.
- No SQL constraint is applied in this plan. After production orphan count reaches zero, a separate reviewed Supabase migration may add a non-cascading foreign key.

### Task 1: Pure orphan audit and deterministic mapping

**Files:**
- Create: `src/services/application-candidate-integrity.js`
- Create: `src/services/application-candidate-integrity.test.mjs`

- [ ] **Step 1: Write the failing audit tests**

```js
test('finds orphan applications while preserving valid links', () => {
  const report = Integrity.audit({
    candidates: [{ id: 'active-1', name: '甲' }],
    applications: [
      { id: 'app-ok', candidateId: 'active-1', stage: 'interview' },
      { id: 'app-bad', candidateId: 'old-1', stage: 'discovered' },
    ],
  });
  assert.deepEqual(report.orphanApplicationIds, ['app-bad']);
  assert.deepEqual(report.orphanCandidateIds, ['old-1']);
});

test('maps a tombstoned source only when one active candidate shares a strong identity', () => {
  const report = Integrity.audit({
    candidates: [
      { id: 'old-1', deletedAt: '2026-08-03', resumeVersions: [{ sourceResumeId: 'resume-9', fileHash: 'hash-9' }] },
      { id: 'new-1', resumeVersions: [{ sourceResumeId: 'resume-9', fileHash: 'hash-9' }] },
    ],
    applications: [{ id: 'app-1', candidateId: 'old-1', stage: 'discovered' }],
  });
  assert.deepEqual(report.mappings, [{ fromCandidateId: 'old-1', toCandidateId: 'new-1', evidence: ['fileHash:hash-9', 'sourceResumeId:resume-9'], applicationIds: ['app-1'] }]);
});

test('does not auto-map name-only or conflicting identities', () => {
  const report = Integrity.audit({
    candidates: [
      { id: 'old-1', deletedAt: '2026-08-03', name: '张三', phone: '13800000000' },
      { id: 'new-1', name: '张三', phone: '13800000000' },
      { id: 'new-2', name: '张三', phone: '13800000000' },
    ],
    applications: [{ id: 'app-1', candidateId: 'old-1' }],
  });
  assert.equal(report.mappings.length, 0);
  assert.equal(report.unresolved[0].reason, 'MULTIPLE_STRONG_MATCHES');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/services/application-candidate-integrity.test.mjs`

Expected: FAIL because `application-candidate-integrity.js` does not exist.

- [ ] **Step 3: Implement the minimal pure module**

```js
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 7 ? digits : '';
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function versionKeys(candidate) {
  const keys = [];
  for (const version of candidate?.resumeVersions || []) {
    if (version?.fileHash) keys.push(`fileHash:${String(version.fileHash).trim().toLowerCase()}`);
    if (version?.sourceResumeId) keys.push(`sourceResumeId:${String(version.sourceResumeId).trim()}`);
  }
  return [...new Set(keys)].sort();
}

function contactKeys(candidate) {
  const keys = [];
  const phone = normalizePhone(candidate?.phone);
  const email = normalizeEmail(candidate?.email);
  if (phone) keys.push(`phone:${phone}`);
  if (email) keys.push(`email:${email}`);
  return keys;
}

function compositeKey(candidate) {
  const values = [candidate?.name, candidate?.currentCompany, candidate?.currentTitle]
    .map(value => String(value || '').trim().toLowerCase());
  return values.every(Boolean) ? `profile:${values.join('|')}` : '';
}

function indexKeys(candidates, getKeys) {
  const index = new Map();
  for (const candidate of candidates) {
    for (const key of getKeys(candidate)) {
      if (!index.has(key)) index.set(key, new Set());
      index.get(key).add(candidate.id);
    }
  }
  return index;
}

function matchingIds(keys, index) {
  const ids = new Set();
  for (const key of keys) for (const id of index.get(key) || []) ids.add(id);
  return ids;
}

function fingerprint(value) {
  const text = JSON.stringify(value);
  let hash = 5381;
  for (let index = 0; index < text.length; index += 1) hash = ((hash << 5) + hash + text.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}

function audit({ candidates = [], applications = [] } = {}) {
  const validCandidates = candidates.filter(item => item?.id && !item.deletedAt);
  const validIds = new Set(validCandidates.map(item => item.id));
  const allById = new Map(candidates.filter(item => item?.id).map(item => [item.id, item]));
  const orphanApplications = applications.filter(item => item?.id && !item.deletedAt && !validIds.has(item.candidateId));
  const grouped = new Map();
  for (const application of orphanApplications) {
    if (!grouped.has(application.candidateId)) grouped.set(application.candidateId, []);
    grouped.get(application.candidateId).push(application.id);
  }
  const versionIndex = indexKeys(validCandidates, versionKeys);
  const contactIndex = indexKeys(validCandidates, contactKeys);
  const profileIndex = indexKeys(validCandidates, candidate => {
    const key = compositeKey(candidate);
    return key ? [key] : [];
  });
  const mappings = [];
  const unresolved = [];
  for (const [candidateId, applicationIds] of [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const source = allById.get(candidateId);
    if (!source) {
      unresolved.push({ candidateId, applicationIds: applicationIds.slice().sort(), reason: 'SOURCE_CANDIDATE_MISSING' });
      continue;
    }
    const strongKeys = [...versionKeys(source), ...contactKeys(source)];
    const strongIds = matchingIds(versionKeys(source), versionIndex);
    for (const id of matchingIds(contactKeys(source), contactIndex)) strongIds.add(id);
    if (strongIds.size > 1) {
      unresolved.push({ candidateId, applicationIds: applicationIds.slice().sort(), reason: 'MULTIPLE_STRONG_MATCHES' });
      continue;
    }
    let targetId = strongIds.size === 1 ? [...strongIds][0] : '';
    let evidence = targetId ? strongKeys.filter(key => versionIndex.get(key)?.has(targetId) || contactIndex.get(key)?.has(targetId)) : [];
    if (!targetId) {
      const profile = compositeKey(source);
      const profileIds = profile ? matchingIds([profile], profileIndex) : new Set();
      if (profileIds.size === 1) {
        targetId = [...profileIds][0];
        evidence = [profile];
      } else {
        unresolved.push({
          candidateId,
          applicationIds: applicationIds.slice().sort(),
          reason: profileIds.size > 1 ? 'MULTIPLE_PROFILE_MATCHES' : 'NO_DETERMINISTIC_MATCH',
        });
        continue;
      }
    }
    mappings.push({ fromCandidateId: candidateId, toCandidateId: targetId, evidence: evidence.sort(), applicationIds: applicationIds.slice().sort() });
  }
  const orphanApplicationIds = orphanApplications.map(item => item.id).sort();
  const orphanCandidateIds = [...grouped.keys()].sort();
  const signature = { orphanApplicationIds, mappings: mappings.map(item => [item.fromCandidateId, item.toCandidateId, item.applicationIds]) };
  return Object.freeze({
    candidateCount: validCandidates.length,
    applicationCount: applications.filter(item => item?.id && !item.deletedAt).length,
    orphanApplicationIds,
    orphanCandidateIds,
    mappings,
    unresolved,
    fingerprint: fingerprint(signature),
  });
}

function createPatches(applications = [], mappings = []) {
  const targetByOldId = new Map(mappings.map(item => [item.fromCandidateId, item.toCandidateId]));
  return applications.filter(item => targetByOldId.has(item?.candidateId))
    .map(item => ({ ...JSON.parse(JSON.stringify(item)), candidateId: targetByOldId.get(item.candidateId) }));
}

function verifyPreserved(before, after) {
  const withoutCandidateId = value => {
    const copy = JSON.parse(JSON.stringify(value));
    delete copy.candidateId;
    return copy;
  };
  return JSON.stringify(withoutCandidateId(before)) === JSON.stringify(withoutCandidateId(after));
}

return Object.freeze({ audit, createPatches, verifyPreserved });
```

Export the exact contract:

```js
{
  candidateCount,
  applicationCount,
  orphanApplicationIds,
  orphanCandidateIds,
  mappings: [{ fromCandidateId, toCandidateId, evidence, applicationIds }],
  unresolved: [{ candidateId, applicationIds, reason }],
  fingerprint
}
```

Add `createPatches(applications, mappings)` that returns cloned application rows with only `candidateId` changed and `verifyPreserved(before, after)` that ignores `candidateId` but compares every other field.

- [ ] **Step 4: Run the unit tests and verify GREEN**

Run: `node --test src/services/application-candidate-integrity.test.mjs`

Expected: all audit, ambiguity, preservation, and idempotency tests PASS.

- [ ] **Step 5: Commit the pure integrity slice**

```powershell
git add -- src/services/application-candidate-integrity.js src/services/application-candidate-integrity.test.mjs
git commit -m "feat: audit orphan application candidate links"
```

### Task 2: Safe repair action with backup, stale-plan guard, and rollback

**Files:**
- Create: `src/ui/application-candidate-repair-actions.js`
- Create: `src/ui/application-candidate-repair-actions.test.mjs`

- [ ] **Step 1: Write failing action tests**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('../services/application-candidate-integrity.js');
await import('./application-candidate-repair-actions.js');
const Integrity = globalThis.WorkBuddyApplicationCandidateIntegrity;
const createActions = globalThis.WorkBuddyApplicationCandidateRepairActions.createApplicationCandidateRepairActions;

function makeFixture({ ignoreFirstWrite = false } = {}) {
  const candidates = [
    { id: 'old-1', deletedAt: '2026-08-03', phone: '13800000000' },
    { id: 'new-1', phone: '13800000000' },
  ];
  const originalApplications = [{ id: 'app-1', candidateId: 'old-1', stage: 'discovered', pipelineEvents: [{ id: 'event-1' }] }];
  let applications = structuredClone(originalApplications);
  let writeCount = 0;
  const fixture = {
    state: {}, integrity: Integrity, writes: [], originalApplications,
    now: () => '2026-08-04T08:00:00.000Z',
    clone: value => structuredClone(value),
    loadCandidates: async () => structuredClone(candidates),
    loadApplications: async () => structuredClone(applications),
    downloadBackup: async payload => { fixture.backupPayload = payload; },
    async upsertApplications(rows) {
      writeCount += 1;
      fixture.writes.push(...structuredClone(rows));
      fixture.lastWrite = structuredClone(rows);
      if (ignoreFirstWrite && writeCount === 1) return rows.length;
      const byId = new Map(rows.map(row => [row.id, row]));
      applications = applications.map(row => byId.get(row.id) || row);
      return rows.length;
    },
  };
  return fixture;
}

test('apply refuses writes until the audited rows were backed up', async () => {
  const actions = createActions(makeFixture());
  await actions.audit();
  await assert.rejects(() => actions.apply(), /BACKUP_REQUIRED/);
});

test('apply re-audits, writes only planned applications, and verifies zero repaired orphans', async () => {
  const fixture = makeFixture();
  const actions = createActions(fixture);
  await actions.audit();
  await actions.backup();
  const result = await actions.apply();
  assert.equal(result.updated, 1);
  assert.deepEqual(fixture.writes.map(row => row.id), ['app-1']);
  assert.equal(fixture.writes[0].stage, 'discovered');
});

test('verification failure restores the original application rows', async () => {
  const fixture = makeFixture({ ignoreFirstWrite: true });
  const actions = createActions(fixture);
  await actions.audit();
  await actions.backup();
  await assert.rejects(() => actions.apply(), /VERIFY_FAILED/);
  assert.deepEqual(fixture.lastWrite, fixture.originalApplications);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test src/ui/application-candidate-repair-actions.test.mjs`

Expected: FAIL because the action module does not exist.

- [ ] **Step 3: Implement the minimal action module**

```js
function createApplicationCandidateRepairActions(options) {
  const state = options.state;

  function codeError(code) {
    const error = new Error(code);
    error.code = code;
    return error;
  }

  async function auditFresh() {
    const [candidates, applications] = await Promise.all([
      options.loadCandidates(), options.loadApplications(),
    ]);
    return { candidates, applications, report: options.integrity.audit({ candidates, applications }) };
  }

  async function audit() {
    const [candidates, applications] = await Promise.all([
      options.loadCandidates(), options.loadApplications(),
    ]);
    state.report = options.integrity.audit({ candidates, applications });
    state.backupReady = false;
    state.backupRows = { candidates, applications };
    return state.report;
  }

  async function backup() {
    if (!state.report) throw codeError('AUDIT_REQUIRED');
    await options.downloadBackup({
      exportedAt: options.now(),
      report: state.report,
      candidates: state.backupRows.candidates,
      applications: state.backupRows.applications,
    });
    state.backupReady = true;
  }

  async function apply() {
    if (!state.backupReady) throw codeError('BACKUP_REQUIRED');
    const approvedFingerprint = state.report.fingerprint;
    const fresh = await auditFresh();
    if (fresh.report.fingerprint !== approvedFingerprint) throw codeError('STALE_PLAN');
    const patches = options.integrity.createPatches(fresh.applications, fresh.report.mappings);
    if (!patches.length) return { updated: 0, unresolved: fresh.report.unresolved.length };
    const patchIds = new Set(patches.map(item => item.id));
    const originals = fresh.applications.filter(item => patchIds.has(item.id)).map(options.clone);
    if (patches.some(patch => !options.integrity.verifyPreserved(originals.find(item => item.id === patch.id), patch))) {
      throw codeError('UNSAFE_PATCH');
    }
    await options.upsertApplications(patches);
    const verified = await auditFresh();
    if (verified.report.orphanApplicationIds.length !== fresh.report.orphanApplicationIds.length - patches.length) {
      await options.upsertApplications(originals);
      throw codeError('VERIFY_FAILED');
    }
    state.report = verified.report;
    state.backupReady = false;
    return { updated: patches.length, unresolved: verified.report.unresolved.length };
  }

  return Object.freeze({ state, audit, backup, apply });
}
```

- [ ] **Step 4: Run action tests and verify GREEN**

Run: `node --test src/ui/application-candidate-repair-actions.test.mjs`

Expected: all backup, stale-plan, write, verification, and rollback tests PASS.

- [ ] **Step 5: Commit the repair action slice**

```powershell
git add -- src/ui/application-candidate-repair-actions.js src/ui/application-candidate-repair-actions.test.mjs
git commit -m "feat: add guarded orphan application repair"
```

### Task 3: Wire the administrator audit and repair card

**Files:**
- Modify: `index.html:29-35`
- Modify: `index.html:6878-6931`
- Modify: `index.html:10461-10586`
- Modify: `index.html:14500-14612`
- Modify: `index.html:22681-22688`
- Modify: `src/production-build.test.mjs`

- [ ] **Step 1: Add failing production wiring assertions**

```js
test('生产页加载并暴露孤立推进审计与修复动作', () => {
  assert.match(sourceHtml, /application-candidate-integrity\.js/);
  assert.match(sourceHtml, /application-candidate-repair-actions\.js/);
  assert.match(sourceHtml, /auditApplicationCandidateLinks/);
  assert.match(sourceHtml, /backupApplicationCandidateLinks/);
  assert.match(sourceHtml, /applyApplicationCandidateRepair/);
});
```

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test --test-name-pattern="生产页加载并暴露孤立推进审计与修复动作" src/production-build.test.mjs`

Expected: FAIL because the modules and action names are absent from `index.html`.

- [ ] **Step 3: Load the modules and compose existing repositories**

Add cache-versioned script tags after the repository modules. Create reactive state with `running`, `error`, `report`, `backupReady`, and `lastResult`. Inject:

```js
loadCandidates: () => getCandidateRepo().listAllCandidates(),
loadApplications: () => getWorkbenchEntityRepo().listAll('applications'),
upsertApplications: rows => getWorkbenchEntityRepo().upsertMany('applications', rows),
integrity: window.WorkBuddyApplicationCandidateIntegrity,
downloadBackup: payload => downloadJsonFile(`workbuddy-application-repair-${Date.now()}.json`, payload),
now: () => new Date().toISOString(),
clone: value => JSON.parse(JSON.stringify(value)),
```

After a successful apply, replace only the in-memory application rows returned by a fresh repository read, call `saveWorkbenchV2()`, and schedule the existing cloud snapshot push. Do not mutate candidates, companies, positions, or application fields other than `candidateId`.

- [ ] **Step 4: Add the administrator card**

The Phase 3 settings card must show audit counts and three separate buttons:

```html
<button @click="auditApplicationCandidateLinks">检查人才关联</button>
<button :disabled="!applicationCandidateRepair.report" @click="backupApplicationCandidateLinks">下载修复备份</button>
<button :disabled="!applicationCandidateRepair.backupReady || !applicationCandidateRepair.report?.mappings?.length" @click="applyApplicationCandidateRepair">执行唯一匹配修复</button>
```

Display orphan application count, orphan candidate-ID count, automatic mapping count, and unresolved count. Render unresolved IDs and reasons without exposing resume text or contact values.

- [ ] **Step 5: Run targeted and module tests**

Run: `node --test src/services/application-candidate-integrity.test.mjs src/ui/application-candidate-repair-actions.test.mjs src/production-build.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the administrator repair UI**

```powershell
git add -- index.html src/production-build.test.mjs
git commit -m "feat: expose guarded application repair audit"
```

### Task 4: Deploy the repair tool and repair production data

**Files:**
- No source changes unless verification reveals a defect.
- Produce local evidence artifact outside Git: downloaded JSON backup.

- [ ] **Step 1: Run the full pre-deployment verification**

Run: `npm test`

Expected: all tests PASS with zero failures.

Run: `npm run build`

Expected: exit code 0 and `dist/` produced.

- [ ] **Step 2: Push the repair-tool commits and wait for Pages**

Run: `git push origin main`

Verify the GitHub Pages workflow for the pushed SHA completes with conclusion `success`.

- [ ] **Step 3: Run the production audit without writing**

In the authenticated WorkBuddy Settings page, click `检查人才关联`. Record the four authoritative counts from the card. If automatic mapping count is zero, stop without modifying data and report that the surviving data lacks a deterministic identity source.

- [ ] **Step 4: Download and verify the backup**

Click `下载修复备份`. Verify the downloaded JSON contains `exportedAt`, `report`, complete candidate rows, and complete application rows, and that its application count equals the audit count.

- [ ] **Step 5: Apply only the generated unique mappings**

Click `执行唯一匹配修复`. The action re-audits first, refuses a stale plan, batch-upserts only planned application rows, then verifies the expected orphan-count reduction. If verification fails, confirm the automatic rollback completes and stop.

- [ ] **Step 6: Verify business-history preservation**

Compare backup and current rows by application ID. Assert record counts are unchanged and every field except mapped `candidateId` is byte-for-byte equivalent after JSON normalization.

- [ ] **Step 7: Verify the visible production result**

Reload WorkBuddy, open 推进中心, and verify repaired rows show candidate names while unresolved rows remain explicitly reported. Verify company, position, owner, stage, match score, and updated date remain visible.

### Task 5: Add the cross-table prevention gate and correct counting

**Files:**
- Modify: `src/services/repo/workbench-entity-read-path.js`
- Modify: `src/services/repo/workbench-entity-read-path.test.mjs`
- Modify: `src/production-build.test.mjs`
- Modify: `index.html:4238-4239`
- Modify: `index.html:10568-10586`
- Modify: `index.html:14550-14612`

- [ ] **Step 1: Write failing read-path and counting tests**

```js
test('entity parity rejects applications that reference a missing active candidate', () => {
  const report = Path.buildEntityParityReport(
    { companies: [], positions: [], applications: [{ id: 'app-1', candidateId: 'missing' }] },
    { companies: [], positions: [], applications: [{ id: 'app-1', candidateId: 'missing' }] },
    [{ id: 'cand-1' }],
  );
  assert.equal(report.ok, false);
  assert.deepEqual(report.orphanApplicationIds, ['app-1']);
});
```

Add static assertions that active progression counting checks `candidateById.value.has(application.candidateId)` and the UI fallback reads `人才关联失效` rather than `人才已删除`.

- [ ] **Step 2: Run targeted tests and verify RED**

Run: `node --test src/services/repo/workbench-entity-read-path.test.mjs src/production-build.test.mjs`

Expected: the orphan-reference and corrected-label/count tests FAIL.

- [ ] **Step 3: Extend the parity report**

```js
function buildEntityParityReport(localBundle = {}, cloudBundle = {}, candidates = []) {
  const byKind = {};
  KINDS.forEach(kind => { byKind[kind] = parityForKind(localBundle[kind], cloudBundle[kind]); });
  const validCandidateIds = new Set((candidates || []).filter(item => item?.id && !item.deletedAt).map(item => item.id));
  const orphanApplicationIds = (cloudBundle.applications || [])
    .filter(item => item?.id && !item.deletedAt && !validCandidateIds.has(item.candidateId))
    .map(item => item.id).sort();
  return Object.freeze({
    ok: KINDS.every(kind => byKind[kind].ok) && orphanApplicationIds.length === 0,
    byKind,
    orphanApplicationIds,
    localCount: KINDS.reduce((sum, kind) => sum + byKind[kind].localCount, 0),
    cloudCount: KINDS.reduce((sum, kind) => sum + byKind[kind].cloudCount, 0),
  });
}
```

Pass `workbenchV2.candidates` from parity verification and authority-load checks. Refuse an authority replacement when the freshly loaded cloud applications contain orphan candidate references.

- [ ] **Step 4: Correct UI meaning and counting**

Change the fallback label to `人才关联失效`. In `activeApplicationCountByCandidateId` and `candidateSummaryCounts`, count an application only when `candidateById.value.has(application.candidateId)` is true.

- [ ] **Step 5: Run targeted tests and verify GREEN**

Run: `node --test src/services/repo/workbench-entity-read-path.test.mjs src/production-build.test.mjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the prevention slice**

```powershell
git add -- index.html src/services/repo/workbench-entity-read-path.js src/services/repo/workbench-entity-read-path.test.mjs src/production-build.test.mjs
git commit -m "fix: reject orphan application candidate links"
```

### Task 6: Final verification and production rollout

**Files:**
- No new source files.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run modularization and production build checks**

Run: `npm run test:modularization`

Expected: all modularization checks PASS.

Run: `npm run build`

Expected: exit code 0.

- [ ] **Step 3: Review staged scope and preserve user changes**

Run: `git status --short` and `git diff --check`.

Confirm `public/assets/workbuddy.css` and the pre-existing deleted requirements document remain outside repair commits unless the user separately authorizes them.

- [ ] **Step 4: Push and verify GitHub Pages**

Run: `git push origin main` and wait for the exact pushed SHA's Pages workflow to complete successfully.

- [ ] **Step 5: Verify the authenticated production page**

Hard-refresh the existing WorkBuddy tab. Verify:

- No `Headhunter Fatal` console errors.
- 推进中心 no longer reports repaired links as deleted.
- The audit card reports zero automatically repairable orphan applications; any unresolved records are explicit.
- Talent and application counts match the post-repair audit.
- Candidate detail navigation works from a repaired progression row.

- [ ] **Step 6: Record the foreign-key follow-up decision**

If the final orphan count is zero, report that a separate Supabase migration can safely add `applications(candidate_id) REFERENCES candidates(id) ON DELETE RESTRICT`. Do not run that schema mutation as part of this repair without a separate migration review.
