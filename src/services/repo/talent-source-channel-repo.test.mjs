import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('talent-source-channels.sql 声明稳定 text ID、可编辑字段、初始渠道和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-source-channels.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists public\.talent_source_channels/i);
  assert.match(sql, /id\s+text\s+primary key/i);
  assert.match(sql, /name\s+text\s+not null/i);
  assert.match(sql, /status\s+text\s+not null\s+default\s+'active'/i);
  assert.match(sql, /sort_order\s+integer\s+not null\s+default\s+0/i);
  assert.match(sql, /created_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.match(sql, /updated_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create policy talent_source_channels_read[\s\S]*p\.status = 'active'[\s\S]*status = 'active'/i);
  assert.match(sql, /create policy talent_source_channels_insert[\s\S]*for insert[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create policy talent_source_channels_update[\s\S]*for update[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create or replace function public\.talent_source_channel_key_exists/i);
  assert.match(sql, /create policy talent_source_channels_update[\s\S]*with check[\s\S]*public\.talent_source_channel_key_exists\(id\)/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_source_channels\(\)/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_source_channels\(\)[\s\S]*security definer/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_source_channels\(\)[\s\S]*set search_path = public/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_source_channels\(\)[\s\S]*p\.status = 'active'[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /revoke all on function public\.admin_list_talent_source_channels\(\) from public,\s*anon,\s*authenticated;/i);
  assert.match(sql, /grant execute on function public\.admin_list_talent_source_channels\(\) to authenticated;/i);
  assert.match(sql, /do \$\$[\s\S]*to_regclass\('public\.talent_funnel_events'\)[\s\S]*conname = 'talent_funnel_events_channel_id_fkey'[\s\S]*add constraint talent_funnel_events_channel_id_fkey[\s\S]*foreign key\s*\(channel_id\)\s*references public\.talent_source_channels\s*\(id\)/i);
  assert.doesNotMatch(sql, /create policy talent_source_channels_manage_read/i);
  assert.doesNotMatch(sql, /create policy talent_source_channels_delete/i);
  assert.doesNotMatch(sql, /create policy talent_source_channels_write/i);
  assert.doesNotMatch(sql, /for all/i);

  for (const [id, name] of [
    ['career_site', '外宣网站'],
    ['xiaomifeng', '小蜜蜂'],
    ['beiluo', '倍罗'],
    ['traditional_headhunter', '传统猎头'],
  ]) {
    assert.match(sql, new RegExp(`\\('${id}'\\s*,\\s*'${name}'`, 'i'));
  }
});

test('talent-funnel-reasons.sql 声明稳定 text code、可启停原因字典和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-funnel-reasons.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists public\.talent_funnel_reason_codes/i);
  assert.match(sql, /code\s+text\s+primary key/i);
  assert.match(sql, /name\s+text\s+not null/i);
  assert.match(sql, /status\s+text\s+not null\s+default\s+'active'/i);
  assert.match(sql, /sort_order\s+integer\s+not null\s+default\s+0/i);
  assert.match(sql, /created_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.match(sql, /updated_at\s+timestamptz\s+not null\s+default now\(\)/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /create policy talent_funnel_reason_codes_read[\s\S]*p\.status = 'active'[\s\S]*status = 'active'/i);
  assert.match(sql, /create policy talent_funnel_reason_codes_insert[\s\S]*for insert[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create policy talent_funnel_reason_codes_update[\s\S]*for update[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /create or replace function public\.talent_funnel_reason_code_exists/i);
  assert.match(sql, /create policy talent_funnel_reason_codes_update[\s\S]*with check[\s\S]*public\.talent_funnel_reason_code_exists\(code\)/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_funnel_reason_codes\(\)/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_funnel_reason_codes\(\)[\s\S]*security definer/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_funnel_reason_codes\(\)[\s\S]*set search_path = public/i);
  assert.match(sql, /create or replace function public\.admin_list_talent_funnel_reason_codes\(\)[\s\S]*p\.status = 'active'[\s\S]*p\.role in \('admin', 'editor'\)/i);
  assert.match(sql, /revoke all on function public\.admin_list_talent_funnel_reason_codes\(\) from public,\s*anon,\s*authenticated;/i);
  assert.match(sql, /grant execute on function public\.admin_list_talent_funnel_reason_codes\(\) to authenticated;/i);
  assert.match(sql, /do \$\$[\s\S]*to_regclass\('public\.talent_funnel_events'\)[\s\S]*conname = 'talent_funnel_events_reason_code_fkey'[\s\S]*add constraint talent_funnel_events_reason_code_fkey[\s\S]*foreign key\s*\(reason_code\)\s*references public\.talent_funnel_reason_codes\s*\(code\)/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_reason_codes_manage_read/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_reason_codes_delete/i);
  assert.doesNotMatch(sql, /create policy talent_funnel_reason_codes_write/i);
  assert.doesNotMatch(sql, /for all/i);

  for (const [code, name] of [
    ['cannot_contact', '联系不上'],
    ['no_interest', '候选人无意向'],
    ['salary_mismatch', '薪资不匹配'],
    ['tech_direction_mismatch', '技术方向不匹配'],
    ['role_requirements_changed', '岗位要求变化'],
    ['slow_company_feedback', '公司反馈慢'],
    ['interview_failed', '面试未通过'],
    ['offer_declined', 'Offer 被拒'],
    ['accepted_other_opportunity', '候选人接受其他机会'],
    ['other', '其他'],
  ]) {
    assert.match(sql, new RegExp(`\\('${code}'\\s*,\\s*'${name}'`, 'i'));
  }
});

test('package.json 的 npm test 包含 talent funnel SQL 契约测试', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts.test, /src\/services\/repo\/talent-source-channel-repo\.test\.mjs/);
  assert.match(pkg.scripts.test, /src\/services\/repo\/talent-funnel-event-repo\.test\.mjs/);
});
