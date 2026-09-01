-- 0002: profiles — one row per Supabase Auth user (1:1 with auth.users).
--
-- Security-critical: a normal signup must NEVER be able to create an
-- admin. Profile rows are never inserted by the client at all — they are
-- created exclusively by the handle_new_user() trigger below, which
-- hard-codes permission_role = 'team_member' regardless of anything the
-- signing-up user sent. See supabase/BOOTSTRAP_ADMIN.md for how the
-- first real admin is created.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_color text,
  permission_role text not null default 'team_member'
    check (permission_role in ('admin', 'team_member')),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application identity for an authenticated user. Auth credentials stay in auth.users — never duplicated here.';
comment on column public.profiles.permission_role is
  'admin | team_member. Client-writable only by an existing admin — see policies + prevent_self_role_change trigger.';

-- ---------- helper functions used by RLS policies across every table ----------

create or replace function public.current_permission_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select permission_role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_permission_role() = 'admin';
$$;

create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_permission_role() is not null;
$$;

comment on function public.is_admin() is 'True if the current auth.uid() has a profiles row with permission_role = admin.';
comment on function public.is_internal_user() is 'True if the current auth.uid() has any profiles row at all (admin or team_member).';

-- ---------- auto-create a profile on signup (the ONLY way a profile is ever created) ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, permission_role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    'team_member'  -- hard-coded: signup metadata can NEVER set this to admin
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- prevent a user from promoting themselves ----------

create or replace function public.prevent_self_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.permission_role is distinct from old.permission_role and not public.is_admin() then
    raise exception 'Only an admin can change permission_role.';
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_self_role_change
  before update on public.profiles
  for each row execute function public.prevent_self_role_change();

-- ---------- RLS ----------

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- No INSERT policy: rows are created only by handle_new_user() (security definer, bypasses RLS).

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No UPDATE/DELETE for anon, no DELETE policy at all — profile lifecycle follows auth.users (cascade),
-- never a direct client delete.
