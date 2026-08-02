-- resume_versions：简历版本元数据独立表（Phase 2c）
-- 版本文本继续存 resume_texts，原始文件继续存 Storage/IndexedDB。
-- 本阶段仅双写与迁移，页面仍从 candidates.resume_versions 读取。

create table if not exists public.resume_versions (
  id                         text primary key,
  candidate_id               text not null,
  workspace_id               text not null default 'main',
  source_resume_id           text,
  file_name                  text,
  file_id                    text,
  file_type                  text,
  file_size                  bigint,
  file_hash                  text,
  cloud_file_path            text,
  original_file_status       text,
  original_file_error        text,
  original_file_synced_at    timestamptz,
  uploaded_at                timestamptz,
  ai_stage                   text,
  format_status              text,
  format_error_code          text,
  format_error               text,
  formatted_at               timestamptz,
  extra                      jsonb not null default '{}',
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  deleted_at                 timestamptz
);

alter table public.resume_versions add column if not exists extra jsonb not null default '{}';
alter table public.resume_versions add column if not exists workspace_id text not null default 'main';

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_resume_versions_touch on public.resume_versions;
create trigger trg_resume_versions_touch
  before update on public.resume_versions
  for each row execute function public.touch_updated_at();

create index if not exists idx_resume_versions_candidate
  on public.resume_versions (workspace_id, candidate_id, updated_at);
create index if not exists idx_resume_versions_sync
  on public.resume_versions (workspace_id, updated_at, id);

alter table public.resume_versions enable row level security;

drop policy if exists resume_versions_read on public.resume_versions;
create policy resume_versions_read on public.resume_versions
  for select
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active'
  ));

drop policy if exists resume_versions_insert on public.resume_versions;
create policy resume_versions_insert on public.resume_versions
  for insert
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
  ));

drop policy if exists resume_versions_update on public.resume_versions;
create policy resume_versions_update on public.resume_versions
  for update
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
  ));

drop policy if exists resume_versions_delete on public.resume_versions;
create policy resume_versions_delete on public.resume_versions
  for delete
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role = 'admin'
  ));
