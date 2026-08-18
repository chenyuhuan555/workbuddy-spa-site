import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./workbench-entity-read-path.js');
const Path = globalThis.WorkBuddyWorkbenchEntityReadPath;

test('实体指纹忽略服务端时间但识别业务字段', () => {
  const a = { id: 'co_1', name: '甲', updatedAt: '2026-01-01' };
  const b = { id: 'co_1', name: '甲', updatedAt: '2026-01-02' };
  const c = { id: 'co_1', name: '乙', updatedAt: '2026-01-02' };
  assert.equal(Path.fingerprintEntity(a), Path.fingerprintEntity(b));
  assert.notEqual(Path.fingerprintEntity(a), Path.fingerprintEntity(c));
});

test('buildEntityParityReport 分别报告缺行、字段差异和云端墓碑', () => {
  const report = Path.buildEntityParityReport({
    companies: [{ id: 'co_1', name: '甲' }, { id: 'co_2', name: '乙' }, { id: 'co_4', name: '已删' }],
    positions: [{ id: 'pos_1', title: '工程师' }],
    applications: [],
  }, {
    companies: [
      { id: 'co_1', name: '甲' },
      { id: 'co_2', name: '旧乙' },
      { id: 'co_3', name: '丙' },
      { id: 'co_4', name: '已删', deletedAt: '2026-01-01' },
    ],
    positions: [],
    applications: [],
  });
  assert.equal(report.ok, false);
  assert.deepEqual(report.byKind.companies.missingInCloud, []);
  assert.deepEqual(report.byKind.companies.missingInLocal, ['co_3']);
  assert.deepEqual(report.byKind.companies.mismatched, ['co_2']);
  assert.deepEqual(report.byKind.companies.tombstonedLocal, ['co_4']);
  assert.equal(report.byKind.positions.missingInCloud[0], 'pos_1');
});

test('只有回填完成且三类实体均严格一致时才允许启用读取', () => {
  const report = Path.buildEntityParityReport({ companies: [{ id: 'co_1' }], positions: [], applications: [] }, { companies: [{ id: 'co_1' }], positions: [], applications: [] });
  assert.equal(Path.canEnableReadPath({ backfilledAt: '2026-01-01', parityVerifiedAt: '2026-01-02' }, report), true);
  assert.equal(Path.canEnableReadPath({}, report), false);
  assert.equal(Path.canEnableReadPath({ backfilledAt: '2026-01-01' }, { ...report, ok: false }), false);
});

test('entity parity rejects applications that reference a missing active candidate', () => {
  const report = Path.buildEntityParityReport(
    { companies: [], positions: [], applications: [{ id: 'app-1', candidateId: 'missing' }] },
    { companies: [], positions: [], applications: [{ id: 'app-1', candidateId: 'missing' }] },
    [{ id: 'cand-1' }],
  );
  assert.equal(report.ok, false);
  assert.deepEqual(report.orphanApplicationIds, ['app-1']);
});

test('权威读取只采用云端活跃实体，并保留本地实体作为失败回退输入', () => {
  const bundle = Path.buildAuthoritativeEntityBundle(
    { companies: [{ id: 'co_old', name: '旧' }], positions: [], applications: [] },
    { companies: [{ id: 'co_1', name: '新' }, { id: 'co_deleted', deletedAt: '2026-01-01' }], positions: [], applications: [] },
  );
  assert.deepEqual(bundle.companies.map(item => item.id), ['co_1']);
  assert.equal(bundle.positions.length, 0);
  assert.equal(bundle.applications.length, 0);
});
