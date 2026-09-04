-- 0023: allow an anonymous Client View visitor to insert a comment as
-- author_type='client', scoped to a real, non-deleted project only.
-- No RPC/SECURITY DEFINER — same declarative-policy pattern as every
-- other anon grant in this project. Existing authenticated
-- project_comments_insert/_update/_delete policies (20260831000011) are
-- untouched — is_admin() or author_profile_id = auth.uid() on
-- update/delete already covers Studio moderating/deleting a
-- client-authored row (author_profile_id is null on those, so only the
-- is_admin() branch applies, which is sufficient).

revoke all on public.project_comments from anon;

create policy project_comments_insert_anon on public.project_comments
  for insert to anon
  with check (
    author_type = 'client'
    and author_profile_id is null
    and project_id in (select id from public.projects where deleted_at is null)
  );

grant insert (project_id, author_display_name, author_type, content) on public.project_comments to anon;
