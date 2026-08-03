import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./workbench-owners.js');
const { collectOwners } = globalThis.WorkBuddyWorkbenchOwners;

test('工作台负责人集合去重并忽略空值', () => {
  assert.deepEqual(collectOwners({
    companies: [{ owner: '张三' }, { owner: '' }],
    positions: [{ owner: '李四' }, { owner: '张三' }],
    candidates: [{ owner: null }],
  }), ['张三', '李四']);
});
