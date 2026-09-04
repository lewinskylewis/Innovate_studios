-- 0024: anon SELECT on project_comments — the client can read every
-- client-authored comment on the project (there's no client login to
-- scope "their own" any further than the project itself, matching this
-- app's whole no-client-auth model) plus every studio comment explicitly
-- published (visibility='client'). author_profile_id and
-- context_file_id are deliberately excluded from the anon grant — never
-- needed client-side (same "never grant more than the UI needs" pattern
-- as every other anon grant in this project).

create policy project_comments_select_anon on public.project_comments
  for select to anon
  using (
    project_id in (select id from public.projects where deleted_at is null)
    and (author_type = 'client' or visibility = 'client')
  );

grant select (id, project_id, author_display_name, author_type, content, visibility, created_at) on public.project_comments to anon;
