import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-ai-batch-messages.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const messages = context.globalThis.WorkBuddyResumeAiBatchMessages;

test('builds normal and retry completion messages', () => {
  assert.equal(messages.completionMessage({ failed: 0 }), '批量简历处理完成');
  assert.equal(messages.completionMessage({ failed: 2 }), '批量处理完成，失败 2 份');
  assert.equal(messages.completionMessage({ failed: 1 }, true), '失败项重试完成，仍失败 1 份');
  assert.equal(messages.completionMessage({ failed: 0 }, true), '失败项重试完成');
});

test('maps failure state to toast tone', () => {
  assert.equal(messages.completionTone({ failed: 0 }), 'success');
  assert.equal(messages.completionTone({ failed: 1 }), 'error');
});
