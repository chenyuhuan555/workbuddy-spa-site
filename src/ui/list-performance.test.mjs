import test from 'node:test';
import assert from 'node:assert/strict';

await import('./list-performance.js');

const { paginate, indexById, groupBy } = globalThis.WorkBuddyListPerformance;

test('paginate 将页码收敛并返回可展示区间', () => {
  const items = Array.from({ length: 51 }, (_, index) => ({ id: `c${index + 1}` }));

  assert.deepEqual(paginate(items, 2, 50), {
    items: [items[50]],
    page: 2,
    pageSize: 50,
    total: 51,
    totalPages: 2,
    start: 51,
    end: 51,
  });
  assert.equal(paginate(items, 99, 50).page, 2);
  assert.equal(paginate([], 9, 50).page, 1);
});

test('paginate 在 0、1、50 条边界保持稳定', () => {
  assert.deepEqual(paginate([], 1, 50), {
    items: [],
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
    start: 0,
    end: 0,
  });
  assert.equal(paginate([{ id: 'one' }], -5, 50).start, 1);
  assert.equal(paginate(Array.from({ length: 50 }), 2, 50).page, 1);
});

test('indexById 忽略空 ID，重复 ID 使用最后一条记录', () => {
  const rows = [{ id: 'a', value: 1 }, { id: '', value: 2 }, null, { id: 'a', value: 3 }];
  const index = indexById(rows);

  assert.equal(index.size, 1);
  assert.equal(index.get('a').value, 3);
});

test('groupBy 按有效键分组并跳过空键', () => {
  const rows = [{ id: 'a', ownerId: 'u1' }, { id: 'b', ownerId: 'u1' }, { id: 'c', ownerId: '' }];
  const groups = groupBy(rows, row => row.ownerId);

  assert.deepEqual(groups.get('u1'), rows.slice(0, 2));
  assert.deepEqual(groups.get('missing') || [], []);
  assert.equal(groups.has(''), false);
});
