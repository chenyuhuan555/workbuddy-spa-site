import test from 'node:test';
import assert from 'node:assert/strict';
import { createCandidateProfileActions } from './candidate-profile-actions.js';

test('saves candidate core data and resets the editor', async () => {
  const calls = [];
  const editState = { saving: false, error: '', draft: { name: '张三' }, skillInput: '', directionInput: '' };
  const actions = createCandidateProfileActions({
    selectedCandidate: { value: { id: 'c-1' } }, editState, bundle: {}, canWrite: true,
    editor: { save: async args => calls.push(args) }, updateTalent: () => {}, persist: async () => true,
    reset: () => calls.push('reset'), schedulePush: () => calls.push('push'), showToast: message => calls.push(message),
  });
  await actions.saveCore();
  assert.equal(calls.length, 4);
  assert.equal(calls[0].candidateId, 'c-1');
  assert.deepEqual(calls.slice(1), ['reset', 'push', '核心信息已保存']);
});
