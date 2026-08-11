import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./talent-source-channel-repo.js');
const Repo = globalThis.WorkBuddyTalentSourceChannelRepo;

function mockSupabase(behavior = {}) {
  const calls = [];
  const builder = {
    select: (columns, options) => {
      calls.push({ op: 'select', columns, options });
      return builder;
    },
    eq: (column, value) => {
      calls.push({ op: 'eq', column, value });
      return builder;
    },
    order: (column, options) => {
      calls.push({ op: 'order', column, options });
      return builder;
    },
    insert: row => {
      calls.push({ op: 'insert', row });
      return Promise.resolve(behavior.insertResult || { error: null });
    },
    update: patch => {
      calls.push({ op: 'update', patch });
      return builder;
    },
    then: resolve => resolve(behavior.updateResult || behavior.selectResult || { data: [], error: null }),
  };
  return {
    calls,
    from: table => {
      calls.push({ op: 'from', table });
      return builder;
    },
    rpc: (name, args) => {
      calls.push({ op: 'rpc', name, args });
      return Promise.resolve(behavior.rpcResult || { data: [], error: null });
    },
  };
}

const adminProfile = { status: 'active', role: 'admin' };
const editorProfile = { status: 'active', role: 'editor' };
const memberProfile = { status: 'active', role: 'member' };

test('talent-source-channels.sql 声明稳定 text ID、可编辑字段、初始渠道和 RLS', () => {
  const sql = fs.readFileSync(new URL('../../../supabase/talent-source-channels.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table if not exists public\.talent_source_channels/i);
  assert.match(sql, /id\s+text\s+primary key/i);
  assert.match(sql, /name\s+text\s+not null/i);
  assert.match(sql, /create unique index if not exists talent_source_channels_name_key_idx[\s\S]*on public\.talent_source_channels\s*\(lower\(btrim\(name\)\)\)/i);
  assert.match(sql, /talent_source_channels_name_not_blank["]?\s+check\s*\(btrim\(name\)\s*<>\s*''\)/i);
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

test('repo 模块已加载并暴露渠道表与管理 RPC 常量', () => {
  assert.ok(Repo);
  assert.equal(Repo.TABLE, 'talent_source_channels');
  assert.equal(Repo.ADMIN_LIST_RPC, 'admin_list_talent_source_channels');
});

test('listActive 只读取 active 字典并保持稳定排序', async () => {
  const sb = mockSupabase({
    selectResult: {
      data: [{ id: 'career_site', name: '外宣网站', status: 'active', sort_order: 10 }],
      error: null,
    },
  });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => memberProfile });
  const rows = await repo.listActive();

  assert.deepEqual(rows, [{
    id: 'career_site',
    name: '外宣网站',
    status: 'active',
    sortOrder: 10,
    createdAt: null,
    updatedAt: null,
  }]);
  assert.deepEqual(
    sb.calls.map(call => call.op === 'order' ? [call.op, call.column] : call.op === 'eq' ? [call.op, call.column, call.value] : [call.op, call.table || call.name]),
    [
      ['from', 'talent_source_channels'],
      ['select', undefined],
      ['eq', 'status', 'active'],
      ['order', 'sort_order'],
      ['order', 'id'],
    ],
  );
});

test('listForManagement 走 SECURITY DEFINER 管理 RPC', async () => {
  const sb = mockSupabase({
    rpcResult: {
      data: [
        { id: 'legacy', name: '旧渠道', status: 'inactive', sort_order: 90 },
        { id: 'career_site', name: '外宣网站', status: 'active', sort_order: 10 },
      ],
      error: null,
    },
  });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => editorProfile });
  const rows = await repo.listForManagement();

  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, 'inactive');
  assert.deepEqual(sb.calls.find(call => call.op === 'rpc'), {
    op: 'rpc',
    name: 'admin_list_talent_source_channels',
    args: undefined,
  });
});

test('create 写入稳定 id + name + status + sort_order', async () => {
  const sb = mockSupabase();
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => adminProfile });
  const result = await repo.create({ id: 'channel_1', name: '新增渠道', status: 'active', sortOrder: 50 });

  assert.deepEqual(result, {
    id: 'channel_1',
    name: '新增渠道',
    status: 'active',
    sortOrder: 50,
    createdAt: null,
    updatedAt: null,
  });
  assert.deepEqual(sb.calls.find(call => call.op === 'insert')?.row, {
    id: 'channel_1',
    name: '新增渠道',
    status: 'active',
    sort_order: 50,
  });
});

test('rename 仅提交稳定 id 与新名称，不生成新 id', async () => {
  const sb = mockSupabase({ updateResult: { data: [{ id: 'career_site' }], error: null, count: 1 } });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => adminProfile });
  const result = await repo.rename('career_site', '官网投递');

  assert.deepEqual(result, { id: 'career_site', name: '官网投递' });
  assert.deepEqual(sb.calls.find(call => call.op === 'update')?.patch, { name: '官网投递' });
  const eqCalls = sb.calls.filter(call => call.op === 'eq');
  assert.deepEqual(eqCalls, [{ op: 'eq', column: 'id', value: 'career_site' }]);
  assert.deepEqual(sb.calls.find(call => call.op === 'select'), { op: 'select', columns: 'id', options: undefined });
  assert.equal(sb.calls.some(call => call.op === 'insert'), false);
});

test('rename 0 行时抛 CHANNEL_NOT_FOUND_OR_FORBIDDEN', async () => {
  const sb = mockSupabase({ updateResult: { data: [], error: null, count: 0 } });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => adminProfile });

  await assert.rejects(() => repo.rename('missing', '新名称'), error => error.code === 'CHANNEL_NOT_FOUND_OR_FORBIDDEN');
});

test('create 和 rename 映射数据库唯一冲突为 CHANNEL_NAME_CONFLICT', async () => {
  const conflict = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
  const createSb = mockSupabase({ insertResult: { error: conflict } });
  const createRepo = Repo.createTalentSourceChannelRepo({ supabase: createSb, getProfile: () => adminProfile });
  await assert.rejects(() => createRepo.create({ id: 'new', name: '重复', status: 'active' }), error => error.code === 'CHANNEL_NAME_CONFLICT');

  const renameSb = mockSupabase({ updateResult: { data: [], error: conflict, count: 0 } });
  const renameRepo = Repo.createTalentSourceChannelRepo({ supabase: renameSb, getProfile: () => adminProfile });
  await assert.rejects(() => renameRepo.rename('career_site', '重复'), error => error.code === 'CHANNEL_NAME_CONFLICT');
});

test('setStatus 支持停用和启用渠道', async () => {
  const sb = mockSupabase({ updateResult: { data: [{ id: 'career_site' }], error: null, count: 1 } });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => adminProfile });

  assert.deepEqual(await repo.setStatus('career_site', 'inactive'), { id: 'career_site', status: 'inactive' });
  assert.deepEqual(await repo.setStatus('career_site', 'active'), { id: 'career_site', status: 'active' });
  assert.deepEqual(
    sb.calls.filter(call => call.op === 'update').map(call => call.patch),
    [{ status: 'inactive' }, { status: 'active' }],
  );
});

test('setStatus 0 行时抛 CHANNEL_NOT_FOUND_OR_FORBIDDEN', async () => {
  const sb = mockSupabase({ updateResult: { data: [], error: null, count: 0 } });
  const repo = Repo.createTalentSourceChannelRepo({ supabase: sb, getProfile: () => adminProfile });

  await assert.rejects(() => repo.setStatus('missing', 'inactive'), error => error.code === 'CHANNEL_NOT_FOUND_OR_FORBIDDEN');
});
