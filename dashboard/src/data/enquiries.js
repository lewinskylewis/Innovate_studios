/*
 * Innov8 Studios — Enquiries data layer, mirroring src/data/
 * relationships.js exactly: requireClient(), the same mutate() safety
 * net, pure mapXRow() functions that translate the real public.
 * enquiries / enquiry_notes / enquiry_activity schema (see supabase/
 * migrations/20260901000001_contacts_foundation.sql) into the exact
 * object shape the existing (frozen) Enquiries UI already expects.
 *
 * An Enquiry is NOT a Contact — enquiries.contact_id is an optional
 * pointer to the canonical identity in public.contacts. Converting an
 * Enquiry never creates a second identity system: it either updates
 * the Contact already linked via contact_id (case A), or — if
 * contact_id is null — looks for an existing Contact by exact email
 * match (the one safe, non-fuzzy signal available) and reuses it, and
 * only creates a new Contact when no such match exists (case B). See
 * convertEnquiry() below.
 */
import { supabase } from "../lib/supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

/* Same safety net as relationships.js / studio.js: an RLS-filtered
   UPDATE/DELETE reports success with zero rows instead of an error —
   route every mutation through this so a permission failure (or "no
   longer exists") always throws instead of silently no-opping. */
async function mutate(query, actionDescription) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`You don't have permission to ${actionDescription}, or it no longer exists.`);
  }
  return data;
}

/* UI-facing conversion type ("Contact"/"Prospect"/"Lead"/"Client"/
   "Partner") <-> contacts.contact_type (null/"Prospect"/"Lead"/
   "Client"/"Partner") — same boundary rule as relationships.js:
   "Contact" only ever exists on the UI side. */
function contactTypeForWrite(uiType) {
  return uiType === "Contact" ? null : uiType;
}
function contactTypeForDisplay(contactType) {
  return contactType || "Contact";
}

function mapEnquiryRow(row, ctx) {
  const notes = ctx.notesByEnquiry.get(row.id) || [];
  const events = ctx.activityByEnquiry.get(row.id) || [];
  const contact = row.contact_id ? ctx.contactsById.get(row.contact_id) : null;

  return {
    id: row.id,
    // Not read by the frozen UI (it reads `conversion` instead) — kept
    // so useEnquiries.js's convertEnquiry() can tell case A (already
    // linked) from case B (needs resolving/creating) without a second
    // source of truth.
    contactId: row.contact_id,
    personName: row.person_name || "",
    brandName: row.brand_name || row.person_name || "",
    email: row.email || "",
    phone: row.phone || "",
    location: row.location || "",
    message: row.message || "",
    services: row.services || [],
    source: row.source,
    dateReceived: row.created_at,
    status: row.status,
    priority: row.priority,
    owner: (row.owner_id && ctx.teamById.get(row.owner_id)) || "",
    estimatedValue: row.estimated_value === null ? null : Number(row.estimated_value),
    desiredTimeline: row.desired_timeline || "",
    qualificationNotes: row.qualification_notes || "",
    nextFollowUp: row.next_follow_up_date,
    followUpNote: row.follow_up_note,
    notes: notes.map((n) => ({ id: n.id, text: n.content, date: n.created_at, author: n.authorName })),
    events: events.map((e) => ({ id: e.id, date: e.created_at, type: e.type, label: e.description })),
    // Non-null exactly when contact_id is set — contact_id is only ever
    // written by convertEnquiry() below, so this doubles as "was this
    // enquiry converted" without a second source of truth.
    conversion: row.contact_id
      ? {
          type: contactTypeForDisplay(contact?.contact_type),
          brandName: contact?.brand_name || row.brand_name || "",
          owner: (contact?.owner_id && ctx.teamById.get(contact.owner_id)) || "",
          date: row.converted_at || row.updated_at
        }
      : null,
    originCampaign: row.origin_campaign
  };
}

/* ---------- load ---------- */

export async function loadEnquiriesData() {
  const client = requireClient();

  const [teamRes, enquiriesRes, notesRes, activityRes, contactsRes] = await Promise.all([
    client.from("team_members").select("id, full_name").eq("is_active", true).order("full_name"),
    client.from("enquiries").select("*").order("created_at", { ascending: false }),
    client.from("enquiry_notes").select("*, profiles(full_name)").order("created_at", { ascending: true }),
    client.from("enquiry_activity").select("id, enquiry_id, type, description, created_at").order("created_at", { ascending: true }),
    client.from("contacts").select("id, brand_name, contact_type, owner_id, email")
  ]);
  for (const res of [teamRes, enquiriesRes, notesRes, activityRes, contactsRes]) if (res.error) throw res.error;

  const team = (teamRes.data || []).map((t) => ({ id: t.id, name: t.full_name }));
  const teamById = new Map(team.map((t) => [t.id, t.name]));
  const teamByName = new Map(team.map((t) => [t.name.toLowerCase(), t.id]));

  const contactsById = new Map((contactsRes.data || []).map((c) => [c.id, c]));
  const contactsByEmail = new Map((contactsRes.data || []).filter((c) => c.email).map((c) => [c.email.toLowerCase(), c]));

  const notesByEnquiry = new Map();
  for (const n of notesRes.data || []) {
    const list = notesByEnquiry.get(n.enquiry_id) || [];
    list.push({ id: n.id, content: n.content, created_at: n.created_at, authorName: n.profiles?.full_name || "Team" });
    notesByEnquiry.set(n.enquiry_id, list);
  }

  const activityByEnquiry = new Map();
  for (const e of activityRes.data || []) {
    const list = activityByEnquiry.get(e.enquiry_id) || [];
    list.push(e);
    activityByEnquiry.set(e.enquiry_id, list);
  }

  const ctx = { teamById, notesByEnquiry, activityByEnquiry, contactsById };
  const enquiries = (enquiriesRes.data || []).map((row) => mapEnquiryRow(row, ctx));

  return { enquiries, team, teamByName, contactsById, contactsByEmail };
}

