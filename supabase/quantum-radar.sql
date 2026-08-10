-- Sprint 2：量子人才雷达云端数据层。
-- 本脚本只创建独立表，不改变现有 workspace_state / candidates / positions 的读路径。

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.quantum_radar_companies (
  id text primary key,
  workspace_id text not null default 'main',
  name text not null default '',
  domain text not null default '',
  hiring_status text not null default '持续关注',
  job_count integer not null default 0,
  focus text,
  source text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.external_jobs (
  id text primary key,
  workspace_id text not null default 'main',
  title text not null default '',
  company text not null default '',
  location text,
  quantum_domain text,
  score numeric(5,2),
  status text not null default '待评估',
  posted_days integer,
  source text,
  source_url text,
  published_at timestamptz,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.talent_leads (
  id text primary key,
  workspace_id text not null default 'main',
  name text not null default '',
  institution text,
  research_direction text,
  matched_jobs jsonb not null default '[]',
  match_score numeric(5,2),
  stage text not null default '线索观察',
  source text,
  candidate_id text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.external_jobs
  add column if not exists position_id text;

create index if not exists idx_external_jobs_position
on public.external_jobs(workspace_id, position_id);

create index if not exists idx_talent_leads_candidate
on public.talent_leads(workspace_id, candidate_id);

create table if not exists public.quantum_company_sources (
  id text primary key,
  workspace_id text not null default 'main',
  company_id text,
  source_type text not null default 'company_site',
  source_url text not null default '',
  enabled boolean not null default true,
  last_crawled_at timestamptz,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quantum_crawl_tasks (
  id text primary key,
  workspace_id text not null default 'main',
  name text not null default '',
  status text not null default '待运行',
  last_run_at timestamptz,
  source text,
  result_count integer not null default 0,
  error_message text,
  extra jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quantum_companies_sync on public.quantum_radar_companies(workspace_id, updated_at, id);
create index if not exists idx_external_jobs_sync on public.external_jobs(workspace_id, updated_at, id);
create index if not exists idx_external_jobs_score on public.external_jobs(workspace_id, score desc nulls last);
create index if not exists idx_talent_leads_sync on public.talent_leads(workspace_id, updated_at, id);
create index if not exists idx_quantum_sources_company on public.quantum_company_sources(workspace_id, company_id, enabled);
create index if not exists idx_quantum_tasks_sync on public.quantum_crawl_tasks(workspace_id, updated_at, id);

drop trigger if exists trg_quantum_companies_touch on public.quantum_radar_companies;
create trigger trg_quantum_companies_touch before update on public.quantum_radar_companies for each row execute function public.touch_updated_at();
drop trigger if exists trg_external_jobs_touch on public.external_jobs;
create trigger trg_external_jobs_touch before update on public.external_jobs for each row execute function public.touch_updated_at();
drop trigger if exists trg_talent_leads_touch on public.talent_leads;
create trigger trg_talent_leads_touch before update on public.talent_leads for each row execute function public.touch_updated_at();
drop trigger if exists trg_quantum_sources_touch on public.quantum_company_sources;
create trigger trg_quantum_sources_touch before update on public.quantum_company_sources for each row execute function public.touch_updated_at();
drop trigger if exists trg_quantum_tasks_touch on public.quantum_crawl_tasks;
create trigger trg_quantum_tasks_touch before update on public.quantum_crawl_tasks for each row execute function public.touch_updated_at();

alter table public.quantum_radar_companies enable row level security;
alter table public.external_jobs enable row level security;
alter table public.talent_leads enable row level security;
alter table public.quantum_company_sources enable row level security;
alter table public.quantum_crawl_tasks enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['quantum_radar_companies','external_jobs','talent_leads','quantum_company_sources','quantum_crawl_tasks'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_read', table_name);
    execute format('create policy %I on public.%I for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active''))', table_name || '_read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_write', table_name);
    execute format('create policy %I on public.%I for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and p.role in (''admin'', ''editor''))) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = ''active'' and p.role in (''admin'', ''editor'')))', table_name || '_write', table_name);
  end loop;
end $$;
