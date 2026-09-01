-- 0016: Contacts foundation — the canonical identity table for the
-- Relationships module, plus Enquiries and Campaigns as their own
-- aggregates that reference it.
--
-- ARCHITECTURE (approved):
--   Relationships is a MODULE NAME, not an entity. Every person/company
--   stored in it is a Contact. contacts.contact_type classifies a
--   Contact as Prospect/Lead/Client/Partner — there is deliberately NO
--   'Contact' value; NULL means "exists, not yet classified". A Client
--   is simply a Contact where contact_type = 'Client'. Studio projects
--   keep referencing that same row via the existing projects.client_id
--   column (name unchanged — its meaning, "the Contact who is the
--   Client for this project", is still correct).
--
-- This migration renames the existing `clients` table in place — same
-- id column, same rows, same primary key — there is no second identity
-- table and no data copy. Verified before writing this file (see the
-- audit): exactly one FK references clients (projects.client_id,
-- restrict), one trigger (clients_set_updated_at), four RLS policies,
-- one index (the PK), no views, no function body mentions `clients`.
-- All of those survive a table rename automatically in Postgres (they
-- are tracked by OID, not by parsed name) — the ALTER POLICY/TRIGGER/
-- CONSTRAINT renames below are purely cosmetic, so `\d contacts` reads
-- cleanly instead of showing clients_* names on a table called
-- contacts.
--
-- Scope: this migration touches ONLY the objects listed below. It does
-- not add any trigger to `projects` or `milestones` — contact_activity
-- intentionally supports 'project_started'/'project_completed' as
-- valid future event types, but nothing populates them yet. Wiring
-- that requires a trigger on the existing Studio `projects` table,
-- which is out of scope for a migration that must not touch unrelated
-- Studio tables — see the deviation note in the report accompanying
-- this file.

-- ============================================================
-- 1. RENAME clients -> contacts (identity, not a new table)
-- ============================================================

alter table public.clients rename to contacts;
alter table public.contacts rename column name to brand_name;
alter table public.contacts rename column contact_name to person_name;

-- Cosmetic only — every one of these survives the rename regardless;
-- renamed so the table's dependent objects don't still read "clients_*".
alter table public.contacts rename constraint clients_pkey to contacts_pkey;
alter trigger clients_set_updated_at on public.contacts rename to contacts_set_updated_at;
alter policy clients_select on public.contacts rename to contacts_select;
alter policy clients_insert on public.contacts rename to contacts_insert;
alter policy clients_update on public.contacts rename to contacts_update;
alter policy clients_delete on public.contacts rename to contacts_delete;

comment on table public.contacts is
  'Canonical identity for the Relationships module. Every Contact, regardless of classification, is one row here — never a separate table per classification. contact_type + status carry the classification/lifecycle state; the row itself never gets duplicated as it moves through the funnel.';

-- ============================================================
-- 2. Extend contacts with the fields the existing (frozen)
--    Relationships UI already renders and edits.
-- ============================================================

alter table public.contacts
  add column role text,
  add column website text,
  add column location text,
  add column social text,

  add column contact_type text
    check (contact_type in ('Prospect', 'Lead', 'Client', 'Partner')),
  add column status text not null default 'Active'
    check (status in ('Active', 'Inactive')),
  add column source text,
  add column origin_campaign text,
  add column owner_id uuid references public.team_members (id) on delete set null,
  add column tags text[] not null default '{}'::text[],
  add column services text[] not null default '{}'::text[],

  add column next_follow_up_date date,
  add column follow_up_note text,

  -- Lead + Prospect
  add column priority text
    check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  -- Lead only
  add column opportunity text,
  add column lead_status text
    check (lead_status in ('New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost')),
  add column estimated_value numeric(14, 2) check (estimated_value is null or estimated_value >= 0),
  -- Prospect only
  add column interest_level text
    check (interest_level in ('Low', 'Medium', 'High')),
  -- Client only
  add column client_health text
    check (client_health in ('Healthy', 'At Risk', 'Inactive')),
  add column client_since date,
  -- Partner only
  add column partner_type text
    check (partner_type in ('Creative', 'Production', 'Technology', 'Referral', 'Agency', 'Supplier', 'Strategic'));

comment on column public.contacts.contact_type is
  'Prospect | Lead | Client | Partner, or NULL. NULL means the Contact exists but has not been classified/qualified yet — this is the "just a Contact" state, deliberately not its own enum value (see module architecture notes).';
comment on column public.contacts.status is
  'Active | Inactive — an activation state independent of contact_type. A NULL-contact_type row can be Inactive; a Client can be Inactive. Never confuse this with contact_type.';
comment on column public.contacts.origin_campaign is
  'Freeform display label for the campaign/outreach this Contact originated from. Not an FK to campaigns — the current UI captures this as a name, not a picked campaign record.';

create index contacts_contact_type_idx on public.contacts (contact_type);
create index contacts_status_idx on public.contacts (status);
create index contacts_owner_id_idx on public.contacts (owner_id);
create index contacts_email_idx on public.contacts (email);

-- Deliberately NO unique constraint on email or brand_name. Two people
-- can share an email through a shared inbox; two different companies
-- can share a name. Duplicate prevention is a UI search/select
-- concern (Studio's Client picker), not a database constraint.

-- ============================================================
-- 3. contact_notes — manually logged notes + interaction log.
--    One structure for both concepts (see module architecture notes),
--    client-writable exactly like project_comments.
-- ============================================================

create table public.contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  type text not null default 'note'
    check (type in ('note', 'email', 'call', 'meeting', 'message', 'enquiry', 'outreach', 'other')),
  content text not null,
  created_at timestamptz not null default now()
);

comment on table public.contact_notes is
  'Manually logged notes AND the interaction log (Email/Call/Meeting/...) for a Contact — one structure, type-discriminated, not separate tables. Client-writable, unlike contact_activity.';

create index contact_notes_contact_id_idx on public.contact_notes (contact_id);

alter table public.contact_notes enable row level security;

create policy contact_notes_select on public.contact_notes
  for select to authenticated
  using (public.is_internal_user());

create policy contact_notes_insert on public.contact_notes
  for insert to authenticated
  with check (public.is_internal_user() and author_profile_id = auth.uid());

create policy contact_notes_update on public.contact_notes
  for update to authenticated
  using (public.is_admin() or author_profile_id = auth.uid())
  with check (public.is_admin() or author_profile_id = auth.uid());

create policy contact_notes_delete on public.contact_notes
  for delete to authenticated
  using (public.is_admin() or author_profile_id = auth.uid());

-- ============================================================
-- 4. contact_activity — append-only system event log.
--    Same proven shape as project_activity: SECURITY DEFINER helper,
--    no client INSERT/UPDATE/DELETE policy at all, triggers only.
-- ============================================================

create table public.contact_activity (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  type text not null check (
    type in ('created', 'classification_change', 'status_change', 'converted', 'project_started', 'project_completed', 'followup')
  ),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

comment on table public.contact_activity is
  'Append-only. No client INSERT/UPDATE/DELETE policy exists — every row comes from a SECURITY DEFINER trigger function, matching project_activity. project_started/project_completed are valid values with no producer yet (would require a trigger on the existing Studio projects table — out of scope for this migration; see report).';

create index contact_activity_contact_id_idx on public.contact_activity (contact_id);

alter table public.contact_activity enable row level security;

create policy contact_activity_select on public.contact_activity
  for select to authenticated
  using (public.is_internal_user());

create or replace function public.log_contact_activity(
  p_contact_id uuid,
  p_type text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contact_activity (contact_id, type, actor_profile_id, description)
  values (p_contact_id, p_type, auth.uid(), p_description);
end;
$$;

create or replace function public.trg_contact_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_contact_activity(new.id, 'created', 'Contact created');
  return new;
end;
$$;

create trigger contact_activity_on_created
  after insert on public.contacts
  for each row execute function public.trg_contact_created();

create or replace function public.trg_contact_updated()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.contact_type is distinct from old.contact_type then
    perform public.log_contact_activity(new.id, 'classification_change', 'Classified as ' || coalesce(new.contact_type, 'unclassified Contact'));
  end if;
  if new.status is distinct from old.status then
    perform public.log_contact_activity(new.id, 'status_change', 'Status changed to ' || new.status);
  end if;
  if new.next_follow_up_date is distinct from old.next_follow_up_date then
    perform public.log_contact_activity(
      new.id,
      'followup',
      case when new.next_follow_up_date is not null then 'Follow-up scheduled for ' || new.next_follow_up_date else 'Follow-up cleared' end
    );
  end if;
  return new;
end;
$$;

create trigger contact_activity_on_updated
  after update on public.contacts
  for each row execute function public.trg_contact_updated();

-- ============================================================
-- 5. enquiries — its own aggregate. An Enquiry is NOT a Contact;
--    contact_id is nullable (an enquiry can arrive from someone/some
--    company not yet in Contacts) and never forces a second identity
--    record — resolving/creating the Contact is an application-layer
--    decision made in the next phase, not something this schema
--    should decide unilaterally.
-- ============================================================

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references public.contacts (id) on delete set null,

  -- Enquiry-specific submitted information. Preserved as-submitted
  -- even after contact_id is set and even if the Contact's own fields
  -- later change — an enquiry is a historical record of what was
  -- actually asked, not a live view of the Contact.
  person_name text not null,
  brand_name text,
  email text,
  phone text,
  location text,
  message text,
  services text[] not null default '{}'::text[],
  source text not null,

  status text not null default 'New'
    check (status in ('New', 'Contacted', 'Qualifying', 'Qualified', 'Converted', 'Closed')),
  priority text not null default 'Normal'
    check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  owner_id uuid references public.team_members (id) on delete set null,

  estimated_value numeric(14, 2) check (estimated_value is null or estimated_value >= 0),
  desired_timeline text,
  qualification_notes text,

  next_follow_up_date date,
  follow_up_note text,

  origin_campaign text,
  converted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.enquiries is
  'Incoming business opportunities/requests — the intake funnel. contact_id is nullable: an unresolved enquiry has no Contact yet. Resolving it to an existing Contact or creating a new one is an application-layer decision (next phase), never automatic identity creation from this table alone.';
comment on column public.enquiries.contact_id is
  'Nullable. Set once the enquiry is matched to an existing Contact or a new one is deliberately created for it. Never a second identity — always points at contacts.id.';

create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

create index enquiries_contact_id_idx on public.enquiries (contact_id);
create index enquiries_status_idx on public.enquiries (status);
create index enquiries_created_at_idx on public.enquiries (created_at);

alter table public.enquiries enable row level security;

create policy enquiries_select on public.enquiries
  for select to authenticated
  using (public.is_internal_user());

create policy enquiries_insert on public.enquiries
  for insert to authenticated
  with check (public.is_internal_user());

create policy enquiries_update on public.enquiries
  for update to authenticated
  using (public.is_internal_user())
  with check (public.is_internal_user());

create policy enquiries_delete on public.enquiries
  for delete to authenticated
  using (public.is_admin());

-- ============================================================
-- 6. enquiry_notes — same shape/purpose as contact_notes.
-- ============================================================

create table public.enquiry_notes (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  author_profile_id uuid references public.profiles (id) on delete set null,
  type text not null default 'note'
    check (type in ('note', 'email', 'call', 'meeting', 'message', 'enquiry', 'outreach', 'other')),
  content text not null,
  created_at timestamptz not null default now()
);

comment on table public.enquiry_notes is
  'Manually logged notes/interactions for an Enquiry, same pattern as contact_notes.';

create index enquiry_notes_enquiry_id_idx on public.enquiry_notes (enquiry_id);

alter table public.enquiry_notes enable row level security;

create policy enquiry_notes_select on public.enquiry_notes
  for select to authenticated
  using (public.is_internal_user());

create policy enquiry_notes_insert on public.enquiry_notes
  for insert to authenticated
  with check (public.is_internal_user() and author_profile_id = auth.uid());

create policy enquiry_notes_update on public.enquiry_notes
  for update to authenticated
  using (public.is_admin() or author_profile_id = auth.uid())
  with check (public.is_admin() or author_profile_id = auth.uid());

create policy enquiry_notes_delete on public.enquiry_notes
  for delete to authenticated
  using (public.is_admin() or author_profile_id = auth.uid());

-- ============================================================
-- 7. enquiry_activity — append-only, same shape as contact_activity.
--    Also the one place this migration links Enquiries -> Contacts
--    activity: when an enquiry's contact_id is newly set, that's
--    logged on the Contact's own timeline too (both tables already
--    exist in this same migration — not a dependency on any
--    unrelated/external table).
-- ============================================================

create table public.enquiry_activity (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.enquiries (id) on delete cascade,
  type text not null check (
    type in ('received', 'contacted', 'qualifying', 'qualified', 'converted', 'closed', 'followup')
  ),
  actor_profile_id uuid references public.profiles (id) on delete set null,
  description text not null,
  created_at timestamptz not null default now()
);

comment on table public.enquiry_activity is
  'Append-only. No client INSERT/UPDATE/DELETE policy — trigger-generated only, matching project_activity/contact_activity.';

create index enquiry_activity_enquiry_id_idx on public.enquiry_activity (enquiry_id);

alter table public.enquiry_activity enable row level security;

create policy enquiry_activity_select on public.enquiry_activity
  for select to authenticated
  using (public.is_internal_user());

create or replace function public.log_enquiry_activity(
  p_enquiry_id uuid,
  p_type text,
  p_description text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.enquiry_activity (enquiry_id, type, actor_profile_id, description)
  values (p_enquiry_id, p_type, auth.uid(), p_description);
end;
$$;

create or replace function public.trg_enquiry_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.log_enquiry_activity(new.id, 'received', 'Enquiry received via ' || new.source);
  return new;
end;
$$;

create trigger enquiry_activity_on_created
  after insert on public.enquiries
  for each row execute function public.trg_enquiry_created();

create or replace function public.trg_enquiry_updated()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_status_type text;
begin
  if new.status is distinct from old.status then
    v_status_type := case new.status
      when 'Contacted' then 'contacted'
      when 'Qualifying' then 'qualifying'
      when 'Qualified' then 'qualified'
      when 'Converted' then 'converted'
      when 'Closed' then 'closed'
      else null
    end;
    if v_status_type is not null then
      perform public.log_enquiry_activity(new.id, v_status_type, 'Status changed to ' || new.status);
    end if;
  end if;

  if new.next_follow_up_date is distinct from old.next_follow_up_date then
    perform public.log_enquiry_activity(
      new.id,
      'followup',
      case when new.next_follow_up_date is not null then 'Follow-up scheduled for ' || new.next_follow_up_date else 'Follow-up cleared' end
    );
  end if;

  if new.contact_id is distinct from old.contact_id and new.contact_id is not null then
    perform public.log_enquiry_activity(new.id, 'converted', 'Linked to Contact');
    perform public.log_contact_activity(new.contact_id, 'converted', 'Converted from an Enquiry');
  end if;

  return new;
end;
$$;

create trigger enquiry_activity_on_updated
  after update on public.enquiries
  for each row execute function public.trg_enquiry_updated();

-- ============================================================
-- 8. campaigns — Innov8's own marketing campaigns. Identity/metadata
--    only; performance analytics (reach/impressions/funnel/assets)
--    stays mock — there is no real ad-platform data source yet, and a
--    table for numbers nobody is actually computing would be
--    speculative, not foundation.
-- ============================================================

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text,
  description text,
  service text,
  status text not null default 'Draft'
    check (status in ('Draft', 'Active', 'Paused', 'Completed')),
  target_audience text,
  platforms text[] not null default '{}'::text[],
  start_date date,
  end_date date,
  budget numeric(14, 2) check (budget is null or budget >= 0),
  cta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (start_date is null or end_date is null or start_date <= end_date)
);

comment on table public.campaigns is
  'Innov8''s own marketing campaigns (identity/metadata only). Performance analytics is deliberately not modeled here yet — no real data source exists for it.';

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

create policy campaigns_select on public.campaigns
  for select to authenticated
  using (public.is_internal_user());

create policy campaigns_insert on public.campaigns
  for insert to authenticated
  with check (public.is_internal_user());

create policy campaigns_update on public.campaigns
  for update to authenticated
  using (public.is_internal_user())
  with check (public.is_internal_user());

create policy campaigns_delete on public.campaigns
  for delete to authenticated
  using (public.is_admin());
