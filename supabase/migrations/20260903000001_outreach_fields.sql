-- 0017: Outreach fields — wires Marketing -> Outreach to the existing
-- Contact architecture (see 20260901000001_contacts_foundation.sql)
-- instead of creating a second CRM.
--
-- A Marketing "prospect" is nothing but a contacts row with
-- contact_type = 'Prospect'. Everything Outreach needs already exists
-- on that row except three small dimensions the frozen Outreach UI
-- renders that have no home yet:
--   - industry            (WHO we're targeting)
--   - channel              (HOW we're reaching them)
--   - outreach_status      (the 6-value status the Outreach table/badges
--                           already render — New/Contacted/Replied/
--                           Meeting Scheduled/Follow-up Due/Not Interested,
--                           taken verbatim from marketingMock.js's
--                           MKT_STATUS_META, not invented here)
--
-- Everything else Outreach needs is already covered by existing columns
-- and reused as-is, no schema change required:
--   - Service Interest      -> contacts.services[0] (same convention
--                              Relationships already uses for a
--                              Prospect's potentialService)
--   - Follow-up (date+note)  -> contacts.next_follow_up_date /
--                              follow_up_note
--   - Outreach Activity/history + the Prospect's initial notes paragraph
--     -> contact_notes, using the 'outreach' and 'note' values the type
--     check constraint already allows — no new table.
--
-- Deliberately NOT added: a second "prospects" table, a notes/activity
-- table duplicate, or a status column that duplicates contacts.status
-- (Active/Inactive is an activation state, unrelated to where a
-- Prospect is in the outreach pipeline).

alter table public.contacts
  add column industry text,
  add column channel text,
  add column outreach_status text not null default 'New'
    check (outreach_status in ('New', 'Contacted', 'Replied', 'Meeting Scheduled', 'Follow-up Due', 'Not Interested'));

comment on column public.contacts.outreach_status is
  'Prospect-only outreach pipeline status. Values match the existing (frozen) Outreach UI''s MKT_STATUS_META exactly. Unrelated to contacts.status (Active/Inactive activation state) and to lead_status (a Lead-only field).';
comment on column public.contacts.industry is
  'Freeform — which industry a Prospect/Lead/Client belongs to. Currently surfaced by the Outreach UI; not restricted to a fixed vocabulary, matching how services/tags are already freeform.';
comment on column public.contacts.channel is
  'Freeform — the outreach channel (Instagram, Email, LinkedIn, WhatsApp, Phone, ...) a Prospect was/is being reached on. Prospect-oriented, but not restricted to contact_type = Prospect at the schema level, same as industry.';
