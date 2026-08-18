import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-original-guards.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const guards = context.globalThis.WorkBuddyResumeOriginalGuards;

test('detects usable original file references', () => {
  assert.equal(guards.hasResumeOriginalReference({ fileId: 'f1', originalFileStatus: 'local-only' }), true);
  assert.equal(guards.hasResumeOriginalReference({ fileId: 'f1', originalFileStatus: 'missing' }), false);
  assert.equal(guards.hasResumeOriginalReference(null), false);
});

test('marks a version as missing without throwing on empty input', () => {
  const version = {};
  assert.equal(guards.markOriginalMissing(version), true);
  assert.equal(version.originalFileError, guards.MISSING_ORIGINAL_ERROR);
  assert.equal(guards.markOriginalMissing(null), false);
});
