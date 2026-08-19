-- P0-3 管理员 / 顾问权限 RLS（第二层安全边界：Supabase RLS）
--
-- 前提与约定：
-- - 角色复用现有 profiles.role：admin=管理员；editor/member=顾问
--   （editor 保留既有可写能力，member 只读，不因本轮降级）；
-- - owner 是展示姓名（中文文本），ownerUserId 是稳定账号 id（auth uid）。
--   RLS 优先按 ownerUserId（candidates/applications 存于 extra->>'ownerUserId'），
--   旧数据 owner 为姓名时按 profiles.display_name 兼容匹配；
-- - 公司 / 岗位：全员共享可见；候选人 / 推进 / 简历 / 待办：按属主私有。
--
-- 执行顺序：在 candidates.sql / workbench-entities.sql / resume-versions.sql /
--           resume-texts.sql / user-todos.sql 之后执行本文件。
-- 本文件全部幂等，可重复执行。

-- ── 1. 稳定 helper（SECURITY DEFINER + 固定 search_path，避免 RLS recursion）──
create or replace function public.is_workbench_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.status = 'active' and p.role = 'admin'
  );
$$;

create or replace function public.current_member_display_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.display_name from public.profiles p
  where p.id = auth.uid() and p.status = 'active'
  limit 1;
$$;

-- ── 2. candidates：管理员全部；顾问仅自己（ownerUserId 优先，owner 姓名兼容）──
drop policy if exists candidates_read on public.candidates;
create policy candidates_read on public.candidates
  for select
  using (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  );

drop policy if exists candidates_update on public.candidates;
create policy candidates_update on public.candidates
  for update
  using (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  )
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  );

-- 新增：管理员任意；顾问（editor）创建的数据必须归属自己（ownerUserId = auth.uid()，
--       或兼容历史：ownerUserId 为空但 owner = 当前成员姓名）。禁止制造孤儿数据。
drop policy if exists candidates_insert on public.candidates;
create policy candidates_insert on public.candidates
  for insert
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (
          (extra ->> 'ownerUserId') is null
          and owner is not null and owner <> ''
          and owner = public.current_member_display_name()
        )
      )
    )
  );

-- 删除：仅管理员（保持原语义）
drop policy if exists candidates_delete on public.candidates;
create policy candidates_delete on public.candidates
  for delete
  using (public.is_workbench_admin());

-- ── 3. applications（workbench-entities.sql）：管理员全部；顾问按 effectiveOwner ──
-- effectiveOwner：application.owner/ownerUserId 优先，空则回退 candidate.owner/ownerUserId
drop policy if exists applications_read on public.applications;
create policy applications_read on public.applications
  for select
  using (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
        or (
          (owner is null or owner = '')
          and exists (
            select 1 from public.candidates c
            where c.id = applications.candidate_id
              and (
                (c.extra ->> 'ownerUserId') = auth.uid()::text
                or (c.extra ->> 'owner_id') = auth.uid()::text
                or (c.owner is not null and c.owner <> '' and c.owner = public.current_member_display_name())
              )
          )
        )
      )
    )
  );

drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update
  using (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
        or (
          (owner is null or owner = '')
          and exists (
            select 1 from public.candidates c
            where c.id = applications.candidate_id
              and (
                (c.extra ->> 'ownerUserId') = auth.uid()::text
                or (c.extra ->> 'owner_id') = auth.uid()::text
                or (c.owner is not null and c.owner <> '' and c.owner = public.current_member_display_name())
              )
          )
        )
      )
    )
  )
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  );

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (
          (extra ->> 'ownerUserId') is null
          and owner is not null and owner <> ''
          and owner = public.current_member_display_name()
        )
      )
    )
  );

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications
  for delete
  using (public.is_workbench_admin());

-- ── 4. positions：全员共享可见；编辑：管理员全部 / 顾问仅自己负责的 ──
--    无 owner 岗位：顾问只读（待管理员分配负责人），避免公共岗位被任意顾问修改
drop policy if exists positions_update on public.positions;
create policy positions_update on public.positions
  for update
  using (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  )
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (extra ->> 'owner_id') = auth.uid()::text
        or (owner is not null and owner <> '' and owner = public.current_member_display_name())
      )
    )
  );