/* ---------- create ---------- */

/* Inserts the real row using the id the caller generated for its
   optimistic local record — see useEnquiries.js's addEnquiry for why
   an id is decided up front. */
export async function addEnquiry(input, { teamByName, authorProfileId }) {
  const client = requireClient();
  const id = input.id || crypto.randomUUID();
  const payload = {
    id,
    person_name: input.personName,
    brand_name: input.brandName || input.personName || null,
    email: input.email || null,
    phone: input.phone || null,
    source: input.source || "Other",
    services: input.services || [],
    priority: input.priority || "Normal",
    owner_id: (input.owner && teamByName.get(input.owner.toLowerCase())) || null,
    message: input.message || null
  };
  await mutate(client.from("enquiries").insert(payload), "create that enquiry");

  if (input.notes && input.notes.trim()) {
    const { error } = await client.from("enquiry_notes").insert({ enquiry_id: id, author_profile_id: authorProfileId, type: "note", content: input.notes.trim() });
    if (error) throw error;
  }

  return id;
}

/* ---------- update ---------- */

async function patchEnquiry(id, patch, actionDescription) {
  const client = requireClient();
  await mutate(client.from("enquiries").update(patch).eq("id", id), actionDescription);
}

export async function updateEnquiryStatus(id, status) {
  await patchEnquiry(id, { status }, "update that enquiry's status");
}

export async function updateEnquiryPriority(id, priority) {
  await patchEnquiry(id, { priority }, "update that enquiry's priority");
}

export async function updateEnquiryQualification(id, { estimatedValue, desiredTimeline, qualificationNotes }) {
  await patchEnquiry(id, { estimated_value: estimatedValue, desired_timeline: desiredTimeline, qualification_notes: qualificationNotes }, "update that enquiry's qualification");
}

export async function setEnquiryFollowUp(id, { date, note }) {
  await patchEnquiry(id, { next_follow_up_date: date || null, follow_up_note: note || null }, "update that follow-up");
}

export async function reassignEnquiryOwner(id, ownerName, teamByName) {
  const ownerId = (ownerName && teamByName.get(ownerName.toLowerCase())) || null;
  await patchEnquiry(id, { owner_id: ownerId }, "reassign that enquiry");
}

/* ---------- notes ---------- */

export async function addEnquiryNote(id, text, authorProfileId) {
  const client = requireClient();
  const { data, error } = await client
    .from("enquiry_notes")
    .insert({ enquiry_id: id, author_profile_id: authorProfileId, type: "note", content: text })
    .select("*, profiles(full_name)")
    .single();
  if (error) throw error;
  return { id: data.id, content: data.content, created_at: data.created_at, authorName: data.profiles?.full_name || "Team" };
}

/* ---------- conversion ---------- */

/* The one multi-step mutation in this module. Supabase-js has no
   client-side multi-statement transaction API, and adding a new
   Postgres RPC function is out of scope for a data-layer-only phase
   (that's a schema change) — so this runs as a controlled sequence
   that stops and surfaces the exact failure rather than pretending
   partial success:
     1. resolve the Contact (reuse via contact_id, reuse via exact
        email match, or create exactly one new one)
     2. classify that Contact (contact_type)
     3. attach it to the enquiry + mark the enquiry Converted
   If step 1/2 succeeds but step 3 fails, the error message says so
   explicitly and explains that retrying will find the same Contact
   again (by id, or by the email match it was just created with) —
   never a duplicate. */
export async function convertEnquiry(enquiry, newType, { teamByName, contactsById, contactsByEmail }) {
  const client = requireClient();
  let contactId = enquiry.contactId || null;
  let justCreated = false;

  if (!contactId) {
    const emailKey = (enquiry.email || "").trim().toLowerCase();
    const existing = emailKey ? contactsByEmail.get(emailKey) : null;
    if (existing) {
      contactId = existing.id;
    } else {
      const ownerId = (enquiry.owner && teamByName.get(enquiry.owner.toLowerCase())) || null;
      const { data, error } = await client
        .from("contacts")
        .insert({
          brand_name: enquiry.brandName || enquiry.personName || "Untitled Contact",
          person_name: enquiry.personName || null,
          email: enquiry.email || null,
          phone: enquiry.phone || null,
          source: enquiry.source || null,
          services: enquiry.services || [],
          owner_id: ownerId,
          contact_type: contactTypeForWrite(newType),
          status: "Active"
        })
        .select()
        .single();
      if (error) throw error;
      contactId = data.id;
      justCreated = true;
      contactsById.set(data.id, data);
      if (emailKey) contactsByEmail.set(emailKey, data);
    }
  }

  // Contact resolved (existing, matched, or just created-and-already-
  // classified) — classify it if it wasn't classified on insert above.
  if (!justCreated) {
    try {
      await mutate(client.from("contacts").update({ contact_type: contactTypeForWrite(newType), status: "Active" }).eq("id", contactId), "classify that contact");
    } catch (err) {
      throw new Error(`Found/created the Contact but couldn't classify it (${err.message}). No enquiry was changed — try converting again.`);
    }
  }

  try {
    await mutate(
      client.from("enquiries").update({ contact_id: contactId, status: "Converted", converted_at: new Date().toISOString() }).eq("id", enquiry.id),
      "link that enquiry to the contact"
    );
  } catch (err) {
    throw new Error(
      `The Contact (id ${contactId}) was created/classified successfully, but linking this enquiry to it failed: ${err.message}. Converting again will reuse the same Contact — it will not create a duplicate.`
    );
  }

  return contactId;
}
