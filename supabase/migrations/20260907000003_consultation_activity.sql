-- consultation_activity — append-only system event log, same shape/
-- contract as project_activity/contact_activity: no client INSERT/
-- UPDATE/DELETE policy at all, written only via a SECURITY DEFINER
-- helper (log_consultation_activity), called by submit_consultation()
-- now and by future dashboard mutations (status/priority changes,
-- assignment, notes) once that admin panel ships.

create table public.consultation_activity (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations (id) on delete cascade,
  created_at timestamptz not null default now(),
  actor_id uuid references public.profiles (id) on delete set null,
  activity_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb
);

comment on table public.consultation_activity is
  'Append-only. No client INSERT/UPDATE/DELETE policy — every row comes from log_consultation_activity() (SECURITY DEFINER), matching project_activity/contact_activity.';

create index consultation_activity_consultation_id_idx on public.consultation_activity (consultation_id);
create index consultation_activity_created_at_idx on public.consultation_activity (created_at);

alter table public.consultation_activity enable row level security;

create policy consultation_activity_select on public.consultation_activity
  for select to authenticated
  using (public.is_internal_user());

revoke all on public.consultation_activity from anon;

create or replace function public.log_consultation_activity(
  p_consultation_id uuid,
  p_activity_type text,
  p_description text,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.consultation_activity (consultation_id, activity_type, actor_id, description, metadata)
  values (p_consultation_id, p_activity_type, auth.uid(), p_description, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.log_consultation_activity(uuid, text, text, jsonb) from public;
grant execute on function public.log_consultation_activity(uuid, text, text, jsonb) to authenticated;
