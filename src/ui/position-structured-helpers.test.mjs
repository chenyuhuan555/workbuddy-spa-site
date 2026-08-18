import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./position-structured-helpers.js');
const helpers = globalThis.WorkBuddyPositionStructuredHelpers;

test('岗位结构化字段完整度和摘要保持稳定', () => {
  const pos = { location: '北京', salary: '30k', mustHave: '1、Java\n2、Spring' };
  assert.equal(helpers.getPositionCompleteness(pos).score, 60);
  assert.deepEqual(helpers.mustHaveItems(pos), ['Java', 'Spring']);
  assert.match(helpers.structuredPositionSummary(pos), /地点：北京/);
});
