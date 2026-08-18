import test from 'node:test';
import assert from 'node:assert/strict';
import { createTalentCloudSearchActions } from './talent-cloud-search-actions.js';

test('loads a trimmed query with stable pagination and result count', async () => {
  const state = { query: '  Java  ', requestId: 0, page: 1, pageSize: 2, items: [], total: 0, hasMore: false, running: false, error: '', fallback: false };
  const actions = createTalentCloudSearchActions({
    state,
    isReady: () => true,
    search: async args => { assert.deepEqual(args, { query: 'Java', limit: 2, offset: 2 }); return { rows: [{ id: 'r-3' }], total: 3 }; },
    errorMessage: error => error.code || error.message,
  });
  await actions.loadPage(2);
  assert.equal(state.page, 2);
  assert.deepEqual(state.items, [{ id: 'r-3' }]);
  assert.equal(state.total, 3);
  assert.equal(state.hasMore, false);
});

test('surfaces auth failure instead of silently returning empty results', async () => {
  const state = { query: 'x', requestId: 0, page: 1, pageSize: 20, items: [], total: 0, hasMore: false, running: false, error: '', fallback: false };
  const actions = createTalentCloudSearchActions({ state, isReady: () => false, search: async () => ({ rows: [] }), errorMessage: error => error.code });
  await actions.run();
  assert.equal(state.error, 'AUTH_REQUIRED');
  assert.equal(state.fallback, true);
  assert.equal(state.running, false);
});
