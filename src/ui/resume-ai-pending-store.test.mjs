import test from 'node:test';
import assert from 'node:assert/strict';
import { createResumeAiPendingStore } from './resume-ai-pending-store.js';

test('resume AI pending store normalizes, deduplicates and persists task keys', () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const store = createResumeAiPendingStore({ storage, key: 'workbench_resume_ai_pending_v1' });

  store.write(['cand:ver', 'cand:ver', '', 'bad', 'x'.repeat(201), 'other:version']);
  assert.deepEqual(JSON.parse(values.get('workbench_resume_ai_pending_v1')), ['cand:ver', 'other:version']);
  assert.deepEqual(store.read(), ['cand:ver', 'other:version']);
  assert.equal(store.mark('new-candidate', 'new-version'), 'new-candidate:new-version');
  assert.deepEqual(store.read(), ['cand:ver', 'other:version', 'new-candidate:new-version']);
  store.clear('cand:ver');
  assert.deepEqual(store.read(), ['other:version', 'new-candidate:new-version']);
  store.write([]);
  assert.equal(values.has('workbench_resume_ai_pending_v1'), false);
});

test('resume AI pending store tolerates malformed storage and storage failures', () => {
  const storage = {
    getItem: () => '{invalid',
    setItem: () => { throw new Error('quota'); },
    removeItem: () => { throw new Error('denied'); },
  };
  const store = createResumeAiPendingStore({ storage, key: 'pending' });
  assert.deepEqual(store.read(), []);
  assert.doesNotThrow(() => store.write(['cand:version']));
});
