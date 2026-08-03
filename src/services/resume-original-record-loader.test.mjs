import test from 'node:test';
import assert from 'node:assert/strict';
import { createResumeOriginalRecordLoader } from './resume-original-record-loader.js';

test('resume original record loader creates a stable file id and persists it once', async () => {
  const version = { id: 'version-1', fileId: '' };
  let persisted = 0;
  const loader = createResumeOriginalRecordLoader({
    loadOriginal: async (current, deps) => { assert.equal(current.fileId, 'fid_version-1'); assert.equal(typeof deps.getLocal, 'function'); return { blob: 'blob' }; },
    getLocal: () => null, download: () => null, saveLocal: () => null, loadLegacy: () => null,
    persist: async () => { persisted++; },
  });
  assert.deepEqual(await loader(version), { blob: 'blob' });
  assert.equal(version.fileId, 'fid_version-1');
  assert.equal(persisted, 1);
});

test('resume original record loader rolls back generated id on failure and rejects missing version', async () => {
  const version = { id: 'version-2', fileId: '' };
  const loader = createResumeOriginalRecordLoader({ loadOriginal: async () => { throw new Error('failed'); } });
  await assert.rejects(loader(version), /failed/);
  assert.equal(version.fileId, '');
  await assert.rejects(loader(null), error => error.code === 'ORIGINAL_NOT_FOUND');
});
