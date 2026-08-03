import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./workbench-collection-count.js');
const { countByCompany } = globalThis.WorkBuddyCollectionCount;

test('工作台集合按公司和条件统计', () => {
  assert.equal(countByCompany('co1', [
    { companyId: 'co1', status: 'open' },
    { companyId: 'co1', status: 'closed' },
    { companyId: 'co2', status: 'open' },
  ], item => item.status === 'open'), 1);
});
