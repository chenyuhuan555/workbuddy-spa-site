import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./resume-search-repo.js');
const { createResumeSearchRepo } = globalThis.WorkBuddyResumeSearchRepo;

function mockSupabase(result = { data: [], error: null }) {
  const calls = [];
  return { calls, rpc(name, args) { calls.push({ name, args }); return Promise.resolve(result); } };
}

test('简历搜索 Repository 校验分页并调用 search_resumes RPC', async () => {
  const supabase = mockSupabase({ data: [{ candidate_id: 'c1', score: 0.8, total_count: 121 }], error: null });
  const repo = createResumeSearchRepo({ supabase, getProfile: () => ({ status: 'active' }) });
  const result = await repo.search({ query: 'Java', limit: 80, offset: 20 });
  assert.equal(result.rows[0].candidate_id, 'c1');
  assert.equal(result.total, 121);
  assert.deepEqual(supabase.calls[0], { name: 'search_resumes', args: { search_query: 'Java', result_limit: 80, result_offset: 20 } });
});

test('旧版搜索 RPC 未返回总数时回退到本页数量', async () => {
  const repo = createResumeSearchRepo({ supabase: mockSupabase({ data: [{ candidate_id: 'c1' }], error: null }), getProfile: () => ({ status: 'active' }) });
  const result = await repo.search({ query: 'Java', limit: 50, offset: 50 });
  assert.equal(result.total, 1);
});

test('简历搜索未启用时返回明确错误码', async () => {
  const repo = createResumeSearchRepo({ supabase: mockSupabase({ data: null, error: { code: '42883', message: 'function does not exist' } }), getProfile: () => ({ status: 'active' }) });
  await assert.rejects(() => repo.search({ query: 'Java' }), error => error.code === 'SEARCH_UNAVAILABLE');
});

test('空关键词不调用云端 RPC', async () => {
  const supabase = mockSupabase();
  const repo = createResumeSearchRepo({ supabase, getProfile: () => ({ status: 'active' }) });
  const result = await repo.search({ query: '   ', limit: 50, offset: 100 });
  assert.deepEqual(result, { rows: [], total: 0, query: '' });
  assert.deepEqual(supabase.calls, []);
});
