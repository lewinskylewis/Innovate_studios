-- 0025: per-user Studio table view preferences (column visibility +
-- order). No such preference-persistence table exists anywhere in this
-- project yet — the codebase's only prior precedent for "remember this
-- across reloads" is browser localStorage (Sidebar.jsx, useStoredTab.js),
-- which is per-browser, not per-account. This needs to be per-account
-- ("different users can have independent table preferences"), so it's a
-- real Supabase table, RLS-scoped to the owning profile, following the
-- same authenticated + is_internal_user() pattern as every other table
-- in this schema.
--
-- table_key exists so this can cover more than just the Ongoing
-- Projects table later (e.g. a future Enquiries/Relationships table
-- view) without a new table — 'projects' is the only value used today.
--
-- hidden_field_keys / column_order store project_fields.key values
-- (the stable, human-meaningful field id already used everywhere in the
-- frontend as field.id), not project_fields.id — so a field that's
-- later deleted just leaves a harmless orphaned key in these arrays,
-- and the frontend already has to reconcile "keys not present in the
-- current field list" regardless (a brand-new field with no saved
-- preference yet).

create table public.studio_table_preferences (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  table_key text not null default 'projects',
  hidden_field_keys text[] not null default '{}',
  column_order text[] not null default '{}',
  updated_at timestamptz not null default now(),
  unique (profile_id, table_key)
);

comment on table public.studio_table_preferences is
  'Per-user, per-table column visibility + order. Own-row-only — nobody, not even an admin, reads or writes another profile''s preferences; this is personal view state, not shared configuration.';

alter table public.studio_table_preferences enable row level security;

create policy studio_table_preferences_select on public.studio_table_preferences
  for select to authenticated using (profile_id = auth.uid());
create policy studio_table_preferences_insert on public.studio_table_preferences
  for insert to authenticated with check (profile_id = auth.uid());
create policy studio_table_preferences_update on public.studio_table_preferences
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy studio_table_preferences_delete on public.studio_table_preferences
  for delete to authenticated using (profile_id = auth.uid());
