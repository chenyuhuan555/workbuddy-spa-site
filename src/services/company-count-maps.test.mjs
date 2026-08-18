import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./company-count-maps.js');
const { buildCompanyCountMaps } = globalThis.WorkBuddyCompanyCountMaps;

test('公司关联统计一次遍历生成三类数量 Map', () => {
  const maps = buildCompanyCountMaps({
    positions: [{ companyId: 'co1', status: 'open' }, { companyId: 'co1', status: 'closed' }],
    applications: [{ companyId: 'co1', stage: 'interview' }, { companyId: 'co1', stage: 'closed' }],
  }, { closedStage: 'closed', interviewStages: ['interview'] });
  assert.equal(maps.openPositions.get('co1'), 1);
  assert.equal(maps.activeApplications.get('co1'), 1);
  assert.equal(maps.interviews.get('co1'), 1);
});
