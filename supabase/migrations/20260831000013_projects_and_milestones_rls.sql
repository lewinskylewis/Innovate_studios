-- 0013: the projects/milestones UPDATE/DELETE policies deferred from
-- 0006 and 0008 — they need project_members and milestone_assignees,
-- which only exist as of migration 0009.

-- created_by = auth.uid() matters on its own, not just as a shorthand
-- for "is a project_members row": createProject() (studio-data.js) does
-- not add the creator to project_members, so without this clause a
-- team_member could create a project and then never be able to edit it
-- again — every field write after creation (including the very first
-- one, which clears is_draft) would be silently filtered to zero rows.
create policy projects_update on public.projects
  for update to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.project_members pm
      join public.team_members tm on tm.id = pm.team_member_id
      where pm.project_id = projects.id and tm.profile_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.project_members pm
      join public.team_members tm on tm.id = pm.team_member_id
      where pm.project_id = projects.id and tm.profile_id = auth.uid()
    )
  );

-- Hard delete stays admin-only and deliberate (rule 29) — the normal UI
-- flow is an UPDATE setting deleted_at, covered by projects_update above.
create policy projects_delete on public.projects
  for delete to authenticated
  using (public.is_admin());

create policy milestones_insert on public.milestones
  for insert to authenticated
  with check (
    public.is_admin()
    or exists (
      select 1 from public.project_members pm
      join public.team_members tm on tm.id = pm.team_member_id
      where pm.project_id = milestones.project_id and tm.profile_id = auth.uid()
    )
  );

create policy milestones_update on public.milestones
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.project_members pm
      join public.team_members tm on tm.id = pm.team_member_id
      where pm.project_id = milestones.project_id and tm.profile_id = auth.uid()
    )
    or exists (
      select 1 from public.milestone_assignees ma
      join public.team_members tm on tm.id = ma.team_member_id
      where ma.milestone_id = milestones.id and tm.profile_id = auth.uid()
    )
  )
  with check (public.is_internal_user());

create policy milestones_delete on public.milestones
  for delete to authenticated
  using (public.is_admin());