-- 岗位创建：管理员任意；顾问（editor）创建的岗位必须归属自己
drop policy if exists positions_insert on public.positions;
create policy positions_insert on public.positions
  for insert
  with check (
    public.is_workbench_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'active' and p.role = 'editor')
      and (
        (extra ->> 'ownerUserId') = auth.uid()::text
        or (
          (extra ->> 'ownerUserId') is null
          and owner is not null and owner <> ''
          and owner = public.current_member_display_name()
        )
      )
    )
  );

-- 岗位删除：管理员（保持原语义）
drop policy if exists positions_delete on public.positions;
create policy positions_delete on public.positions
  for delete
  using (public.is_workbench_admin());

-- ── 5. companies：第一版顾问只读主信息，增删改仅管理员 ──
drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update
  using (public.is_workbench_admin())
  with check (public.is_workbench_admin());

drop policy if exists companies_delete on public.companies;
create policy companies_delete on public.companies
  for delete
  using (public.is_workbench_admin());

drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert
  with check (public.is_workbench_admin());

-- ── 6. user_todos：保留 own 私有策略，追加管理员只读全部 ──
--    注意：管理员只读他人 Todo（UPDATE/DELETE 仍按 user_id = auth.uid() 限制）
drop policy if exists user_todos_admin_read on public.user_todos;
create policy user_todos_admin_read on public.user_todos
  for select
  using (public.is_workbench_admin());

-- ── 7. resume_versions：跟随 candidate 权限 ──
drop policy if exists resume_versions_read on public.resume_versions;
create policy resume_versions_read on public.resume_versions
  for select
  using (
    public.is_workbench_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and exists (
          select 1 from public.candidates c
          where c.id = resume_versions.candidate_id
            and (
              (c.extra ->> 'ownerUserId') = auth.uid()::text
              or (c.extra ->> 'owner_id') = auth.uid()::text
              or (c.owner is not null and c.owner <> '' and c.owner = public.current_member_display_name())
            )
        )
    )
  );

-- ── 8. resume_texts：经 resume_versions → candidate 关联跟随权限 ──
drop policy if exists resume_texts_read on public.resume_texts;
create policy resume_texts_read on public.resume_texts
  for select
  using (
    public.is_workbench_admin()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
        and exists (
          select 1 from public.resume_versions rv
          join public.candidates c on c.id = rv.candidate_id
          where rv.id = resume_texts.resume_version_id
            and (
              (c.extra ->> 'ownerUserId') = auth.uid()::text
              or (c.extra ->> 'owner_id') = auth.uid()::text
              or (c.owner is not null and c.owner <> '' and c.owner = public.current_member_display_name())
            )
        )
    )
  );

-- ── 9. 简历原文件 Storage：路径 workspace/main/resumes/{candidateId}/{versionId}/{fileId} ──
--    顾问只能读取自己名下候选人的简历文件；管理员全部；路径含他人 candidateId → RLS 拒绝。
--    依赖：先执行 workbuddy-files-storage.sql 建桶；本策略替换其 workbuddy_resume_files_read。
drop policy if exists "workbuddy_resume_files_read" on storage.objects;
create policy "workbuddy_resume_files_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workbuddy-files'
  and (storage.foldername(name))[1] = 'workspace'
  and (storage.foldername(name))[2] = 'main'
  and (storage.foldername(name))[3] = 'resumes'
  and (
    public.is_workbench_admin()
    or exists (
      select 1 from public.candidates c
      where c.id = (storage.foldername(name))[4]
        and (
          (c.extra ->> 'ownerUserId') = auth.uid()::text
          or (c.extra ->> 'owner_id') = auth.uid()::text
          or (c.owner is not null and c.owner <> '' and c.owner = public.current_member_display_name())
        )
    )
  )
);

-- 说明：
-- 1. candidates / applications / positions 的 ownerUserId 存于 extra->>'ownerUserId'，
--    前端在保存时自动写入；旧数据为空时由 owner 姓名兼容匹配。
-- 2. 顾问 INSERT 已收紧：创建数据必须归属自己（ownerUserId = auth.uid()，
--    或 owner = 当前成员姓名且 ownerUserId 为空），不允许制造孤儿数据。
-- 3. positions 无 owner 时顾问只读，由管理员分配负责人。
-- 4. storage 简历文件按路径第 4 段 candidateId 关联候选人属主；UPDATE/DELETE 无策略
--    （原件不可覆盖 / 历史文件不可由前端删除）。
-- 5. 本文件不改动：positions_read / companies_read（全员共享可读，维持原策略）。
