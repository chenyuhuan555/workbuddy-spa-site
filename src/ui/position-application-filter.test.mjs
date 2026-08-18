import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./position-application-filter.js');
const filter = globalThis.WorkBuddyPositionApplicationFilter;

test('岗位推进筛选按岗位 ID 关联并可排除关闭记录', () => {
  const applications = [{ positionId: 'p1', stage: 'interview' }, { positionId: 'p1', stage: 'closed' }, { positionId: 'p2', stage: 'offer' }];
  assert.equal(filter.getPositionApplications(applications, 'p1').length, 2);
  assert.deepEqual(filter.getActivePositionApplications(applications, 'p1').map(item => item.stage), ['interview']);
});
