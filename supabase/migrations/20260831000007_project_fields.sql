-- 0007: project_fields + project_field_options — metadata for every Ongoing
-- Projects column, built-in and user-added. Values live in
-- projects.custom_fields (jsonb); this table never stores values itself.

create table public.project_fields (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  type text not null check (
    type in ('text', 'number', 'money', 'date', 'select', 'person', 'checkbox', 'url', 'file', 'longtext')
  ),
  system boolean not null default false,
  is_multi boolean not null default false,
  currency text,
  sort_order integer not null default 0,
  width_px integer
);

comment on table public.project_fields is
  'Column metadata (order, width, type) for every built-in and user-added Ongoing Projects column. system = true columns cannot be deleted.';
comment on column public.project_fields.key is
  'Matches the jsonb key used in projects.custom_fields for non-system fields; matches the literal Project column (title, client, status...) for system fields.';

create table public.project_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.project_fields (id) on delete cascade,
  label text not null,
  color text not null,
  sort_order integer not null default 0,
  unique (field_id, label)
);

comment on table public.project_field_options is
  'Options for a user-added select-type custom column. status/priority/milestone-status use project_option_lists instead — this table is only for custom columns the user creates themselves.';

create index project_field_options_field_id_idx on public.project_field_options (field_id);

alter table public.project_fields enable row level security;
alter table public.project_field_options enable row level security;

create policy project_fields_select on public.project_fields
  for select to authenticated using (public.is_internal_user());
create policy project_fields_insert on public.project_fields
  for insert to authenticated with check (public.is_admin());
create policy project_fields_update on public.project_fields
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_fields_delete on public.project_fields
  for delete to authenticated using (public.is_admin() and not system);

create policy project_field_options_select on public.project_field_options
  for select to authenticated using (public.is_internal_user());
create policy project_field_options_insert on public.project_field_options
  for insert to authenticated with check (public.is_admin());
create policy project_field_options_update on public.project_field_options
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_field_options_delete on public.project_field_options
  for delete to authenticated using (public.is_admin());

-- ---------- the 8 system columns, matching FIELDS in studio-data.js exactly ----------

insert into public.project_fields (key, name, type, system, is_multi, currency, sort_order, width_px) values
  ('title',          'Project',    'text',   true, false, null,  0, 220),
  ('client',         'Brand',      'text',   true, false, null,  1, 140),
  ('assignee',       'Assignee',   'person', true, true,  null,  2, 170),
  ('startDate',      'Start Date', 'date',   true, false, null,  3, 130),
  ('deadline',       'Due Date',   'date',   true, false, null,  4, 130),
  ('priority',       'Priority',   'select', true, false, null,  5, 130),
  ('status',         'Status',     'select', true, false, null,  6, 150),
  ('estimatedValue', 'Budget',     'money',  true, false, 'KES', 7, 130);
