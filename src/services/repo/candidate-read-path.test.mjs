import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./candidate-read-path.js');
const ReadPath = globalThis.WorkBuddyCandidateReadPath;

test('fingerprintCandidate 忽略本地大文本和对象键顺序，但识别业务字段变化', () => {
  const first = {
    id: 'c1',
    name: '张三',
    tags: ['A'],
    profileProcessStatus: 'done',
    electronicResumeText: '本机旧文本',
    updatedAt: '2026-01-01T00:00:00Z',
    resumeVersions: [{ id: 'rv1', fileName: 'a.pdf', rawText: '原文一', meta: { b: 2, a: 1 } }],
  };
  const same = {
    profileProcessStatus: 'done',
    tags: ['A'],
    name: '张三',
    id: 'c1',
    updatedAt: '2026-08-01T00:00:00Z',
    electronicResumeText: '另一份本机文本',
    resumeVersions: [{ meta: { a: 1, b: 2 }, rawText: '原文二', fileName: 'a.pdf', id: 'rv1' }],
  };
  const changed = { ...same, name: '李四' };

  assert.equal(ReadPath.fingerprintCandidate(first), ReadPath.fingerprintCandidate(same));
  assert.notEqual(ReadPath.fingerprintCandidate(first), ReadPath.fingerprintCandidate(changed));
});

test('buildParityReport 严格报告缺行、字段漂移和云端墓碑', () => {
  const local = [
    { id: 'same', name: '相同', resumeVersions: [] },
    { id: 'changed', name: '本地名', resumeVersions: [] },
    { id: 'local-only', name: '仅本地', resumeVersions: [] },
    { id: 'deleted', name: '待删除', resumeVersions: [] },
  ];
  const cloud = [
    { id: 'same', name: '相同', resumeVersions: [] },
    { id: 'changed', name: '云端名', resumeVersions: [] },
    { id: 'cloud-only', name: '仅云端', resumeVersions: [] },
    { id: 'deleted', name: '待删除', deletedAt: '2026-08-01T00:00:00Z', resumeVersions: [] },
  ];

  const report = ReadPath.buildParityReport(local, cloud);
  assert.equal(report.ok, false);
  assert.deepEqual(report.missingInCloud, ['local-only']);
  assert.deepEqual(report.missingInLocal, ['cloud-only']);
  assert.deepEqual(report.mismatched, ['changed']);
  assert.deepEqual(report.tombstonedLocal, ['deleted']);
  assert.equal(report.localCount, 4);
  assert.equal(report.cloudCount, 3);
});

test('canEnableReadPath 同时要求已回填且严格一致性通过', () => {
  const okReport = ReadPath.buildParityReport(
    [{ id: 'c1', name: 'A', resumeVersions: [] }],
    [{ id: 'c1', name: 'A', resumeVersions: [] }],
  );
  assert.equal(okReport.ok, true);
  assert.equal(ReadPath.canEnableReadPath({}, okReport), false);
  assert.equal(ReadPath.canEnableReadPath({ backfilledAt: '2026-08-01T00:00:00Z' }, okReport), true);
  assert.equal(ReadPath.canEnableReadPath({ backfilledAt: '2026-08-01T00:00:00Z' }, { ...okReport, ok: false }), false);
});

test('buildAuthoritativeCandidates 以云端集合为准并仅保留本机简历大字段', () => {
  const local = [
    {
      id: 'c1', name: '本地旧名', electronicResumeText: '候选人本机文本', localOnlyBusinessField: '不应覆盖云端',
      resumeVersions: [
        { id: 'rv1', fileName: 'old.pdf', rawText: '原始文本', formattedText: '排版文本', fileData: 'base64' },
        { id: 'local-version', fileName: 'local.pdf', rawText: '本机独有版本' },
      ],
    },
    { id: 'local-only', name: '仅本地', resumeVersions: [] },
    { id: 'deleted', name: '本地待删', resumeVersions: [] },
  ];
  const cloud = [
    {
      id: 'c1', name: '云端新名', cloudBusinessField: '保留',
      resumeVersions: [{ id: 'rv1', fileName: 'new.pdf', originalFileStatus: 'synced' }],
    },
    { id: 'cloud-only', name: '仅云端', resumeVersions: [] },
    { id: 'deleted', name: '已删除', deletedAt: '2026-08-01T00:00:00Z', resumeVersions: [] },
  ];

  const result = ReadPath.buildAuthoritativeCandidates(local, cloud);
  assert.deepEqual(result.map(candidate => candidate.id), ['c1', 'cloud-only']);
  const merged = result[0];
  assert.equal(merged.name, '云端新名');
  assert.equal(merged.cloudBusinessField, '保留');
  assert.equal(merged.localOnlyBusinessField, undefined);
  assert.equal(merged.electronicResumeText, '候选人本机文本');
  assert.equal(merged.resumeVersions.length, 1);
  assert.equal(merged.resumeVersions[0].fileName, 'new.pdf');
  assert.equal(merged.resumeVersions[0].originalFileStatus, 'synced');
  assert.equal(merged.resumeVersions[0].rawText, '原始文本');
  assert.equal(merged.resumeVersions[0].formattedText, '排版文本');
  assert.equal(merged.resumeVersions[0].fileData, 'base64');
});
