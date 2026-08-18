import test from 'node:test';
import assert from 'node:assert/strict';
import { createCandidateOriginalFileActions } from './candidate-original-file-actions.js';

test('retries original file sync for the selected candidate version', async () => {
  const calls = [];
  const actions = createCandidateOriginalFileActions({ selectedCandidate: { value: { id: 'c-1' } }, activeVersion: { value: { id: 'v-1' } }, loadRecord: async () => calls.push('load'), enqueueSync: async (...args) => calls.push(args), showToast: message => calls.push(message) });
  await actions.retrySync();
  assert.deepEqual(calls, ['load', ['c-1', 'v-1'], '原始文件已同步，可在其他设备查看']);
});
