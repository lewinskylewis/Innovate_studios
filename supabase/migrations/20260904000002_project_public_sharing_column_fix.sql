-- 0019: Corrects a real gap in 20260904000001 — this Supabase project
-- (like every default Supabase project) already blanket-grants the
-- anon role SELECT/INSERT/UPDATE/REFERENCES on every column of every
-- public-schema table, relying entirely on RLS row policies for access
-- control. Column-level GRANTs are additive in Postgres, never
-- restrictive — the previous migration's narrow `grant select
-- (safe, columns) to anon` therefore changed nothing, since the
-- broader pre-existing grant already allowed every column. Verified
-- directly: an anon-key-only request for projects.notes/custom_fields/
-- estimated_value (never intentionally granted) came back populated.
--
-- Fix: REVOKE the pre-existing blanket anon grant first, on exactly
-- the tables the previous migration touched, then re-issue the same
-- narrow column grants so they actually take effect. Safe to do —
-- before 20260904000001, none of these tables had ANY anon SELECT RLS
-- policy, so anon got zero rows regardless of its column grants;
-- nothing currently relies on anon's blanket access to these tables.
-- authenticated is untouched — internal users' own access was never
-- column-grant-limited and doesn't need to be; RLS already scopes it
-- correctly via is_internal_user().

revoke all on public.projects from anon;
grant select (id, title, description, start_date, due_date, public_slug, client_id) on public.projects to anon;

revoke all on public.contacts from anon;
grant select (id, brand_name) on public.contacts to anon;

revoke all on public.milestones from anon;
grant select (id, project_id, title, description, due_date, status_id, client_visible) on public.milestones to anon;

revoke all on public.project_option_lists from anon;
grant select (id, kind, label, color, sort_order) on public.project_option_lists to anon;

revoke all on public.project_files from anon;
grant select (id, project_id, storage_path, original_filename, category, size_bytes, visibility, uploaded_by, created_at) on public.project_files to anon;

revoke all on public.profiles from anon;
grant select (id, full_name) on public.profiles to anon;

revoke all on public.project_activity from anon;
grant select (id, project_id, type, description, visibility, created_at) on public.project_activity to anon;

-- project_comments: no anon RLS policy was ever added (still true) —
-- revoking its blanket grant too, purely for defense in depth, since
-- RLS alone already returns zero rows for anon on this table.
revoke all on public.project_comments from anon;
