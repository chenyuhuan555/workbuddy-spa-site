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
  const originalApplications = [{
    id: 'app-1',
    candidateId: 'old-1',
    positionId: 'position-1',
    companyId: 'company-1',
    owner: '陈雨欢',
    stage: 'discovered',
    pipelineEvents: [{ id: 'event-1', stage: 'discovered' }],
    note: '必须保留',
  }];
  let applications = structuredClone(originalApplications);
  let writeCount = 0;
  const fixture = {
    state: {},
    integrity: Integrity,
    writes: [],
    originalApplications,
    now: () => '2026-08-04T08:00:00.000Z',
    clone: value => structuredClone(value),
    loadCandidates: async () => structuredClone(candidates),
    loadApplications: async () => structuredClone(applications),
    downloadBackup: async payload => { fixture.backupPayload = payload; },
    async upsertApplications(rows) {
      writeCount += 1;
      fixture.writes.push(structuredClone(rows));
      fixture.lastWrite = structuredClone(rows);
      if (ignoreFirstWrite && writeCount === 1) return rows.length;
      const byId = new Map(rows.map(row => [row.id, row]));
      applications = applications.map(row => byId.get(row.id) || row);
      return rows.length;
    },
    replaceApplications(rows) { fixture.replacedApplications = structuredClone(rows); },
  };
  fixture.setApplications = rows => { applications = structuredClone(rows); };
  return fixture;
}

test('执行修复前必须完成审计和备份', async () => {
  const actions = createActions(makeFixture());
  await assert.rejects(() => actions.apply(), error => error.code === 'BACKUP_REQUIRED');
  await actions.audit();
  await assert.rejects(() => actions.apply(), error => error.code === 'BACKUP_REQUIRED');
});

test('备份包含完整候选人、推进记录和审计指纹', async () => {
  const fixture = makeFixture();
  const actions = createActions(fixture);
  const report = await actions.audit();
  await actions.backup();

  assert.equal(fixture.backupPayload.report.fingerprint, report.fingerprint);
  assert.equal(fixture.backupPayload.candidates.length, 2);
  assert.deepEqual(fixture.backupPayload.applications, fixture.originalApplications);
  assert.equal(actions.state.backupReady, true);
});

test('写入前重新审计，计划变化时拒绝写入', async () => {
  const fixture = makeFixture();
  const actions = createActions(fixture);
  await actions.audit();
  await actions.backup();
  fixture.setApplications([
    ...fixture.originalApplications,
    { id: 'app-2', candidateId: 'missing-source', stage: 'discovered' },
  ]);

  await assert.rejects(() => actions.apply(), error => error.code === 'STALE_PLAN');
  assert.equal(fixture.writes.length, 0);
});

test('只更新计划内推进并在写后验证关联', async () => {
  const fixture = makeFixture();
  const actions = createActions(fixture);
  await actions.audit();
  await actions.backup();
  const result = await actions.apply();

  assert.equal(result.updated, 1);
  assert.equal(result.unresolved, 0);
  assert.equal(fixture.writes.length, 1);
  assert.equal(fixture.writes[0][0].candidateId, 'new-1');
  assert.equal(fixture.writes[0][0].stage, 'discovered');
  assert.deepEqual(fixture.writes[0][0].pipelineEvents, [{ id: 'event-1', stage: 'discovered' }]);
  assert.equal(actions.state.backupReady, false);
  assert.equal(actions.state.report.orphanApplicationIds.length, 0);
  assert.equal(fixture.replacedApplications[0].candidateId, 'new-1');
});

test('写后验证失败时回滚原推进记录', async () => {
  const fixture = makeFixture({ ignoreFirstWrite: true });
  const actions = createActions(fixture);
  await actions.audit();
  await actions.backup();

  await assert.rejects(() => actions.apply(), error => error.code === 'VERIFY_FAILED');
  assert.equal(fixture.writes.length, 2);
  assert.deepEqual(fixture.lastWrite, fixture.originalApplications);
});
