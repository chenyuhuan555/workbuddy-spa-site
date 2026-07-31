-- resume_texts：简历文本独立存表（Phase 1）
-- 目的：把 rawText / formattedText 从 workspace_state 大 JSON 中移出，
--       云端整包同步体积下降 90%+，并为全文搜索 / AI 匹配打基础。
-- 注意：resume_version_id 使用 text，兼容前端现有 `resume_xxxx` 格式 id，
--       Phase 2 建 resume_versions 表时以同名 text 主键关联。

create extension if not exists pg_trgm;

create table if not exists public.resume_texts (
  resume_version_id text primary key,
  raw_text          text not null default '',
  formatted_text    text not null default '',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- updated_at 自动维护
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resume_texts_touch on public.resume_texts;
create trigger trg_resume_texts_touch
  before update on public.resume_texts
  for each row execute function public.touch_updated_at();

-- 全文搜索预备索引（pg_trgm 三元组，对中文有效；Phase 4 的 search RPC 会用到）
create index if not exists idx_resume_texts_raw_trgm
  on public.resume_texts using gin (raw_text gin_trgm_ops);

-- ============ RLS ============
alter table public.resume_texts enable row level security;

-- 读：任何 active 成员（与 storage 读策略一致）
drop policy if exists resume_texts_read on public.resume_texts;
create policy resume_texts_read on public.resume_texts
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
    )
  );

-- 写：仅 admin / editor（与 storage 写策略一致）
drop policy if exists resume_texts_insert on public.resume_texts;
create policy resume_texts_insert on public.resume_texts
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role in ('admin', 'editor')
    )
  );

drop policy if exists resume_texts_update on public.resume_texts;
create policy resume_texts_update on public.resume_texts
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role in ('admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role in ('admin', 'editor')
    )
  );

-- 删除：仅 admin（文本随候选人删除流程走，普通编辑不直接删）
drop policy if exists resume_texts_delete on public.resume_texts;
create policy resume_texts_delete on public.resume_texts
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role = 'admin'
    )
  );
