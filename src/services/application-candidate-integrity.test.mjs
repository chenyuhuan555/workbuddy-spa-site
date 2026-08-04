import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./application-candidate-integrity.js');

const Integrity = globalThis.WorkBuddyApplicationCandidateIntegrity;

test('识别孤立推进，同时保留正常人才关联', () => {
  const report = Integrity.audit({
    candidates: [{ id: 'active-1', name: '甲' }],
    applications: [
      { id: 'app-ok', candidateId: 'active-1', stage: 'interview' },
      { id: 'app-bad', candidateId: 'old-1', stage: 'discovered' },
    ],
  });

  assert.deepEqual(report.orphanApplicationIds, ['app-bad']);
  assert.deepEqual(report.orphanCandidateIds, ['old-1']);
  assert.equal(report.applicationCount, 2);
});

test('旧人才与唯一有效人才共享强身份时生成确定性映射', () => {
  const report = Integrity.audit({
    candidates: [
      { id: 'old-1', deletedAt: '2026-08-03', resumeVersions: [{ sourceResumeId: 'resume-9', fileHash: 'HASH-9' }] },
      { id: 'new-1', resumeVersions: [{ sourceResumeId: 'resume-9', fileHash: 'hash-9' }] },
    ],
    applications: [{ id: 'app-1', candidateId: 'old-1', stage: 'discovered' }],
  });

  assert.deepEqual(report.mappings, [{
    fromCandidateId: 'old-1',
    toCandidateId: 'new-1',
    evidence: ['fileHash:hash-9', 'sourceResumeId:resume-9'],
    applicationIds: ['app-1'],
  }]);
  assert.deepEqual(report.unresolved, []);
});

test('手机号或邮箱命中多个有效人才时不自动关联', () => {
  const report = Integrity.audit({
    candidates: [
      { id: 'old-1', deletedAt: '2026-08-03', name: '张三', phone: '138 0000 0000' },
      { id: 'new-1', name: '张三', phone: '13800000000' },
      { id: 'new-2', name: '张三', phone: '13800000000' },
    ],
    applications: [{ id: 'app-1', candidateId: 'old-1' }],
  });

  assert.equal(report.mappings.length, 0);
  assert.equal(report.unresolved[0].reason, 'MULTIPLE_STRONG_MATCHES');
});

test('只有姓名相同或旧人才记录不存在时不自动关联', () => {
  const report = Integrity.audit({
    candidates: [{ id: 'new-1', name: '李四' }],
    applications: [
      { id: 'app-name-only', candidateId: 'old-name-only' },
      { id: 'app-missing', candidateId: 'missing-source' },
    ],
  });

  assert.equal(report.mappings.length, 0);
  assert.deepEqual(report.unresolved.map(item => item.reason), [
    'SOURCE_CANDIDATE_MISSING',
    'SOURCE_CANDIDATE_MISSING',
  ]);
});

test('修复补丁只改变 candidateId，并且重复生成保持幂等', () => {
  const original = {
    id: 'app-1',
    candidateId: 'old-1',
    positionId: 'position-1',
    companyId: 'company-1',
    owner: '陈雨欢',
    stage: 'interview',
    pipelineEvents: [{ id: 'event-1', stage: 'interview' }],
    note: '保留业务历史',
  };
  const mappings = [{ fromCandidateId: 'old-1', toCandidateId: 'new-1' }];

  const [patch] = Integrity.createPatches([original], mappings);
  assert.equal(patch.candidateId, 'new-1');
  assert.equal(Integrity.verifyPreserved(original, patch), true);
  assert.deepEqual(Integrity.createPatches([patch], mappings), []);
  assert.equal(original.candidateId, 'old-1');
});
