-- 0006: projects — the core entity.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete restrict,
  title text not null,
  description text,
  service text,

  status_id uuid not null,
  status_kind text not null generated always as ('project_status') stored,

  priority_id uuid not null,
  priority_kind text not null generated always as ('priority') stored,

  start_date date,
  due_date date,

  estimated_value numeric(14, 2) check (estimated_value is null or estimated_value >= 0),
  currency text not null default 'KES',

  notes text,
  custom_fields jsonb not null default '{}'::jsonb
    check (jsonb_typeof(custom_fields) = 'object'),

  lead_member_id uuid references public.team_members (id) on delete set null,
  is_draft boolean not null default false,

  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  check (start_date is null or due_date is null or start_date <= due_date),

  -- Kind-guard: status_id can only ever point at a project_status row,
  -- priority_id only at a priority row — enforced by Postgres itself,
  -- not by application discipline.
  foreign key (status_id, status_kind) references public.project_option_lists (id, kind),
  foreign key (priority_id, priority_kind) references public.project_option_lists (id, kind)
);

comment on table public.projects is 'Ongoing Projects — the core Studio module entity.';
comment on column public.projects.client_id is 'on delete restrict: a client with projects cannot be deleted out from under them.';
comment on column public.projects.custom_fields is 'Values for project_fields where system = false. Shape/type validation lives in the app data layer (see supabase/CUSTOM_FIELDS.md), not a Postgres function — kept lightweight per the approved architecture.';
comment on column public.projects.deleted_at is 'Soft delete. The UI''s "Delete Project" sets this rather than issuing a hard DELETE.';

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create index projects_client_id_idx on public.projects (client_id);
create index projects_status_id_idx on public.projects (status_id);
create index projects_priority_id_idx on public.projects (priority_id);
create index projects_due_date_idx on public.projects (due_date);
create index projects_deleted_at_null_idx on public.projects (id) where deleted_at is null;

alter table public.projects enable row level security;

-- SELECT/INSERT policies only — UPDATE/DELETE need project_members, which
-- doesn't exist until migration 0009. See 20260831000013_projects_and_milestones_rls.sql.

create policy projects_select on public.projects
  for select to authenticated
  using (public.is_internal_user());

create policy projects_insert on public.projects
  for insert to authenticated
  with check (public.is_internal_user());
