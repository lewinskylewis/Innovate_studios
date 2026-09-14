-- consultation_files — metadata only, same pattern as project_files. The
-- binary lives in the private "consultation-files" Storage bucket (see
-- 20260907000004_consultation_storage.sql). Rows are inserted exclusively
-- by submit_consultation() (SECURITY DEFINER) after verifying the object
-- actually exists in Storage — never directly by anon.

create table public.consultation_files (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  uploaded_by uuid references public.profiles (id) on delete set null
);

comment on table public.consultation_files is
  'File metadata for a consultation submission. storage_path points into the private consultation-files bucket. Populated only by submit_consultation() — no anon insert policy exists on this table; the anon-facing write happens at the Storage layer (see consultation_storage.sql), and this table is only ever written by the SECURITY DEFINER RPC after verifying the object exists.';

create index consultation_files_consultation_id_idx on public.consultation_files (consultation_id);

alter table public.consultation_files enable row level security;

create policy consultation_files_select on public.consultation_files
  for select to authenticated
  using (public.is_internal_user());

create policy consultation_files_delete on public.consultation_files
  for delete to authenticated
  using (public.is_admin());

revoke all on public.consultation_files from anon;
