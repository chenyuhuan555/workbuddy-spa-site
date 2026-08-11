import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./talent-funnel-event-repo.js');
const Repo = globalThis.WorkBuddyTalentFunnelEventRepo;
const adminProfile = { status: 'active', role: 'admin' };
const memberProfile = { status: 'active', role: 'member' };

function mockSupabase({ data = [], error = null } = {}) {
  const calls = [];
  const builder = {
    insert(row) { calls.push({ op: 'insert', row }); return Promise.resolve({ error }); },
    select(...args) { calls.push({ op: 'select', args }); return this; },
    eq(col, value) { calls.push({ op: 'eq', col, value }); return this; },
    order(col, options) { calls.push({ op: 'order', col, options }); return this; },
    then(resolve) { return Promise.resolve({ data, error }).then(resolve); },
  };
  return { from(table) { calls.push({ op: 'from', table }); return builder; }, calls };
}

test('talent-funnel-events.sql 声明追加式事件表、统计索引和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-funnel-events.sql', import.meta.url), 'utf8');
  const createTableBlock = sql.match(/create table if not exists public\.talent_funnel_events[\s\S]*?\n\);/i)?.[0] || '';

  assert.match(sql, /create table if not exists public\.talent_funnel_events/i);
  assert.match(sql, /id\s+text\s+primary key/i);
  assert.match(sql, /company_id\s+text/i);
  assert.match(sql, /position_id\s+text/i);
  assert.match(sql, /candidate_id\s+text/i);
  assert.match(sql, /application_id\s+text/i);
  assert.match(sql, /channel_id\s+text/i);
  assert.match(sql, /stage\s+text\s+not null/i);
  assert.match(sql, /occurred_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.match(sql, /result\s+text/i);
  assert.match(sql, /reason_code\s+text/i);
  assert.match(sql, /reason_note\s+text/i);
  assert.match(sql, /actor_id\s+text/i);
  assert.match(sql, /is_pilot\s+boolean\s+not null\s+default false/i);
  assert.match(sql, /created_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.ok(createTableBlock, '应能提取 talent_funnel_events 的 create table 语句');
  assert.doesNotMatch(createTableBlock, /foreign key\s*\(channel_id\)\s*references public\.talent_source_channels\s*\(id\)/i);
  assert.doesNotMatch(createTableBlock, /foreign key\s*\(reason_code\)\s*references public\.talent_funnel_reason_codes\s*\(code\)/i);

  assert.match(sql, /create index if not exists idx_talent_funnel_events_company_pilot_time[\s\S]*company_id\s*,\s*is_pilot\s*,\s*occurred_at/i);
  assert.match(sql, /create index if not exists idx_talent_funnel_events_channel_time[\s\S]*channel_id\s*,\s*occurred_at/i);
  assert.match(sql, /create index if not exists idx_talent_funnel_events_stage_time[\s\S]*stage\s*,\s*occurred_at/i);
  assert.match(sql, /create index if not exists idx_talent_funnel_events_occurred_at[\s\S]*occurred_at/i);

  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create policy talent_funnel_events_read[\s\S]*p\.status = 'active'/i);
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*p\.status = 'active'/i);
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*actor_id\s*=\s*\(?auth\.uid\(\)?\)?::text/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_events_(update|delete|write)/i);
  assert.doesNotMatch(sql, /for all/i);
});

test('talent funnel 事件使用顺序安全 DO 补齐外键，非法 channel_id/reason_code 由数据库约束拒绝', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-funnel-events.sql', import.meta.url), 'utf8');

  assert.match(sql, /channel_id\s+text/i);
  assert.match(sql, /reason_code\s+text/i);
  assert.doesNotMatch(sql, /channel_name/i);
  assert.doesNotMatch(sql, /reason_name/i);
  assert.doesNotMatch(sql, /references\s+public\.talent_source_channels\s*\(\s*name\s*\)/i);
  assert.doesNotMatch(sql, /references\s+public\.talent_funnel_reason_codes\s*\(\s*name\s*\)/i);
  assert.match(sql, /do \$\$[\s\S]*to_regclass\('public\.talent_source_channels'\)[\s\S]*conname = 'talent_funnel_events_channel_id_fkey'[\s\S]*add constraint talent_funnel_events_channel_id_fkey[\s\S]*foreign key\s*\(channel_id\)\s*references public\.talent_source_channels\s*\(id\)/i);
  assert.match(sql, /do \$\$[\s\S]*to_regclass\('public\.talent_funnel_reason_codes'\)[\s\S]*conname = 'talent_funnel_events_reason_code_fkey'[\s\S]*add constraint talent_funnel_events_reason_code_fkey[\s\S]*foreign key\s*\(reason_code\)\s*references public\.talent_funnel_reason_codes\s*\(code\)/i);
});

