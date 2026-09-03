/*
 * Innov8 Studios — Marketing "Outreach" data layer, mirroring src/data/
 * relationships.js's conventions exactly: requireClient(), the same
 * mutate() safety net, and a pure mapProspectRow() that translates the
 * real public.contacts / contact_notes schema (see supabase/migrations/
 * 20260901000001_contacts_foundation.sql and
 * 20260903000001_outreach_fields.sql) into the exact object shape the
 * existing (frozen) Outreach UI already expects — see the old
 * marketingMock.js MKT_PROSPECTS record shape, matched field-for-field
 * so Outreach.jsx / ProspectDetail.jsx / NewProspectModal.jsx /
 * OutreachActivityModal.jsx need zero changes.
 *
 * A "prospect" is not a second entity — it's contacts.id where
 * contact_type = 'Prospect'. Add Prospect always creates a new Contact
 * row: the frozen Add Prospect form collects no email/phone and has no
 * existing-Contact picker, so there is no reliable, non-fuzzy signal to
 * match against (unlike Enquiry conversion, which can safely match on
 * exact email — see convertEnquiry() in data/enquiries.js). This
 * mirrors Relationships' own NewRelationshipModal, which also always
 * inserts a new Contact for the same reason.
 *
 * "Outreach history" / the Log Outreach Activity feature reuse
 * contact_notes with type = 'outreach' (already a value the type check
 * constraint allows, and already the value INTERACTION_TYPE_TO_DB uses
 * for "Outreach" elsewhere) — not a new activity table. A Prospect's
 * single freeform "notes" paragraph (set once, at creation, from the
 * Add Prospect form — the frozen UI never edits it afterwards) is the
 * oldest contact_notes row of type = 'note' for that contact.
 */
import { supabase } from "../lib/supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

/* Same safety net as relationships.js / enquiries.js: an RLS-filtered
   UPDATE reports success with zero rows instead of an error — route
   every mutation through this so a permission failure (or "no longer
   exists") always throws instead of silently no-opping. */
async function mutate(query, actionDescription) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`You don't have permission to ${actionDescription}, or it no longer exists.`);
  }
  return data;
}

function mapProspectRow(row, ctx) {
  const notes = ctx.notesByContact.get(row.id) || [];
  const noteEntry = notes.find((n) => n.type === "note");
  const history = notes.filter((n) => n.type === "outreach").map((n) => ({ date: n.created_at, label: n.content }));
  const lastContact = history.length ? history[history.length - 1].date : null;

  return {
    id: row.id,
    business: row.brand_name,
    industry: row.industry || "",
    serviceInterest: (row.services || [])[0] || "",
    channel: row.channel || "",
    status: row.outreach_status || "New",
    contact: { name: row.person_name || "", role: row.role || "" },
    email: row.email || "",
    phone: row.phone || "",
    lastContact,
    nextFollowUp: row.next_follow_up_date,
    notes: noteEntry?.content || "",
    history
  };
}

/* ---------- load ---------- */

export async function loadOutreachData() {
  const client = requireClient();

  const [prospectsRes, notesRes, leadsRes] = await Promise.all([
    client.from("contacts").select("*").eq("contact_type", "Prospect").order("created_at", { ascending: false }),
    client.from("contact_notes").select("contact_id, type, content, created_at").in("type", ["note", "outreach"]).order("created_at", { ascending: true }),
    // Leads Generated / Active Opportunities on Overview read the Leads
    // pipeline directly (same contacts table, no Relationships module
    // code touched) — real counts, not something Outreach itself tracks.
    client.from("contacts").select("lead_status").eq("contact_type", "Lead")
  ]);
  for (const res of [prospectsRes, notesRes, leadsRes]) if (res.error) throw res.error;

  const notesByContact = new Map();
  for (const n of notesRes.data || []) {
    const list = notesByContact.get(n.contact_id) || [];
    list.push(n);
    notesByContact.set(n.contact_id, list);
  }

  const ctx = { notesByContact };
  const prospects = (prospectsRes.data || []).map((row) => mapProspectRow(row, ctx));

  const leadRows = leadsRes.data || [];
  const leadsGenerated = leadRows.length;
  const activeOpportunities = leadRows.filter((l) => !["Won", "Lost"].includes(l.lead_status)).length;

  return { prospects, leadsGenerated, activeOpportunities };
}

/* ---------- create ---------- */

export async function addProspect(input, { authorProfileId }) {
  const client = requireClient();
  const id = input.id || crypto.randomUUID();
  const payload = {
    id,
    brand_name: (input.business || "Untitled Prospect").trim(),
    person_name: input.contact || null,
    contact_type: "Prospect",
    status: "Active",
    industry: input.industry || null,
    channel: input.channel || null,
    outreach_status: "New",
    services: input.serviceInterest ? [input.serviceInterest] : [],
    next_follow_up_date: input.nextFollowUp || null,
    source: "Outreach"
  };
  await mutate(client.from("contacts").insert(payload), "create that prospect");

  if (input.notes && input.notes.trim()) {
    const { error } = await client.from("contact_notes").insert({ contact_id: id, author_profile_id: authorProfileId, type: "note", content: input.notes.trim() });
    if (error) throw error;
  }

  return id;
}

/* ---------- outreach activity ---------- */

/* Log Outreach Activity — always appends a touchpoint. Also bumps New
   -> Contacted, matching the exact behavior the old in-memory
   logOutreachActivity() had (see the removed useMarketing.js): only a
   logged activity moves a fresh Prospect out of "New"; a plain note
   from the detail drawer (addProspectNote below) does not. */
export async function logOutreachActivity(prospectId, label, { authorProfileId, bumpStatus }) {
  const client = requireClient();
  const { error: noteError } = await client.from("contact_notes").insert({ contact_id: prospectId, author_profile_id: authorProfileId, type: "outreach", content: label });
  if (noteError) throw noteError;

  if (bumpStatus) {
    await mutate(client.from("contacts").update({ outreach_status: "Contacted" }).eq("id", prospectId), "update that prospect's status");
  }
}

/* ProspectDetail.jsx's note composer — same underlying touchpoint log
   as logOutreachActivity, minus the status bump (matching the old
   mock's addProspectNote, which never touched status). */
export async function addProspectNote(id, label, authorProfileId) {
  const client = requireClient();
  const { data, error } = await client
    .from("contact_notes")
    .insert({ contact_id: id, author_profile_id: authorProfileId, type: "outreach", content: label })
    .select("content, created_at")
    .single();
  if (error) throw error;
  return { date: data.created_at, label: data.content };
}
