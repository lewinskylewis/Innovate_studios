-- 0020: Second correction to 20260904000001/2. Every dependent anon
-- policy (contacts, milestones, project_option_lists-independent ones
-- are fine, project_files, project_activity, storage.objects) filters
-- its subquery on `projects.deleted_at is null` — and unlike a policy's
-- own self-referential `using` clause (projects_select_anon's `using
-- (deleted_at is null)` works fine without this), a subquery that
-- queries a *different* table (e.g. contacts_select_anon selecting
-- from projects) runs under the querying role's real column
-- privileges. deleted_at was never granted, so every one of those
-- subqueries failed with "permission denied for table projects" —
-- verified directly via anon-key-only requests.

grant select (deleted_at) on public.projects to anon;
