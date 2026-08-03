import test from 'node:test';
import assert from 'node:assert/strict';
import { createTalentIntakeActions } from './talent-intake-actions.js';

test('adds files and immediately pumps the batch queue', () => {
  const calls = [];
  const actions = createTalentIntakeActions({
    batchUpload: { open: false, running: false }, candidateUpload: { form: {}, error: '', open: false, step: 'form' },
    directForm: {}, directEntryOpen: { value: false }, directExtracting: { value: false }, directError: { value: '' },
    batchAddFiles: files => calls.push(['add', files.length]), batchPump: () => calls.push(['pump']),
  });
  actions.addFiles(['a', 'b']);
  assert.deepEqual(calls, [['add', 2], ['pump']]);
});

test('saves direct intake through the existing candidate write path', async () => {
  const candidateUpload = { form: {}, error: '', open: false, step: 'done' };
  let saved = 0;
  const actions = createTalentIntakeActions({
    batchUpload: { batchTaskId: '' }, candidateUpload, directForm: { name: '候选人' },
    directEntryOpen: { value: false }, directExtracting: { value: false }, directError: { value: '' },
    resetCandidateUploadForm: () => {}, resetDirectForm: () => {}, saveCandidateOnly: async () => { saved += 1; },
  });
  await actions.saveDirectEntry();
  assert.equal(candidateUpload.form.name, '候选人');
  assert.equal(saved, 1);
});
