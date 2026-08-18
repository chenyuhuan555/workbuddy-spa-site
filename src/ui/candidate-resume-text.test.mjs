import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./candidate-resume-text.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const getCandidateResumeText = context.globalThis.WorkBuddyCandidateResumeText.getCandidateResumeText;

test('prefers sufficiently long electronic resume text', () => {
  assert.equal(getCandidateResumeText({ electronicResumeText: '电子简历'.repeat(20), resumeVersions: [{ rawText: '原始文本'.repeat(20) }] }), '电子简历'.repeat(20));
});

test('falls back to the first sufficiently long raw version', () => {
  assert.equal(getCandidateResumeText({ electronicResumeText: 'short', resumeVersions: [{ rawText: 'too short' }, { rawText: '原始文本'.repeat(20) }] }), '原始文本'.repeat(20));
});

test('handles missing candidate data safely', () => {
  assert.equal(getCandidateResumeText(null), '');
  assert.equal(getCandidateResumeText({ resumeVersions: 'invalid' }), '');
});
