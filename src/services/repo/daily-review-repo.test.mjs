import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./daily-review-repo.js');
const Repo = globalThis.WorkBuddyDailyReviewRepo;

function reviewRow(id, userId, overrides = {}) {
  return {
    id, user_id: userId, workspace_id: 'main', user_name: '顾问A',
    review_date: '2026-08-19', metrics: { addedCandidates: 1 }, issue: '', tomorrow_focus: '', summary: '',
    created_at: '2026-08-19T00:00:00Z', updated_at: '2026-08-19T00:00:00Z',
    ...overrides,
  };
}

function mockSupabase(behavior = {}) {
  const calls = [];
  const builder = {
    select: () => { calls.push({ op: 'select' }); return builder; },
    eq: (col, val) => { calls.push({ op: 'eq', col, val }); return builder; },
    gte: (col, val) => { calls.push({ op: 'gte', col, val }); return builder; },
    lte: (col, val) => { calls.push({ op: 'lte', col, val }); return builder; },
    order: (col, opts) => { calls.push({ op: 'order', col, opts }); return builder; },
    maybeSingle: async () => { calls.push({ op: 'maybeSingle' }); return behavior.maybeSingle ?? { data: null, error: null }; },
    single: async () => { calls.push({ op: 'single' }); return behavior.single ?? { data: null, error: null }; },
    upsert: (row, opts) => { calls.push({ op: 'upsert', row, opts }); return builder; },
    then: (resolve, reject) => Promise.resolve(behavior.list ?? { data: [], error: null }).then(resolve, reject),
  };
  const supabase = { from: (table) => { calls.push({ op: 'from', table }); return builder; } };
  return { supabase, calls };
}

const ACTIVE_PROFILE = { id: 'u_A', role: 'editor', status: 'active' };

test('14. 同一天保存两次走 upsert，onConflict 指向唯一约束 workspace_id+user_id+review_date', async () => {
  const { supabase, calls } = mockSupabase({ single: { data: reviewRow('dr_1', 'u_A'), error: null } });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => ACTIVE_PROFILE });
  await repo.upsertReview({
    id: 'dr_1', userId: 'u_A', reviewDate: '2026-08-19',
    metrics: { addedCandidates: 3 }, issue: '问题', tomorrowFocus: '重点', summary: '总结',
  });
  const upsert = calls.find(c => c.op === 'upsert');
  assert.ok(upsert, '应调用 upsert');
  assert.equal(upsert.opts.onConflict, 'workspace_id,user_id,review_date');
  assert.equal(upsert.row.user_id, 'u_A');
});

test('17. 顾问/管理员不能保存他人日报（user_id 必须等于本人）', async () => {
  const admin = { id: 'u_admin', role: 'admin', status: 'active' };
  const { supabase } = mockSupabase({});
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => admin });
  await assert.rejects(
    repo.upsertReview({ id: 'dr_x', userId: 'u_B', reviewDate: '2026-08-19' }),
    { code: 'WRITE_FORBIDDEN' },
  );
});

test('15. loadByDate 按 userId 过滤（顾问只读自己）', async () => {
  const { supabase, calls } = mockSupabase({ maybeSingle: { data: reviewRow('dr_1', 'u_A'), error: null } });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => ACTIVE_PROFILE });
  const model = await repo.loadByDate({ userId: 'u_A', reviewDate: '2026-08-19' });
  const eqs = calls.filter(c => c.op === 'eq');
  assert.ok(eqs.some(c => c.col === 'user_id' && c.val === 'u_A'), '应按 user_id 过滤');
  assert.equal(model.id, 'dr_1');
  assert.equal(model.reviewDate, '2026-08-19');
  assert.deepEqual(model.metrics, { addedCandidates: 1 });
});

test('loadByDate 无记录返回 null', async () => {
  const { supabase } = mockSupabase({ maybeSingle: { data: null, error: null } });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => ACTIVE_PROFILE });
  const model = await repo.loadByDate({ userId: 'u_A', reviewDate: '2026-08-19' });
  assert.equal(model, null);
});

test('16. loadTeamByDate 不加 user_id 过滤（管理员读全团队）', async () => {
  const admin = { id: 'u_admin', role: 'admin', status: 'active' };
  const { supabase, calls } = mockSupabase({ list: { data: [reviewRow('dr_1', 'u_A'), reviewRow('dr_2', 'u_B')], error: null } });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => admin });
  const rows = await repo.loadTeamByDate({ reviewDate: '2026-08-19' });
  const eqs = calls.filter(c => c.op === 'eq');
  assert.ok(!eqs.some(c => c.col === 'user_id'), '团队查询不应按 user_id 过滤');
  assert.equal(rows.length, 2);
});

test('21. loadHistory 按日期倒序（review_date desc）', async () => {
  const admin = { id: 'u_admin', role: 'admin', status: 'active' };
  const { supabase, calls } = mockSupabase({ list: { data: [], error: null } });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => admin });
  await repo.loadHistory({ userId: 'all' });
  const orders = calls.filter(c => c.op === 'order');
  assert.ok(orders.some(c => c.col === 'review_date' && c.opts.ascending === false), '历史应按 review_date 倒序');
});

test('loadHistory：userId 具体值限定本人，all/空 查全部', async () => {
  const admin = { id: 'u_admin', role: 'admin', status: 'active' };
  const a = mockSupabase({ list: { data: [], error: null } });
  const repoA = Repo.createDailyReviewRepo({ supabase: a.supabase, getProfile: () => admin });
  await repoA.loadHistory({ userId: 'u_A' });
  assert.ok(a.calls.some(c => c.op === 'eq' && c.col === 'user_id' && c.val === 'u_A'), '具体 userId 应过滤');

  const b = mockSupabase({ list: { data: [], error: null } });
  const repoB = Repo.createDailyReviewRepo({ supabase: b.supabase, getProfile: () => admin });
  await repoB.loadHistory({ userId: 'all' });
  assert.ok(!b.calls.some(c => c.op === 'eq' && c.col === 'user_id'), 'all 不应过滤 user_id');
});

test('toModel 正确映射 snake_case 字段', async () => {
  const { supabase } = mockSupabase({
    maybeSingle: {
      data: reviewRow('dr_1', 'u_A', {
        user_name: '陈雨欢', metrics: { interviews: 2, offers: 1 },
        issue: '反馈率低', tomorrow_focus: '跟进中科量枢', summary: '今日总结',
      }),
      error: null,
    },
  });
  const repo = Repo.createDailyReviewRepo({ supabase, getProfile: () => ACTIVE_PROFILE });
  const model = await repo.loadByDate({ userId: 'u_A', reviewDate: '2026-08-19' });
  assert.equal(model.userName, '陈雨欢');
  assert.equal(model.tomorrowFocus, '跟进中科量枢');
  assert.equal(model.issue, '反馈率低');
});
