-- Innov8 Studios — Studio module database
-- 0001: extensions + shared helper functions/triggers used by every table below.

create extension if not exists pgcrypto;

-- Generic "touch updated_at on every UPDATE" trigger, reused by every
-- table below that has an updated_at column (projects, milestones, clients).
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Stamps updated_at = now() on every UPDATE. Attached per-table below.';
