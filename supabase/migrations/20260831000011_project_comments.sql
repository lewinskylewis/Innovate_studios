-- 0011: project_comments — client and studio feedback per project.
-- v1 only ever writes author_type = 'studio' (real authenticated users) —
-- there is no client authentication yet, so no client comment can be
-- created by anyone other than an admin backfilling history if needed.

create table public.project_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  author_display_name text not null,
  author_type text not null default 'studio' check (author_type in ('studio', 'client')),
  content text not null,
  context_file_id uuid references public.project_files (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.project_comments is
  'author_profile_id is nullable to allow a future client_type row with no login; author_display_name is always set so the UI never shows a blank author.';
comment on column public.project_comments.context_file_id is
  'Real FK to project_files, replacing the old loose filename string.';

create index project_comments_project_id_idx on public.project_comments (project_id);

alter table public.project_comments enable row level security;

create policy project_comments_select on public.project_comments
  for select to authenticated
  using (public.is_internal_user());

create policy project_comments_insert on public.project_comments
  for insert to authenticated
  with check (public.is_internal_user() and author_type = 'studio' and author_profile_id = auth.uid());

create policy project_comments_update on public.project_comments
  for update to authenticated
  using (public.is_admin() or author_profile_id = auth.uid())
  with check (public.is_admin() or author_profile_id = auth.uid());

create policy project_comments_delete on public.project_comments
  for delete to authenticated
  using (public.is_admin() or author_profile_id = auth.uid());
