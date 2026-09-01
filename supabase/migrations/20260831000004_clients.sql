-- 0004: clients — minimal, deliberately not a CRM. Establishes
-- one client -> many projects instead of the old denormalized
-- client_name/contact fields living directly on every project row.

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.clients is
  'Minimal client identity: one client -> many projects. No pipeline, no CRM fields, no portal — those are future modules.';

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

alter table public.clients enable row level security;

create policy clients_select on public.clients
  for select to authenticated
  using (public.is_internal_user());

create policy clients_insert on public.clients
  for insert to authenticated
  with check (public.is_internal_user());

create policy clients_update on public.clients
  for update to authenticated
  using (public.is_internal_user())
  with check (public.is_internal_user());

create policy clients_delete on public.clients
  for delete to authenticated
  using (public.is_admin());
