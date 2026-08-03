import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./candidate-direction-normalizer.js');
const { normalize } = globalThis.WorkBuddyCandidateDirectionNormalizer;

test('候选人方向清洗去重、去空并限制最多三项', () => {
  assert.deepEqual(normalize([' AI ', '', 'AI', '芯片', '供应链', '物流', '更多']), ['AI', '芯片', '供应链']);
});
