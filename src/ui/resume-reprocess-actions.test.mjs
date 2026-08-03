import test from 'node:test';
import assert from 'node:assert/strict';
import { createResumeReprocessActions } from './resume-reprocess-actions.js';

test('reprocesses the selected version from existing text', async () => {
  const calls = [];
  const actions = createResumeReprocessActions({
    selectedCandidate: { value: { id: 'c-1' } },
    activeVersion: { value: { id: 'v-1' } },
    validateRequest: () => ({ ok: true }),
    successMessage: raw => raw ? '原件' : '文本',
    enqueue: async (...args) => calls.push(args),
    showToast: message => calls.push(message),
  });
  await actions.fromText();
  assert.deepEqual(calls, [['c-1', 'v-1', { refreshRawText: false }], '文本']);
});

test('reports validation failure without enqueueing', async () => {
  const messages = [];
  const actions = createResumeReprocessActions({
    selectedCandidate: { value: { id: 'c-1' } }, activeVersion: { value: { id: 'v-1' } },
    validateRequest: () => ({ ok: false, reason: '原始文件不存在' }),
    enqueue: async () => { throw new Error('must not run'); }, showToast: message => messages.push(message),
  });
  await actions.fromOriginal();
  assert.deepEqual(messages, ['原始文件不存在']);
});
