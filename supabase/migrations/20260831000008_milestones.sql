-- 0008: milestones — child timeline items of a project.

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  due_date date,

  status_id uuid not null,
  status_kind text not null generated always as ('milestone_status') stored,

  priority_id uuid,
  priority_kind text generated always as ('priority') stored,

  client_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (status_id, status_kind) references public.project_option_lists (id, kind),
  foreign key (priority_id, priority_kind) references public.project_option_lists (id, kind)
);

comment on table public.milestones is
  'Belongs to exactly one project; cascade-deleted with it. priority_id reuses the SAME priority list as projects, matching the current UI.';

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

create index milestones_project_id_idx on public.milestones (project_id);
create index milestones_due_date_idx on public.milestones (due_date);

alter table public.milestones enable row level security;

-- SELECT only here — INSERT/UPDATE/DELETE need project_members/milestone_assignees,
-- which don't exist until migration 0009. See 20260831000013_projects_and_milestones_rls.sql.

create policy milestones_select on public.milestones
  for select to authenticated
  using (public.is_internal_user());
