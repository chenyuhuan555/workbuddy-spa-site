import test from 'node:test';
import assert from 'node:assert/strict';
import { createCandidateResumeActions } from './candidate-resume-actions.js';

test('starts editing the selected version using only formatted text', () => {
  const edit = { active: false, saving: false };
  const version = { id: 'v-1', formattedText: '电子简历', formatStatus: 'done' };
  const actions = createCandidateResumeActions({ view: { mode: 'original', blobUrl: '', imageSrc: '', error: '' }, edit, selectedCandidate: { value: { id: 'c-1' } }, activeVersion: { value: version }, resetEdit: () => {}, editor: { createDraft: v => ({ value: v.formattedText }) } });
  actions.startEdit();
  assert.equal(edit.active, true);
  assert.equal(edit.versionId, 'v-1');
  assert.deepEqual(edit.draft, { value: '电子简历' });
});

test('saves only the selected resume version and reports success', async () => {
  const edit = { active: true, saving: false, candidateId: 'c-1', versionId: 'v-1', draft: {} };
  let payload;
  const messages = [];
  const actions = createCandidateResumeActions({ view: { mode: 'text', blobUrl: '', imageSrc: '', error: '' }, edit, selectedCandidate: { value: { id: 'c-1' } }, activeVersion: { value: { id: 'v-1' } }, resetEdit: () => {}, editor: { save: async args => { payload = args; } }, schedulePush: () => messages.push('push'), showToast: message => messages.push(message) });
  await actions.saveEdit();
  assert.equal(payload.candidateId, 'c-1');
  assert.equal(payload.versionId, 'v-1');
  assert.deepEqual(messages, ['push', '电子简历已保存']);
});
