import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./candidate-matching-repo.js');
const { createCandidateMatchingRepo } = globalThis.WorkBuddyCandidateMatchingRepo;

test('候选人匹配 Repository 调用 match_candidates RPC 并支持分页', async () => {
  const calls = [];
  const repo = createCandidateMatchingRepo({
    supabase: { rpc(name, args) { calls.push({ name, args }); return Promise.resolve({ data: [{ candidate_id: 'c1', score: 0.7 }], error: null }); } },
    getProfile: () => ({ status: 'active' }),
  });
  const result = await repo.matchPosition({ positionId: 'p1', limit: 25, offset: 5 });
  assert.equal(result.rows[0].candidate_id, 'c1');
  assert.deepEqual(calls[0], { name: 'match_candidates', args: { position_id: 'p1', result_limit: 25, result_offset: 5 } });
});

test('匹配能力未部署时返回明确错误码', async () => {
  const repo = createCandidateMatchingRepo({ supabase: { rpc: async () => ({ data: null, error: { code: '42883' } }) }, getProfile: () => ({ status: 'active' }) });
  await assert.rejects(() => repo.matchPosition({ positionId: 'p1' }), error => error.code === 'MATCHING_UNAVAILABLE');
});
