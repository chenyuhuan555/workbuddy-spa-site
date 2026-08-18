import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-name-normalizer.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const normalizeResumeName = context.globalThis.WorkBuddyResumeNameNormalizer.normalizeResumeName;

test('normalizes resume names for matching', () => {
  assert.equal(normalizeResumeName('  Candidate Resume.PDF '), 'candidateresume.pdf');
  assert.equal(normalizeResumeName(null), '');
});
