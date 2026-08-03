import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./candidate-directions.js');
const { collectDirections } = globalThis.WorkBuddyCandidateDirections;

test('候选人方向集合去重并忽略空值', () => {
  assert.deepEqual(collectDirections([
    { directions: ['AI', '芯片'] },
    { directions: ['AI', '', null] },
    { directions: [] },
  ]), ['AI', '芯片']);
});