test('talent funnel 事件 actor_id 绑定真实操作者，append-only 不开放 update delete', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-funnel-events.sql', import.meta.url), 'utf8');

  assert.match(sql, /actor_id\s+text[\s\S]*default\s+\(?auth\.uid\(\)?\)?::text/i);
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*p\.status = 'active'[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*actor_id\s*=\s*\(?auth\.uid\(\)?\)?::text/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_events_update/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_events_delete/i);
});

test('appendEvent 仅执行 insert，并优先让数据库默认填充 actor_id', async () => {
  const sb = mockSupabase();
  const repo = Repo.createTalentFunnelEventRepo({ supabase: sb, getProfile: () => adminProfile });

  const saved = await repo.appendEvent({
    id: 'evt_1',
    companyId: 'co_1',
    positionId: 'pos_1',
    candidateId: 'cand_1',
    applicationId: 'app_1',
    channelId: 'channel_referral',
    stage: 'matched',
    occurredAt: '2026-08-11T09:00:00.000Z',
    result: 'success',
    reasonCode: '',
    reasonNote: '',
    actorId: 'spoof_user_should_be_ignored',
    isPilot: true,
  });

  assert.equal(saved.id, 'evt_1');
  assert.equal(saved.stage, 'matched');
  assert.equal(saved.isPilot, true);
  assert.deepEqual(sb.calls.slice(0, 2), [
    { op: 'from', table: 'talent_funnel_events' },
    {
      op: 'insert',
      row: {
        id: 'evt_1',
        company_id: 'co_1',
        position_id: 'pos_1',
        candidate_id: 'cand_1',
        application_id: 'app_1',
        channel_id: 'channel_referral',
        stage: 'matched',
        occurred_at: '2026-08-11T09:00:00.000Z',
        result: 'success',
        reason_code: '',
        reason_note: '',
        is_pilot: true,
      },
    },
  ]);
  assert.equal('actor_id' in sb.calls[1].row, false, '即使外部传入 spoof actorId，也应由数据库默认填充');
  assert.equal(saved.actorId, '');
});

test('listEventsByCompany 和 listEventsByCompanyAndChannel 使用稳定过滤和排序，并恢复模型字段', async () => {
  const sb = mockSupabase({
    data: [{
      id: 'evt_1',
      company_id: 'co_1',
      position_id: 'pos_1',
      candidate_id: 'cand_1',
      application_id: 'app_1',
      channel_id: 'channel_referral',
      stage: 'matched',
      occurred_at: '2026-08-11T09:00:00.000Z',
      result: 'success',
      reason_code: '',
      reason_note: '',
      actor_id: 'user_1',
      is_pilot: true,
      created_at: '2026-08-11T09:01:00.000Z',
    }],
  });
  const repo = Repo.createTalentFunnelEventRepo({ supabase: sb, getProfile: () => memberProfile });

  const byCompany = await repo.listEventsByCompany('co_1');
  const byCompanyAndChannel = await repo.listEventsByCompanyAndChannel('co_1', 'channel_referral');

  assert.equal(byCompany[0].companyId, 'co_1');
  assert.equal(byCompany[0].channelId, 'channel_referral');
  assert.equal(byCompany[0].actorId, 'user_1');
  assert.equal(byCompanyAndChannel[0].applicationId, 'app_1');
  assert.ok(sb.calls.some(call => call.op === 'eq' && call.col === 'company_id' && call.value === 'co_1'));
  assert.ok(sb.calls.some(call => call.op === 'eq' && call.col === 'channel_id' && call.value === 'channel_referral'));
  assert.ok(sb.calls.some(call => call.op === 'order' && call.col === 'occurred_at'));
  assert.ok(sb.calls.some(call => call.op === 'order' && call.col === 'id'));
});

test('active member 可读但不能写 talent funnel 事件', async () => {
  const repo = Repo.createTalentFunnelEventRepo({ supabase: mockSupabase(), getProfile: () => memberProfile });
  await assert.rejects(
    () => repo.appendEvent({ id: 'evt_1', companyId: 'co_1', applicationId: 'app_1', stage: 'contacted' }),
    error => error.code === 'WRITE_REQUIRED',
  );
});
