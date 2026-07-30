-- WorkBuddy 原始简历私有存储。
-- 在 Supabase SQL Editor 中执行一次；重复执行会更新桶配置并重建策略。

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'workbuddy-files',
  'workbuddy-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "workbuddy_resume_files_read" on storage.objects;
drop policy if exists "workbuddy_resume_files_insert" on storage.objects;

create policy "workbuddy_resume_files_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'workbuddy-files'
  and (storage.foldername(name))[1] = 'workspace'
  and (storage.foldername(name))[2] = 'main'
  and (storage.foldername(name))[3] = 'resumes'
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.status = 'active'
  )
);

create policy "workbuddy_resume_files_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'workbuddy-files'
  and (storage.foldername(name))[1] = 'workspace'
  and (storage.foldername(name))[2] = 'main'
  and (storage.foldername(name))[3] = 'resumes'
  and exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.status = 'active'
      and profile.role in ('admin', 'editor')
  )
);

-- 故意不创建 UPDATE / DELETE 策略：原件路径不可覆盖，历史文件不可由前端删除。
