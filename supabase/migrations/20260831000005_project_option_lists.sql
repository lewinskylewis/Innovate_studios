-- 0005: project_option_lists — the shared, user-editable Status / Priority /
-- Milestone-status labels. Deliberately NOT Postgres enums: the Studio UI
-- already lets a user add, delete, and recolor these labels in place, which
-- an enum can't do without a migration. One table with a `kind`
-- discriminator instead of three near-identical tables.

create table public.project_option_lists (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('project_status', 'priority', 'milestone_status')),
  label text not null,
  color text not null,
  sort_order integer not null default 0,
  unique (kind, label)
);

comment on table public.project_option_lists is
  'User-editable option lists for Status/Priority/Milestone-status. kind is a discriminator, referenced via a composite (id, kind) FK guard from projects/milestones so a milestone can never point at a project_status row.';

-- Composite unique key so other tables can FK to (id, kind) and the
-- database itself guarantees a column can only reference the right kind.
create unique index project_option_lists_id_kind_key on public.project_option_lists (id, kind);

alter table public.project_option_lists enable row level security;

create policy project_option_lists_select on public.project_option_lists
  for select to authenticated
  using (public.is_internal_user());

create policy project_option_lists_insert on public.project_option_lists
  for insert to authenticated
  with check (public.is_admin());

create policy project_option_lists_update on public.project_option_lists
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy project_option_lists_delete on public.project_option_lists
  for delete to authenticated
  using (public.is_admin());

-- ---------- required reference data ----------
-- Not "sample content" — the app cannot render a Status/Priority dropdown
-- without at least these rows. Mirrors the current PROJECT_STATUS_OPTIONS /
-- PRIORITY_OPTIONS / MILESTONE_STATUS_OPTIONS in studio-data.js exactly, so
-- the migrated UI shows identical labels and colors on day one.

insert into public.project_option_lists (kind, label, color, sort_order) values
  ('project_status', 'Planning',      '#a9a7a4', 0),
  ('project_status', 'Active',        '#3ddc84', 1),
  ('project_status', 'Under Review',  '#ffb54d', 2),
  ('project_status', 'Stuck',         '#ff5a5f', 3),
  ('project_status', 'Completed',     '#3ddc84', 4),
  ('project_status', 'Archived',      '#756e6a', 5),
  ('priority',       'Low',           '#a9a7a4', 0),
  ('priority',       'Normal',        '#4f8cff', 1),
  ('priority',       'High',          '#ffb54d', 2),
  ('priority',       'Urgent',        '#ff5a5f', 3),
  ('milestone_status', 'Not started', '#a9a7a4', 0),
  ('milestone_status', 'In progress', '#ffb54d', 1),
  ('milestone_status', 'Completed',   '#3ddc84', 2);
