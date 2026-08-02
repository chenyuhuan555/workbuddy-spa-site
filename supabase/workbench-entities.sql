-- Phase 3：公司、岗位、推进记录独立表。
-- 使用现有 V2 text ID，保持与 workspace_state、候选人和历史业务记录兼容。

create table if not exists public.companies (
  id text primary key,
  workspace_id text not null default 'main',
  name text not null default '',
  status text not null default 'potential',
  owner text,
  profile_text text,
  industry text,
  website text,
  city text,
  source text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.positions (
  id text primary key,
  workspace_id text not null default 'main',
  company_id text,
  title text not null default '',
  status text not null default 'open',
  owner text,
  jd_text text,
  city text,
  salary text,
  requirements jsonb not null default '{}',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.applications (
  id text primary key,
  workspace_id text not null default 'main',
  candidate_id text not null,
  position_id text not null,
  company_id text,
  owner text,
  stage text not null default 'discovered',
  stage_entered_at timestamptz,
  pipeline_events jsonb not null default '[]',
  match_score numeric(5,2),
  match_reason text,
  evaluation text,
  client_report text,
  note text,
  status text not null default 'active',
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_companies_touch on public.companies;
create trigger trg_companies_touch before update on public.companies
for each row execute function public.touch_updated_at();
drop trigger if exists trg_positions_touch on public.positions;
create trigger trg_positions_touch before update on public.positions
for each row execute function public.touch_updated_at();
drop trigger if exists trg_applications_touch on public.applications;
create trigger trg_applications_touch before update on public.applications
for each row execute function public.touch_updated_at();

create index if not exists idx_companies_sync on public.companies(workspace_id, updated_at, id);
create index if not exists idx_positions_company on public.positions(workspace_id, company_id, updated_at, id);
create index if not exists idx_positions_sync on public.positions(workspace_id, updated_at, id);
create index if not exists idx_applications_candidate on public.applications(workspace_id, candidate_id, updated_at, id);
create index if not exists idx_applications_position on public.applications(workspace_id, position_id, stage, updated_at);
-- 业务层继续负责“同一候选人×岗位仅一条活跃推进”；这里不加联合唯一约束，保留 archived 历史。

alter table public.companies enable row level security;
alter table public.positions enable row level security;
alter table public.applications enable row level security;

drop policy if exists companies_read on public.companies;
create policy companies_read on public.companies for select using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active'
));
drop policy if exists companies_write on public.companies;
create policy companies_write on public.companies for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
));

drop policy if exists positions_read on public.positions;
create policy positions_read on public.positions for select using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active'
));
drop policy if exists positions_write on public.positions;
create policy positions_write on public.positions for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
));

drop policy if exists applications_read on public.applications;
create policy applications_read on public.applications for select using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active'
));
drop policy if exists applications_write on public.applications;
create policy applications_write on public.applications for all using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
)) with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role in ('admin', 'editor')
));
