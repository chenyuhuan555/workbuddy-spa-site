-- candidates：候选人独立存表（Phase 2a）
-- 目的：把候选人元数据（含版本列表）从 workspace_state 大 JSON 挪到独立行，
--       跨设备以"候选人粒度"同步、独立更新；读路径暂不变（仍走 workspace_state），
--       本表先作为双写/回填目标，为 Phase 2b 行级增量同步打底。
-- 注意：id 使用 text，兼容前端现有 `cand_xxxx` 格式 id（非 uuid），
--       resume_versions 暂时以 jsonb 内嵌在候选人行，Phase 2b 再抽独立表。
-- 大简历文本（rawText/formattedText）已在 Phase 1 的 resume_texts 表，
--       写入本表前由前端剥离，不重复落库。

-- updated_at 自动维护（resume-texts.sql 已建过，这里用 create or replace 保证幂等）
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.candidates (
  id                text primary key,
  workspace_id      text not null default 'main',
  name              text not null default '',
  phone             text,
  email             text,
  current_company   text,
  current_title     text,
  city              text,
  status            text not null default 'active',
  owner             text,
  source            text,
  education         text,
  experience_years  integer,
  tags              jsonb not null default '[]',
  skills            jsonb not null default '[]',
  keywords          jsonb not null default '[]',
  directions        jsonb not null default '[]',
  category_ids      jsonb not null default '[]',
  summary           text,
  profile_text      text,
  resume_versions   jsonb not null default '[]',   -- 版本元数据（文本已在 resume_texts）
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz                     -- 软删除（墓碑）
);

drop trigger if exists trg_candidates_touch on public.candidates;
create trigger trg_candidates_touch
  before update on public.candidates
  for each row execute function public.touch_updated_at();

-- 同步游标索引（Phase 2b 增量拉取用：where workspace_id=eq.main and updated_at>cursor）
create index if not exists idx_candidates_sync
  on public.candidates (workspace_id, updated_at);

-- 按候选人姓名全文检索预备（pg_trgm 三元组，对中文有效）
create index if not exists idx_candidates_name_trgm
  on public.candidates using gin (name gin_trgm_ops);

-- ============ RLS ============
alter table public.candidates enable row level security;

-- 读：任何 active 成员（与 storage / resume_texts 读策略一致）
drop policy if exists candidates_read on public.candidates;
create policy candidates_read on public.candidates
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
    )
  );

-- 写：仅 admin / editor（与 storage / resume_texts 写策略一致）
drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role in ('admin', 'editor')
    )
  );

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
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

-- 删除：仅 admin（候选人删除走软删除流程，普通编辑不直接物理删）
drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and p.role = 'admin'
    )
  );
