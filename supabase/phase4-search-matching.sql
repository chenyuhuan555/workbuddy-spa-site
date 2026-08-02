-- Phase 4 code contract. This file is intentionally not executed automatically.
-- Run only after reviewing table/RLS state and enabling pg_trgm.
create extension if not exists pg_trgm;

create or replace function public.search_resumes(
  search_query text,
  result_limit integer default 50,
  result_offset integer default 0
)
returns table(
  candidate_id text,
  version_id text,
  file_name text,
  candidate_name text,
  snippet text,
  score real
)
language sql stable security invoker as $$
  select c.id, rv.id, rv.file_name, c.name,
         left(coalesce(rt.raw_text, ''), 500),
         similarity(coalesce(rt.raw_text, ''), search_query)
  from public.resume_texts rt
  join public.resume_versions rv on rv.id = rt.resume_version_id
  join public.candidates c on c.id = rv.candidate_id
  where c.workspace_id = 'main'
    and c.deleted_at is null
    and coalesce(rt.raw_text, '') % search_query
  order by similarity(coalesce(rt.raw_text, ''), search_query) desc, c.id
  limit greatest(1, least(result_limit, 100))
  offset greatest(result_offset, 0);
$$;

create or replace function public.match_candidates(
  position_id text,
  result_limit integer default 50,
  result_offset integer default 0
)
returns table(candidate_id text, candidate_name text, score real, reason text)
language sql stable security invoker as $$
  select c.id, c.name,
         similarity(
           coalesce(c.profile_text, '') || ' ' || coalesce(c.extra->>'structuredProfile', ''),
           coalesce(p.jd_text, '')
         ),
         'Phase 4 基础文本匹配；向量索引启用后由同名 RPC 替换实现'
  from public.candidates c
  join public.positions p on p.id = position_id
  where c.workspace_id = 'main'
    and c.deleted_at is null
    and p.deleted_at is null
  order by similarity(
    coalesce(c.profile_text, '') || ' ' || coalesce(c.extra->>'structuredProfile', ''),
    coalesce(p.jd_text, '')
  ) desc, c.id
  limit greatest(1, least(result_limit, 100))
  offset greatest(result_offset, 0);
$$;
