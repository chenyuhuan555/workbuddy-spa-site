import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./workbench-entity-repo.js');
const Repo = globalThis.WorkBuddyWorkbenchEntityRepo;
const admin = { status: 'active', role: 'admin' };
const member = { status: 'active', role: 'member' };

function mockSupabase({ pages = null, data = [], error = null } = {}) {
  const calls = [];
  let queryIndex = 0;
  const builder = {
    select(...args) { calls.push({ op: 'select', args }); return this; },
    eq(col, value) { calls.push({ op: 'eq', col, value }); return this; },
    gt(col, value) { calls.push({ op: 'gt', col, value }); return this; },
    order(col, options) { calls.push({ op: 'order', col, options }); return this; },
    range(from, to) { calls.push({ op: 'range', from, to }); return this; },
    limit(value) { calls.push({ op: 'limit', value }); return this; },
    upsert(rows, options) { calls.push({ op: 'upsert', rows, options }); return Promise.resolve({ error }); },
    then(resolve) {
      const current = Array.isArray(pages) ? (pages[queryIndex++] || []) : data;
      return Promise.resolve({ data: current, error }).then(resolve);
    },
  };
  return { from(table) { calls.push({ op: 'from', table }); return builder; }, calls };
}

test('repo 暴露三类实体并使用独立表名', () => {
  assert.deepEqual(Repo.TABLES, { companies: 'companies', positions: 'positions', applications: 'applications' });
  assert.equal(typeof Repo.createWorkbenchEntityRepo, 'function');
});

test('upsertMany 映射公司、岗位、推进字段并保留未知字段到 extra', async () => {
  const sb = mockSupabase();
  const repo = Repo.createWorkbenchEntityRepo({ supabase: sb, getProfile: () => admin });
  await repo.upsertMany('companies', [{ id: 'co_1', name: '甲公司', status: 'potential', customFlag: true }]);
  await repo.upsertMany('positions', [{ id: 'pos_1', companyId: 'co_1', title: '工程师', description: 'JD', requirements: { must: ['JS'] } }]);
  await repo.upsertMany('applications', [{ id: 'app_1', candidateId: 'cand_1', positionId: 'pos_1', companyId: 'co_1', stage: 'screening', pipelineEvents: [{ id: 'e1' }], customScore: 8 }]);
  const rows = sb.calls.filter(call => call.op === 'upsert').map(call => call.rows[0]);
  assert.equal(rows[0].name, '甲公司');
  assert.equal(rows[0].extra.customFlag, true);
  assert.equal(rows[1].company_id, 'co_1');
  assert.equal(rows[1].jd_text, 'JD');
  assert.deepEqual(rows[1].requirements, { must: ['JS'] });
  assert.equal(rows[2].candidate_id, 'cand_1');
  assert.deepEqual(rows[2].pipeline_events, [{ id: 'e1' }]);
  assert.equal(rows[2].extra.customScore, 8);
});

test('listPage/listAll 使用 workspace、updated_at、id 稳定分页并恢复模型字段', async () => {
  const sb = mockSupabase({ pages: [
    [{ id: 'co_1', name: '甲', extra: { custom: 1 }, updated_at: '2026-01-01' },
      { id: 'co_2', name: '乙', updated_at: '2026-01-02' }],
    [{ id: 'co_3', name: '丙', updated_at: '2026-01-03' }],
  ] });
  const repo = Repo.createWorkbenchEntityRepo({ supabase: sb, getProfile: () => admin });
  const rows = await repo.listAll('companies', 2);
  assert.deepEqual(rows.map(row => row.id), ['co_1', 'co_2', 'co_3']);
  assert.equal(rows[0].custom, 1);
  assert.equal(sb.calls.filter(call => call.op === 'range').length, 2);
});

test('listSince 支持更新时间游标', async () => {
  const sb = mockSupabase({ data: [{ id: 'pos_1', company_id: 'co_1', title: '岗位' }] });
  const repo = Repo.createWorkbenchEntityRepo({ supabase: sb, getProfile: () => member });
  const rows = await repo.listSince('positions', '2026-01-01T00:00:00.000Z', 100);
  assert.equal(rows[0].companyId, 'co_1');
  assert.ok(sb.calls.some(call => call.op === 'gt' && call.col === 'updated_at'));
});

test('member 可读但不能写，未知实体被拒绝', async () => {
  const repo = Repo.createWorkbenchEntityRepo({ supabase: mockSupabase(), getProfile: () => member });
  await assert.rejects(() => repo.upsertMany('companies', [{ id: 'co_1', name: '甲' }]), error => error.code === 'WRITE_REQUIRED');
  await assert.rejects(() => repo.listPage('unknown', 0, 10), error => error.code === 'INVALID_ARGUMENT');
});

test('workbench-entities.sql 声明三表、text ID、索引和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/workbench-entities.sql', import.meta.url), 'utf8');
  for (const table of ['companies', 'positions', 'applications']) assert.match(sql, new RegExp(`create table if not exists public\\.${table}`, 'i'));
  assert.match(sql, /candidate_id\s+text\s+not null/i);
  assert.match(sql, /workspace_id\s+text\s+not null/i);
  assert.match(sql, /enable row level security/i);
});
