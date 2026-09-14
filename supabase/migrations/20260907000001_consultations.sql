-- consultations — the /consultation public intake form's own aggregate.
-- Distinct from `enquiries` (20260901000001_contacts_foundation.sql):
-- that table's status lifecycle and shape don't match a structured
-- multi-step consultation brief (budget/timeline/lead score/reference
-- number/attribution/files). contact_id is NOT NULL here — every
-- consultation submission resolves to (or creates) a contacts row
-- before the consultations row is ever inserted (see submit_consultation).
--
-- Public/anon access is exclusively through the submit_consultation()
-- SECURITY DEFINER RPC (see 20260907000005) — this table has zero anon
-- grants of its own.

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  contact_id uuid not null references public.contacts (id) on delete restrict,

  status text not null default 'New' check (status in (
    'New', 'Reviewing', 'Qualified', 'Consultation Scheduled',
    'Consultation Completed', 'Proposal', 'Won', 'Lost', 'Archived', 'Spam'
  )),
  priority text not null default 'Normal' check (priority in ('Low', 'Normal', 'High', 'Urgent')),
  lead_score int not null default 0 check (lead_score between 0 and 100),

  -- Step 1: About You — preserved as-submitted (same rationale as
  -- enquiries.person_name/email: a historical record of the brief, not
  -- a live view of the linked contact, which may later be edited by staff).
  full_name text not null,
  contact_email text not null,
  company text not null,
  role text,
  website text,
  preferred_contact text not null check (preferred_contact in ('Email', 'WhatsApp', 'Phone', 'Either')),
  whatsapp_number text,
  phone_number text,

  -- Step 2: The Project
  services text[] not null default '{}'::text[],
  other_service_detail text,
  brand_identity_subservices text[] not null default '{}'::text[],
  social_content_subservices text[] not null default '{}'::text[],
  three_d_cgi_subservices text[] not null default '{}'::text[],
  digital_experiences_subservices text[] not null default '{}'::text[],
  project_stage text,
  existing_assets text[] not null default '{}'::text[],

  -- Step 3: The Opportunity
  objective text not null,
  current_problem text,
  success_definition text,
  audience text[] not null default '{}'::text[],
  audience_other text,
  industry text,
  industry_other text,
  timeline text not null,
  budget text not null,
  engagement_type text not null,

  -- Step 4: Next Steps
  additional_context text,
  final_contact_preference text,
  consent_given_at timestamptz not null,

  -- Marketing attribution — captured automatically client-side, never
  -- asked of the visitor.
  source text,
  landing_page text,
  referral text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,

  -- Staff working fields (mirrors the contacts/enquiries follow-up pattern)
  owner_id uuid references public.team_members (id) on delete set null,
  internal_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.consultations is
  'One row per /consultation form submission. contact_id always resolves to a contacts row (contact_type = Prospect on first-time creation) via the submit_consultation() RPC. Public/anon access is exclusively through that SECURITY DEFINER function; this table has zero anon grants.';

create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

create index consultations_contact_id_idx on public.consultations (contact_id);
create index consultations_contact_email_idx on public.consultations (contact_email);
create index consultations_status_idx on public.consultations (status);
create index consultations_created_at_idx on public.consultations (created_at);
create index consultations_lead_score_idx on public.consultations (lead_score);
create index consultations_owner_id_idx on public.consultations (owner_id);

alter table public.consultations enable row level security;

create policy consultations_select on public.consultations
  for select to authenticated
  using (public.is_internal_user());

create policy consultations_insert on public.consultations
  for insert to authenticated
  with check (public.is_internal_user());

create policy consultations_update on public.consultations
  for update to authenticated
  using (public.is_internal_user())
  with check (public.is_internal_user());

create policy consultations_delete on public.consultations
  for delete to authenticated
  using (public.is_admin());

-- Explicit even though RLS + no anon policy already denies this by
-- default — documents the "anon only via RPC" contract at the grant
-- layer too, matching how the RPC itself never needs table grants
-- (SECURITY DEFINER runs as the owning role, which bypasses RLS).
revoke all on public.consultations from anon;
