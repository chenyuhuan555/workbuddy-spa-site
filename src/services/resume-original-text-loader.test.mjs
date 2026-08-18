import test from 'node:test';
import assert from 'node:assert/strict';
import { createResumeOriginalTextLoader } from './resume-original-text-loader.js';

test('resume original text loader prefers cached text and cloud text before parsing original file', async () => {
  const calls = [];
  const loader = createResumeOriginalTextLoader({
    ensureTexts: async version => { calls.push(`ensure:${version.id}`); version.rawText = 'cloud text'; },
    loadOriginal: async () => { calls.push('original'); return { blob: 'blob', fileType: 'application/pdf' }; },
    blobToDataUrl: async () => 'data:pdf',
    extractText: async input => { calls.push(`extract:${input.type}`); return 'parsed text'; },
  });
  assert.equal(await loader({ id: 'cached', rawText: 'cached text' }), 'cached text');
  assert.equal(await loader({ id: 'cloud', rawText: '' }), 'cloud text');
  assert.equal(await loader({ id: 'refresh', rawText: 'old' }, null, { refresh: true }), 'parsed text');
  assert.deepEqual(calls, ['ensure:cloud', 'original', 'extract:application/pdf']);
});

test('resume original text loader returns trimmed parsed text and uses version fallback type', async () => {
  const loader = createResumeOriginalTextLoader({
    ensureTexts: async () => {},
    loadOriginal: async () => ({ blob: {}, fileType: '' }),
    blobToDataUrl: async () => 'data',
    extractText: async input => { assert.equal(input.name, '简历.pdf'); assert.equal(input.type, 'application/pdf'); return '  text  '; },
  });
  assert.equal(await loader({ id: 'v1', fileName: '简历.pdf', fileType: 'application/pdf' }, null, { refresh: true }), 'text');
});
