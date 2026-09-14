-- consultation-files — private Storage bucket for /consultation form
-- uploads. Anon may INSERT (upload) only under the "uploads/" prefix;
-- anon has no SELECT/UPDATE/DELETE — a submitter can drop a file in but
-- can never read it back, list the bucket, or touch someone else's
-- upload. Staff (is_internal_user/is_admin) get full read/delete access.
--
-- Order of operations: the client uploads files to Storage BEFORE
-- calling submit_consultation() (it has no consultation id yet), using a
-- client-generated draftToken as a path prefix:
--   uploads/{draftToken}/{crypto.randomUUID()}_{filename}
-- On submit, submit_consultation() re-verifies each path actually exists
-- in storage.objects before trusting the client-supplied file metadata
-- into consultation_files — see 20260907000005.
--
-- Deliberately deferred: orphaned uploads from abandoned form sessions
-- are never cleaned up (no pg_cron sweep) — a documented follow-up, not
-- a blocker for this feature.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consultation-files', 'consultation-files', false, 20971520,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;

create policy consultation_files_storage_insert_anon on storage.objects
  for insert to anon
  with check (
    bucket_id = 'consultation-files'
    and (storage.foldername(name))[1] = 'uploads'
  );

create policy consultation_files_storage_select_staff on storage.objects
  for select to authenticated
  using (bucket_id = 'consultation-files' and public.is_internal_user());

create policy consultation_files_storage_delete_staff on storage.objects
  for delete to authenticated
  using (bucket_id = 'consultation-files' and public.is_admin());

-- Deliberately no update policy for anon or staff: uploads are
-- write-once (x-upsert: false) and only ever removed, never edited
-- in place.
