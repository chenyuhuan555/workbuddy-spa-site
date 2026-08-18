import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./company-list-filter.js');
const { filterCompanies } = globalThis.WorkBuddyCompanyListFilter;

test('公司列表按筛选条件过滤并按最近更新时间降序', () => {
  const result = filterCompanies([
    { id: 'old', name: '贝壳', status: 'active', owner: '张三', updatedAt: '2026-08-01' },
    { id: 'new', name: '贝壳科技', status: 'active', owner: '张三', updatedAt: '2026-08-03' },
  ], { query: '贝壳', status: 'active', owner: '张三' });
  assert.deepEqual(result.map(item => item.id), ['new', 'old']);
});

test('公司多人负责人按任一姓名筛选命中', () => {
  const result = filterCompanies([{ id: 'co1', name: '贝壳', owner: '陈雨欢、史磊', updatedAt: '2026-08-05' }], { owner: '史磊' });
  assert.deepEqual(result.map(item => item.id), ['co1']);
});
