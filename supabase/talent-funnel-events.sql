-- 独立推进事件流水。
-- 设计为追加式事件表：允许 active 成员插入新事件，不提供 update/delete 业务权限。

create table if not exists public.talent_funnel_events (
  id text primary key,
  company_id text,
  position_id text,
  candidate_id text,
  application_id text,
  channel_id text,
  stage text not null,
  occurred_at timestamptz not null default now(),
  result text,
  reason_code text,
  reason_note text,
  actor_id text default (auth.uid())::text,
  is_pilot boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.talent_funnel_events
  alter column actor_id set default (auth.uid())::text;

do $$
begin
  if to_regclass('public.talent_funnel_events') is not null
    and to_regclass('public.talent_source_channels') is not null
    and not exists (
    select 1
    from pg_constraint
    where conname = 'talent_funnel_events_channel_id_fkey'
      and conrelid = 'public.talent_funnel_events'::regclass
  ) then
    alter table public.talent_funnel_events
      add constraint talent_funnel_events_channel_id_fkey
      foreign key (channel_id) references public.talent_source_channels(id);
  end if;

  if to_regclass('public.talent_funnel_events') is not null
    and to_regclass('public.talent_funnel_reason_codes') is not null
    and not exists (
    select 1
    from pg_constraint
    where conname = 'talent_funnel_events_reason_code_fkey'
      and conrelid = 'public.talent_funnel_events'::regclass
  ) then
    alter table public.talent_funnel_events
      add constraint talent_funnel_events_reason_code_fkey
      foreign key (reason_code) references public.talent_funnel_reason_codes(code);
  end if;
end $$;

create index if not exists idx_talent_funnel_events_company_pilot_time
  on public.talent_funnel_events (company_id, is_pilot, occurred_at desc);

create index if not exists idx_talent_funnel_events_channel_time
  on public.talent_funnel_events (channel_id, occurred_at desc);

create index if not exists idx_talent_funnel_events_stage_time
  on public.talent_funnel_events (stage, occurred_at desc);

create index if not exists idx_talent_funnel_events_occurred_at
  on public.talent_funnel_events (occurred_at desc, id);

alter table public.talent_funnel_events enable row level security;

drop policy if exists talent_funnel_events_read on public.talent_funnel_events;
create policy talent_funnel_events_read on public.talent_funnel_events
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
  )
);

drop policy if exists talent_funnel_events_insert on public.talent_funnel_events;
create policy talent_funnel_events_insert on public.talent_funnel_events
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
  )
  and actor_id = (auth.uid())::text
);
