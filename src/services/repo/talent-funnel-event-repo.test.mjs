import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
  assert.match(sql, /create policy talent_funnel_events_insert[\s\S]*actor_id\s*=\s*\(?auth\.uid\(\)?\)?::text/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_events_update/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_events_delete/i);
});
