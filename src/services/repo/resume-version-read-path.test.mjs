import test from 'node:test';
import assert from 'node:assert/strict';
await import('./resume-version-read-path.js');
const { canEnableReadPath, buildAuthoritativeVersions } = globalThis.WorkBuddyResumeVersionReadPath;

test('版本读路径允许字段差异，但拒绝缺失或多出版本', () => {
  assert.equal(canEnableReadPath({ backfilledAt: 'now' }, { checked: true, missingInCloud: [], missingInLocal: [], mismatched: ['v1'] }), true);
  assert.equal(canEnableReadPath({ backfilledAt: 'now' }, { checked: true, missingInCloud: ['v1'], missingInLocal: [], mismatched: [] }), false);
  assert.equal(canEnableReadPath({}, { checked: true, missingInCloud: [], missingInLocal: [] }), false);
});

test('权威版本读取采用云端版本并保留本地大文本', () => {
  const grouped = buildAuthoritativeVersions([{ resumeVersions: [{ id: 'v1', formattedText: '# 本地排版', fileName: 'old.pdf' }] }], [{ id: 'v1', candidateId: 'c1', formattedText: null, fileName: 'new.pdf' }, { id: 'v2', candidateId: 'c1', fileName: 'second.pdf' }]);
  assert.deepEqual(grouped.get('c1'), [{ id: 'v1', candidateId: 'c1', formattedText: '# 本地排版', fileName: 'new.pdf' }, { id: 'v2', candidateId: 'c1', fileName: 'second.pdf' }]);
});
