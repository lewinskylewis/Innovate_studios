-- 0014: Storage — one private bucket for project files.
--
-- Path convention: {project_id}/{file_id}_{filename}
-- Postgres (project_files) is the source of truth for metadata;
-- Storage only holds bytes. Never public — not even for
-- visibility = 'Client' files, since there is no real client
-- authentication yet to check against (see the audit's §10/§16).

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;

-- The path's first folder segment is the project id — used below to
-- check the same "am I internal, and does this project's row exist"
-- authorization the projects table itself enforces, via project_members
-- would be nice but Storage policies can't easily join through it cheaply
-- per-request beyond an internal-user check; project-level nuance stays
-- enforced by which projects/files a user can ever learn a storage_path
-- for in the first place (via project_files RLS).

create policy project_files_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'project-files' and public.is_internal_user());

create policy project_files_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'project-files' and public.is_internal_user());

-- Ownership is checked against project_files.uploaded_by (a column this
-- app controls and sets reliably on every insert) rather than
-- storage.objects.owner/owner_id — those are populated by the Storage
-- API itself and their behavior has changed across Supabase versions, so
-- relying on them here would be a silent, hard-to-notice authorization
-- gap. name = the object's full path, matching project_files.storage_path.

create policy project_files_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'project-files'
    and (
      public.is_admin()
      or exists (
        select 1 from public.project_files pf
        where pf.storage_path = storage.objects.name and pf.uploaded_by = auth.uid()
      )
    )
  )
  with check (bucket_id = 'project-files' and public.is_internal_user());

create policy project_files_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'project-files'
    and (
      public.is_admin()
      or exists (
        select 1 from public.project_files pf
        where pf.storage_path = storage.objects.name and pf.uploaded_by = auth.uid()
      )
    )
  );
