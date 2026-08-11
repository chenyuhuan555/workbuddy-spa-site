-- 独立人才来源渠道字典。
-- 使用稳定 text ID 作为事件统计关联键，名称可编辑，不能作为外键依赖。

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.talent_source_channels (
  id text primary key,
  name text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.talent_source_channel_key_exists(target_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.talent_source_channels
    where id = target_id
  );
$$;

create or replace function public.admin_list_talent_source_channels()
returns setof public.talent_source_channels
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
  from public.talent_source_channels
  order by sort_order, id;
end;
$$;

revoke all on function public.admin_list_talent_source_channels() from public, anon, authenticated;
grant execute on function public.admin_list_talent_source_channels() to authenticated;

drop trigger if exists trg_talent_source_channels_touch on public.talent_source_channels;
create trigger trg_talent_source_channels_touch
before update on public.talent_source_channels
for each row execute function public.touch_updated_at();

insert into public.talent_source_channels (id, name, status, sort_order)
values
  ('career_site', '外宣网站', 'active', 10),
  ('xiaomifeng', '小蜜蜂', 'active', 20),
  ('beiluo', '倍罗', 'active', 30),
  ('traditional_headhunter', '传统猎头', 'active', 40)
on conflict (id) do nothing;

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
end $$;

alter table public.talent_source_channels enable row level security;

drop policy if exists talent_source_channels_read on public.talent_source_channels;
create policy talent_source_channels_read on public.talent_source_channels
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

drop policy if exists talent_source_channels_manage_read on public.talent_source_channels;
drop policy if exists talent_source_channels_insert on public.talent_source_channels;
create policy talent_source_channels_insert on public.talent_source_channels
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

drop policy if exists talent_source_channels_update on public.talent_source_channels;
create policy talent_source_channels_update on public.talent_source_channels
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
  and public.talent_source_channel_key_exists(id)
);
