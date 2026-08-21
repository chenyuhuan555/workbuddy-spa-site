import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./company-list-filter.js');
const { filterCompanies } = globalThis.WorkBuddyCompanyListFilter;
const INDEX_HTML = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

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

test('公司列表整行打开 Company Drawer，Drawer 覆盖公司业务摘要', () => {
  assert.match(INDEX_HTML, /@click="openCompanyDrawer\(company\.id\)"/);
  assert.match(INDEX_HTML, /class="wb-company-drawer" aria-label="公司详情" role="dialog" aria-modal="true"/);
  for (const section of ['公司概览', '在招岗位', '推进中的候选人', '面试进度', '当前 Todo', '最近跟进']) {
    assert.match(INDEX_HTML, new RegExp(section));
  }
  assert.match(INDEX_HTML, /@click="closeCompanyDrawer"/);
});
