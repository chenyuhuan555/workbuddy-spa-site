import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./resume-original-metadata.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const buildResumeOriginalMetadata = context.globalThis.WorkBuddyResumeOriginalMetadata.buildResumeOriginalMetadata;

test('builds replacement metadata and resets sync state', () => {
  assert.deepEqual({ ...buildResumeOriginalMetadata({ fileId: 'f1', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 12, fileHash: 'h1' }) }, {
    fileId: 'f1', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 12, fileHash: 'h1', cloudFilePath: '', originalFileStatus: 'local-only', originalFileError: '', originalFileSyncedAt: ''
  });
});

test('uses safe defaults for missing metadata', () => {
  const value = buildResumeOriginalMetadata();
  assert.equal(value.fileId, '');
  assert.equal(value.fileSize, 0);
  assert.equal(value.originalFileStatus, 'local-only');
});
