import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkbenchSearchActions } from './workbench-search-actions.js';

test('workbench search actions aggregate companies, positions, candidates and filtered results', () => {
  const state = {
    companies: [{ id: 'co1', name: '贝壳找房', industry: '房地产', city: '北京', owner: '顾问' }],
    positions: [{ id: 'pos1', companyId: 'co1', title: 'Java 工程师', detail: '后端开发', city: '北京', salary: '' }],
    candidates: [{ id: 'cand1', name: '张三', currentCompany: '贝壳找房', currentTitle: '工程师', profileText: 'Java' }],
  };
  const actions = createWorkbenchSearchActions({ state, searchResults: [{ type: 'resume', title: '简历结果' }] });
  const results = actions.buildGlobalSearchResults('贝壳');
  assert.deepEqual(results.map(item => item.type), ['resume', 'company', 'position-v2', 'candidate']);
  const emptyActions = createWorkbenchSearchActions({ state, searchResults: [] });
  assert.equal(emptyActions.buildGlobalSearchResults('不存在').length, 0);
});

test('workbench search actions apply and reset global search through injected callbacks', async () => {
  const calls = [];
  const query = { value: '贝壳' };
  const actions = createWorkbenchSearchActions({
    state: { companies: [], positions: [], candidates: [] }, searchResults: [], query,
    applyFilters: () => calls.push('apply'), resetFilters: () => calls.push('reset'),
  });
  await actions.runGlobalSearch({ nextTick: fn => fn(), showToast: message => calls.push(message) });
  actions.resetGlobalSearch();
  assert.deepEqual(calls, ['apply', '搜索完成，共 0 条结果', 'reset']);
  assert.equal(query.value, '');
});
