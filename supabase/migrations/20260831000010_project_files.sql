-- 0010: project_files — metadata only. The binary lives in Supabase
-- Storage (bucket "project-files", see 20260831000014_storage.sql).

create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  storage_path text not null,
  original_filename text not null,
  category text not null default 'Working Files' check (
    category in ('Brief', 'References', 'Working Files', 'Drafts', 'Client Review', 'Final Deliverables')
  ),
  size_bytes bigint,
  visibility text not null default 'Internal' check (visibility in ('Internal', 'Client')),
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.project_files is
  'File metadata. storage_path points into the private project-files Storage bucket; Postgres never holds the binary.';

create index project_files_project_id_idx on public.project_files (project_id);

alter table public.project_files enable row level security;

create policy project_files_select on public.project_files
  for select to authenticated
  using (public.is_internal_user());

create policy project_files_insert on public.project_files
  for insert to authenticated
  with check (public.is_internal_user());

create policy project_files_update on public.project_files
  for update to authenticated
  using (public.is_admin() or uploaded_by = auth.uid())
  with check (public.is_admin() or uploaded_by = auth.uid());

create policy project_files_delete on public.project_files
  for delete to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());
