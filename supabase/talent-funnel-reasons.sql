-- 独立推进原因字典。
-- 使用稳定 text code 作为事件统计原因编码，名称可编辑，支持启停。

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.talent_funnel_reason_codes (
  code text primary key,
  name text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.talent_funnel_reason_code_exists(target_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.talent_funnel_reason_codes
    where code = target_code
  );
$$;

create or replace function public.admin_list_talent_funnel_reason_codes()
returns setof public.talent_funnel_reason_codes
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'editor')
  ) then
    raise exception 'ADMIN_OR_EDITOR_REQUIRED';
  end if;

  return query
  select *
  from public.talent_funnel_reason_codes
  order by sort_order, code;
end;
$$;

revoke all on function public.admin_list_talent_funnel_reason_codes() from public, anon, authenticated;
grant execute on function public.admin_list_talent_funnel_reason_codes() to authenticated;

drop trigger if exists trg_talent_funnel_reason_codes_touch on public.talent_funnel_reason_codes;
create trigger trg_talent_funnel_reason_codes_touch
before update on public.talent_funnel_reason_codes
for each row execute function public.touch_updated_at();

insert into public.talent_funnel_reason_codes (code, name, status, sort_order)
values
  ('cannot_contact', '联系不上', 'active', 10),
  ('no_interest', '候选人无意向', 'active', 20),
  ('salary_mismatch', '薪资不匹配', 'active', 30),
  ('tech_direction_mismatch', '技术方向不匹配', 'active', 40),
  ('role_requirements_changed', '岗位要求变化', 'active', 50),
  ('slow_company_feedback', '公司反馈慢', 'active', 60),
  ('interview_failed', '面试未通过', 'active', 70),
  ('offer_declined', 'Offer 被拒', 'active', 80),
  ('accepted_other_opportunity', '候选人接受其他机会', 'active', 90),
  ('other', '其他', 'active', 100)
on conflict (code) do nothing;

do $$
begin
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

alter table public.talent_funnel_reason_codes enable row level security;

drop policy if exists talent_funnel_reason_codes_read on public.talent_funnel_reason_codes;
create policy talent_funnel_reason_codes_read on public.talent_funnel_reason_codes
for select
using (
  status = 'active'
  and
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
  )
);

drop policy if exists talent_funnel_reason_codes_manage_read on public.talent_funnel_reason_codes;
drop policy if exists talent_funnel_reason_codes_insert on public.talent_funnel_reason_codes;
create policy talent_funnel_reason_codes_insert on public.talent_funnel_reason_codes
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'editor')
  )
);

drop policy if exists talent_funnel_reason_codes_update on public.talent_funnel_reason_codes;
create policy talent_funnel_reason_codes_update on public.talent_funnel_reason_codes
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'editor')
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status = 'active'
      and p.role in ('admin', 'editor')
  )
  and public.talent_funnel_reason_code_exists(code)
);
