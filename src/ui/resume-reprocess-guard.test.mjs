import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-reprocess-guard.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const guard = context.globalThis.WorkBuddyResumeReprocessGuard;

test('requires a version and enough existing raw text unless refreshing original', () => {
  assert.equal(guard.validateResumeReprocessRequest(null, false).ok, false);
  assert.equal(guard.validateResumeReprocessRequest({ rawText: 'short' }, false).ok, false);
  assert.equal(guard.validateResumeReprocessRequest({ rawText: 'short' }, true).ok, true);
  assert.equal(guard.validateResumeReprocessRequest({ rawText: 'x'.repeat(40) }, false).ok, true);
});

test('builds the correct success message', () => {
  assert.equal(guard.reprocessSuccessMessage(true), '已从原始文件重新提取并处理');
  assert.equal(guard.reprocessSuccessMessage(false), '已使用现有文本重新处理');
});
