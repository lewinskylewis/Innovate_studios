-- 0003: team_members — the studio staff directory used for assignment.
-- Deliberately separate from profiles: today only one person needs a real
-- login, but every team member needs to be assignable to work.

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  job_title text,
  profile_id uuid references public.profiles (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.team_members is
  'Studio staff directory for assignment. job_title is a display label ("Art Director"), never a permission — see profiles.permission_role.';
comment on column public.team_members.profile_id is
  'Nullable — most team members have no login yet. Filling this in later upgrades them to a real account with zero schema change.';

create unique index team_members_profile_id_key on public.team_members (profile_id) where profile_id is not null;

alter table public.team_members enable row level security;

create policy team_members_select on public.team_members
  for select to authenticated
  using (public.is_internal_user());

create policy team_members_insert on public.team_members
  for insert to authenticated
  with check (public.is_admin());

create policy team_members_update on public.team_members
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy team_members_delete on public.team_members
  for delete to authenticated
  using (public.is_admin());
