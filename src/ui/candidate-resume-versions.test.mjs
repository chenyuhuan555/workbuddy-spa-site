import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./candidate-resume-versions.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const getCandidateResumeVersions = context.globalThis.WorkBuddyCandidateResumeVersions.getCandidateResumeVersions;

test('returns active stored versions first', () => {
  const versions = getCandidateResumeVersions({ resumeVersions: [{ id: 'v1' }, { id: 'v2', deletedAt: 'x' }] });
  assert.equal(versions.length, 1);
  assert.equal(versions[0].id, 'v1');
});

test('builds a compatibility version from electronic text when needed', () => {
  const versions = getCandidateResumeVersions({ id: 'c1', name: '张三', updatedAt: '2026-08-03', electronicResumeText: '  电子简历正文  ' });
  assert.equal(versions[0].id, 'c1_electronic_resume');
  assert.equal(versions[0].rawText, '电子简历正文');
});

test('returns empty for missing candidate or text', () => {
  assert.deepEqual(Array.from(getCandidateResumeVersions(null)), []);
  assert.deepEqual(Array.from(getCandidateResumeVersions({ id: 'c1' })), []);
});
