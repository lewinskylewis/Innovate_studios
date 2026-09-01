-- 0009: project_members + milestone_assignees — assignment junction
-- tables. Replaces the old array-of-ids-on-the-row approach entirely,
-- including the implicit "first array item is the lead" convention.

create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  is_lead boolean not null default false,
  added_at timestamptz not null default now(),
  primary key (project_id, team_member_id)
);

comment on table public.project_members is
  'Who is assigned to a project, and who leads it (is_lead) — replaces relying on array order.';

-- At most one lead per project.
create unique index project_members_one_lead_per_project
  on public.project_members (project_id)
  where is_lead;

create index project_members_project_id_idx on public.project_members (project_id);
create index project_members_team_member_id_idx on public.project_members (team_member_id);

create table public.milestone_assignees (
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  team_member_id uuid not null references public.team_members (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (milestone_id, team_member_id)
);

comment on table public.milestone_assignees is
  'Independent from project_members — a milestone can be assigned to different people than the project as a whole.';

create index milestone_assignees_milestone_id_idx on public.milestone_assignees (milestone_id);
create index milestone_assignees_team_member_id_idx on public.milestone_assignees (team_member_id);

alter table public.project_members enable row level security;
alter table public.milestone_assignees enable row level security;

create policy project_members_select on public.project_members
  for select to authenticated using (public.is_internal_user());
create policy project_members_insert on public.project_members
  for insert to authenticated with check (public.is_admin());
create policy project_members_update on public.project_members
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy project_members_delete on public.project_members
  for delete to authenticated using (public.is_admin());

create policy milestone_assignees_select on public.milestone_assignees
  for select to authenticated using (public.is_internal_user());
create policy milestone_assignees_insert on public.milestone_assignees
  for insert to authenticated with check (public.is_admin());
create policy milestone_assignees_update on public.milestone_assignees
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy milestone_assignees_delete on public.milestone_assignees
  for delete to authenticated using (public.is_admin());
