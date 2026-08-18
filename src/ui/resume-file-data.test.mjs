import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./resume-file-data.js');
const fileData = globalThis.WorkBuddyResumeFileData;

test('Data URL 可还原为带 MIME 的 Blob', async () => {
  const blob = fileData.resumeDataUrlToBlob('data:text/plain;base64,SGk=', 'application/octet-stream');
  assert.equal(blob.type, 'text/plain');
  assert.equal(await blob.text(), 'Hi');
});

test('非法 Data URL 安全返回空值', () => {
  assert.equal(fileData.resumeDataUrlToBlob('not-a-data-url'), null);
});
