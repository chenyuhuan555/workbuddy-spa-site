-- 私有待办 / 自动待办表（user_todos）
--
-- 背景：这张表是早期（旧版 resume 系统）在 Supabase 控制台手工创建，
-- 仓库内一直没有建表 SQL。为消除交接 / 新环境部署风险，现补齐正式定义。
--
-- 代码证据（src/private-todos.js）：
--   load:   select(id, data, created_at, updated_at)
--           where workspace_id = 'main' and user_id = <profile.id>
--           order by updated_at desc
--   save:   upsert({ id, user_id, workspace_id: 'main', data }, { onConflict: 'id' })
--   remove: delete where id = <todoId> and user_id = <profile.id>
--   user_id 即 profiles.id（= auth.users.id / auth.uid()，uuid 类型）
--
-- data(jsonb) 字段白名单（由 src/private-todos.js 的 todoData 写入）：
--   title, subtitle, type, date, done, linkType, linkId, linkLabel,
--   source(manual|system), status(pending|done|cancelled), ruleKey,
--   entityType, entityId, candidateId, companyId, positionId, applicationId,
--   owner, dueAt, dedupeKey, completedAt
--
-- 依赖：public.touch_updated_at() 在 supabase/workbench-entities.sql 中定义，
--       请按 README 顺序在 workbench-entities.sql 之后执行本文件。

create table if not exists public.user_todos (
  id text primary key,
  user_id uuid not null,
  workspace_id text not null default 'main',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_todos is '私有待办与自动待办：Manual + System Todo 统一存储，按 user_id 隔离';
comment on column public.user_todos.id is '待办 id（todo_xxx / demo_todo_xxx），text 主键';
comment on column public.user_todos.user_id is '属主 profiles.id（auth.uid()），待办按属主私有';
comment on column public.user_todos.workspace_id is '工作区标识，当前统一为 main';
comment on column public.user_todos.data is '待办 JSON（字段白名单见本文件头注释）';

-- 与代码查询匹配的索引：where user_id=? and workspace_id=? order by updated_at desc
create index if not exists idx_user_todos_user
  on public.user_todos (user_id, workspace_id, updated_at desc);

drop trigger if exists trg_user_todos_touch on public.user_todos;
create trigger trg_user_todos_touch before update on public.user_todos
for each row execute function public.touch_updated_at();

-- ── RLS：待办按属主私有，用户只能读写自己的待办 ──
alter table public.user_todos enable row level security;

drop policy if exists user_todos_read on public.user_todos;
create policy user_todos_read on public.user_todos
  for select using (user_id = auth.uid());

drop policy if exists user_todos_insert on public.user_todos;
create policy user_todos_insert on public.user_todos
  for insert with check (user_id = auth.uid());

drop policy if exists user_todos_update on public.user_todos;
create policy user_todos_update on public.user_todos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_todos_delete on public.user_todos;
create policy user_todos_delete on public.user_todos
  for delete using (user_id = auth.uid());

-- 说明：
-- 1. 若线上已存在旧表且 user_id 为 text 类型，请先核对数据再按需迁移为 uuid。
-- 2. System Todo 与 Manual Todo 都按 user_id 归属当前账号；管理员"看全部"能力
--    属于后续权限迭代，届时再评估是否放开 RLS 或增加跨用户查询接口。
