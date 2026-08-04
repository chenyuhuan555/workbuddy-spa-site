import assert from 'node:assert/strict';
import test from 'node:test';

globalThis.window = globalThis;
await import('./application-visibility.js');

const { filterVisibleApplications } = globalThis.WorkBuddyApplicationVisibility;

function buildBundle(overrides = {}) {
  return {
    candidates: [{ id: 'candidate-1' }],
    companies: [{ id: 'company-1' }],
    positions: [{ id: 'position-1', companyId: 'company-1', status: 'open' }],
    applications: [{
      id: 'application-1',
      candidateId: 'candidate-1',
      companyId: 'company-1',
      positionId: 'position-1',
      stage: 'discovered',
    }],
    ...overrides,
  };
}

test('保留候选人、公司和岗位均有效的推进，包括已结束阶段或非开放岗位', () => {
  const first = buildBundle().applications[0];
  const second = { ...first, id: 'application-2', stage: 'closed' };
  const bundle = buildBundle({
    positions: [{ id: 'position-1', companyId: 'company-1', status: 'paused' }],
    applications: [first, second],
  });

  assert.deepEqual(filterVisibleApplications(bundle), [first, second]);
});

test('隐藏缺失或已删除候选人的推进', () => {
  const missing = buildBundle({ candidates: [] });
  const deleted = buildBundle({ candidates: [{ id: 'candidate-1', deletedAt: '2026-08-04T00:00:00Z' }] });

  assert.deepEqual(filterVisibleApplications(missing), []);
  assert.deepEqual(filterVisibleApplications(deleted), []);
});

test('隐藏缺失或已删除公司的推进', () => {
  const missing = buildBundle({ companies: [] });
  const deleted = buildBundle({ companies: [{ id: 'company-1', deletedAt: '2026-08-04T00:00:00Z' }] });

  assert.deepEqual(filterVisibleApplications(missing), []);
  assert.deepEqual(filterVisibleApplications(deleted), []);
});

test('隐藏缺失或已删除岗位的推进', () => {
  const missing = buildBundle({ positions: [] });
  const deleted = buildBundle({ positions: [{ id: 'position-1', companyId: 'company-1', deletedAt: '2026-08-04T00:00:00Z' }] });

  assert.deepEqual(filterVisibleApplications(missing), []);
  assert.deepEqual(filterVisibleApplications(deleted), []);
});

test('隐藏自身无 ID 或已删除的推进，并保持原数组顺序和内容不变', () => {
  const valid = buildBundle().applications[0];
  const noId = { ...valid, id: '' };
  const deleted = { ...valid, id: 'application-2', deletedAt: '2026-08-04T00:00:00Z' };
  const applications = [deleted, valid, noId];
  const before = structuredClone(applications);

  assert.deepEqual(filterVisibleApplications(buildBundle({ applications })), [valid]);
  assert.deepEqual(applications, before);
});

test('关系无法确认时采用安全默认值，不展示推进', () => {
  assert.deepEqual(filterVisibleApplications(), []);
  assert.deepEqual(filterVisibleApplications({ applications: [{}] }), []);
});
