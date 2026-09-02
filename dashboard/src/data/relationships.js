/*
 * Innov8 Studios — Relationships/Contacts data layer, mirroring
 * src/data/studio.js's conventions exactly: requireClient(), the same
 * mutate() "RLS-filtered zero-row write throws instead of silently
 * no-opping" safety net, and pure mapXRow() functions that translate
 * the real public.contacts / contact_notes / contact_activity schema
 * (see supabase/migrations/20260901000001_contacts_foundation.sql)
 * into the exact object shape the existing (frozen) Relationships UI
 * already expects — see pages/Relationships/relationshipsMock.js's old
 * RELATIONSHIPS record shape, which this mapping deliberately matches
 * field-for-field so RelationshipList.jsx / RelationshipDetail.jsx /
 * Overview.jsx / NewRelationshipModal.jsx need zero changes.
 *
 * Canonical identity: contacts.id. contact_type is null | Prospect |
 * Lead | Client | Partner — there is no 'Contact' value in the
 * database. The UI-facing "type" field is still the string "Contact"
 * for a null contact_type row (matching the old UI contract exactly),
 * but that translation happens ONLY at this module's read/write
 * boundary (mapContactRow / contactTypeForWrite) — never stored.
 *
 * Client -> Projects: read-only here, via the existing
 * projects.client_id -> contacts.id FK. Studio's own schema/data layer
 * is not touched — this just queries the same projects table Studio
 * already owns.
 */
import { supabase } from "../lib/supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

/* Same safety net as studio.js's mutate(): Supabase/PostgREST reports
   an RLS-filtered UPDATE/DELETE as a successful empty result rather
   than an error — route every mutation through this so a permission
   failure (or "record no longer exists") always throws instead of
   silently no-opping. */
async function mutate(query, actionDescription) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`You don't have permission to ${actionDescription}, or it no longer exists.`);
  }
  return data;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/* UI-facing type ("Contact"/"Prospect"/"Lead"/"Client"/"Partner") <->
   contacts.contact_type (null/"Prospect"/"Lead"/"Client"/"Partner").
   "Contact" only ever exists on this side of the boundary. */
function typeFromRow(row) {
  return row.contact_type || "Contact";
}
function contactTypeForWrite(uiType) {
  return uiType === "Contact" ? null : uiType;
}

const INTERACTION_TYPE_FROM_DB = { email: "Email", call: "Call", meeting: "Meeting", message: "Message", enquiry: "Enquiry", outreach: "Outreach", other: "Other" };
const INTERACTION_TYPE_TO_DB = { Email: "email", Call: "call", Meeting: "meeting", Message: "message", Enquiry: "enquiry", Outreach: "outreach", Note: "note", Other: "other" };

/* project_status labels the Relationships UI's two-bucket Active/
   Completed project sections can actually render (see
   relationshipsFormat.js's activeProjects()/completedProjects(),
   which filter strictly on p.status === 'Active' | 'Completed' — a
   frozen file this phase does not touch). Studio's real projects have
   six statuses (Planning/Active/Under Review/Stuck/Completed/
   Archived); every open status buckets into "Active", Archived is
   dropped (Studio itself treats Archived as retired), Completed maps
   1:1. This choice lives here, not in the frozen UI. */
function bucketProjectStatus(label) {
  if (label === "Completed") return "Completed";
  if (label === "Archived") return null;
  return "Active";
}

function mapProjectRow(row, statusLabelById) {
  const bucket = bucketProjectStatus(statusLabelById.get(row.status_id));
  if (!bucket) return null;
  return {
    id: row.id,
    name: row.title,
    status: bucket,
    startDate: row.start_date,
    endDate: row.due_date,
    value: row.estimated_value === null ? 0 : Number(row.estimated_value)
  };
}

function mapContactRow(row, ctx) {
  const services = row.services || [];
  const notesAndInteractions = ctx.notesByContact.get(row.id) || [];
  const events = ctx.activityByContact.get(row.id) || [];
  const type = typeFromRow(row);

  return {
    id: row.id,
    type,
    active: row.status === "Active",
    personName: row.person_name || "",
    brandName: row.brand_name,
    role: row.role || "",
    email: row.email || "",
    phone: row.phone || "",
    website: row.website || "",
    location: row.location || "",
    social: row.social || "",
    owner: (row.owner_id && ctx.teamById.get(row.owner_id)) || "",
    source: row.source || "",
    tags: row.tags || [],

    notes: notesAndInteractions
      .filter((n) => n.type === "note")
      .map((n) => ({ id: n.id, text: n.content, date: n.created_at, author: n.authorName })),
    interactions: notesAndInteractions
      .filter((n) => n.type !== "note")
      .map((n) => ({ id: n.id, type: INTERACTION_TYPE_FROM_DB[n.type] || "Other", date: n.created_at, description: n.content, person: n.authorName })),
    events: events.map((e) => ({ id: e.id, date: e.created_at, type: e.type, label: e.description })),

    nextFollowUp: row.next_follow_up_date,
    followUpReason: row.follow_up_note,
    dateAdded: row.created_at,
    dateUpdated: row.updated_at,
    // No persisted equivalent yet — see the integration report's MOCKS/ISSUES notes.
    originContext: null,

    // Prospect
    potentialService: services[0] || "",
    interestLevel: row.interest_level || "Medium",
    // Lead
    opportunity: row.opportunity || "",
    serviceInterest: services[0] || "",
    estimatedValue: row.estimated_value === null ? 0 : Number(row.estimated_value),
    status: row.lead_status || "New",
    priority: row.priority || "Normal",
    // Client
    servicesUsed: services,
    clientSince: row.client_since,
    relationshipHealth: row.client_health || "Healthy",
    projects: type === "Client" ? ctx.projectsByClient.get(row.id) || [] : [],
    // Partner
    partnerType: row.partner_type || "",
    capabilities: services
  };
}

/* ---------- load ---------- */

export async function loadRelationshipsData() {
  const client = requireClient();

  const [teamRes, contactsRes, notesRes, activityRes, statusOptionsRes, projectsRes] = await Promise.all([
    client.from("team_members").select("id, full_name").eq("is_active", true).order("full_name"),
    client.from("contacts").select("*").order("created_at", { ascending: false }),
    client.from("contact_notes").select("*, profiles(full_name)").order("created_at", { ascending: true }),
    client.from("contact_activity").select("id, contact_id, type, description, created_at").order("created_at", { ascending: true }),
    client.from("project_option_lists").select("id, label").eq("kind", "project_status"),
    client.from("projects").select("id, client_id, title, status_id, start_date, due_date, estimated_value").is("deleted_at", null).not("client_id", "is", null)
  ]);
  for (const res of [teamRes, contactsRes, notesRes, activityRes, statusOptionsRes, projectsRes]) if (res.error) throw res.error;

  const team = (teamRes.data || []).map((t) => ({ id: t.id, name: t.full_name }));
  const teamById = new Map(team.map((t) => [t.id, t.name]));
  const teamByName = new Map(team.map((t) => [t.name.toLowerCase(), t.id]));

  const statusLabelById = new Map((statusOptionsRes.data || []).map((s) => [s.id, s.label]));

  const notesByContact = new Map();
  for (const n of notesRes.data || []) {
    const list = notesByContact.get(n.contact_id) || [];
    list.push({ id: n.id, type: n.type, content: n.content, created_at: n.created_at, authorName: n.profiles?.full_name || "Team" });
    notesByContact.set(n.contact_id, list);
  }

  const activityByContact = new Map();
  for (const e of activityRes.data || []) {
    const list = activityByContact.get(e.contact_id) || [];
    list.push(e);
    activityByContact.set(e.contact_id, list);
  }

  const projectsByClient = new Map();
  for (const p of projectsRes.data || []) {
    const mapped = mapProjectRow(p, statusLabelById);
    if (!mapped) continue;
    const list = projectsByClient.get(p.client_id) || [];
    list.push(mapped);
    projectsByClient.set(p.client_id, list);
  }

  const ctx = { teamById, notesByContact, activityByContact, projectsByClient };
  const contacts = (contactsRes.data || []).map((row) => mapContactRow(row, ctx));

  return { contacts, team, teamByName };
}

/* ---------- create ---------- */

function buildInsertPayload(input, teamByName) {
  const payload = {
    brand_name: (input.brandName || input.personName || "Untitled Contact").trim(),
    person_name: input.personName || null,
    role: input.role || null,
    email: input.email || null,
    phone: input.phone || null,
    website: input.website || null,
    location: input.location || null,
    contact_type: contactTypeForWrite(input.type),
    status: "Active",
    source: input.source || null,
    owner_id: (input.owner && teamByName.get(input.owner.toLowerCase())) || null,
    tags: input.tags || [],
    services: [],
    priority: input.priority || null
  };
  if (input.type === "Prospect") {
    payload.services = input.potentialService ? [input.potentialService] : [];
    payload.interest_level = input.interestLevel || "Medium";
  } else if (input.type === "Lead") {
    payload.services = input.serviceInterest ? [input.serviceInterest] : [];
    payload.opportunity = input.opportunity || null;
    payload.estimated_value = input.estimatedValue || null;
    payload.lead_status = "New";
  } else if (input.type === "Client") {
    payload.services = input.servicesUsed || [];
    payload.client_health = "Healthy";
    payload.client_since = todayISO();
  } else if (input.type === "Partner") {
    payload.services = input.capabilities || [];
    payload.partner_type = input.partnerType || null;
  }
  return payload;
}

/* Inserts the real row (using the id the caller generated for its
   optimistic local record — see useRelationships.js's addRelationship
   for why an id is decided up front rather than left to the
   database's own default) plus the initial note, if any. Callers that
   need the confirmed row shape should re-fetch; useRelationships.js
   already has an optimistic local copy and only needs confirmation +
   rollback-on-failure, not a second mapped object. */
export async function addContact(input, { teamByName, authorProfileId }) {
  const client = requireClient();
  const id = input.id || crypto.randomUUID();
  const payload = { id, ...buildInsertPayload(input, teamByName) };
  await mutate(client.from("contacts").insert(payload), "create that contact");

  if (input.notes && input.notes.trim()) {
    const { error } = await client.from("contact_notes").insert({ contact_id: id, author_profile_id: authorProfileId, type: "note", content: input.notes.trim() });
    if (error) throw error;
  }

  return id;
}

/* ---------- update ---------- */

async function patchContact(id, patch, actionDescription) {
  const client = requireClient();
  await mutate(client.from("contacts").update(patch).eq("id", id), actionDescription);
}

export async function updateContactFollowUp(id, { date, reason }) {
  await patchContact(id, { next_follow_up_date: date || null, follow_up_note: reason || null }, "update that follow-up");
}

/* Core identity fields editable from RelationshipDetail.jsx's Edit
   workflow — mirrors EnquiryDetail.jsx's updateEnquiryDetails. Classi-
   fication (type/owner/source/tags) and the type-specific opportunity/
   client fields keep their own dedicated update functions above/below;
   this only ever touches personal/contact information. */
export async function updateContactDetails(id, { personName, brandName, role, email, phone, website, location }) {
  await patchContact(
    id,
    {
      person_name: personName || null,
      brand_name: (brandName || personName || "Untitled Contact").trim(),
      role: role || null,
      email: email || null,
      phone: phone || null,
      website: website || null,
      location: location || null
    },
    "update that contact's details"
  );
}

/* Hard delete — contact_notes/contact_activity both cascade from
   contacts.id, and enquiries.contact_id sets null on delete, so no
   manual child cleanup is needed. projects.client_id is ON DELETE
   RESTRICT, so deleting a Contact who is assigned as a Studio
   project's client fails with a clear Postgres FK error surfaced as a
   toast — by design, not a bug: unassign or reassign the project
   first. RLS restricts this to admins (contacts_delete policy). */
export async function deleteContact(id) {
  const client = requireClient();
  await mutate(client.from("contacts").delete().eq("id", id), "delete that contact");
}

export async function updateContactTags(id, tags) {
  await patchContact(id, { tags }, "update those tags");
}

export async function updateContactLeadStatus(id, status) {
  await patchContact(id, { lead_status: status }, "update that lead status");
}

export async function updateContactClientHealth(id, health) {
  await patchContact(id, { client_health: health, status: health === "Inactive" ? "Inactive" : "Active" }, "update that client health");
}

export async function convertContactType(id, newType) {
  const patch = { contact_type: contactTypeForWrite(newType), status: "Active" };
  if (newType === "Prospect") {
    patch.services = [];
    patch.interest_level = "Medium";
    patch.priority = "Normal";
  } else if (newType === "Lead") {
    patch.services = [];
    patch.opportunity = "";
    patch.estimated_value = 0;
    patch.lead_status = "New";
    patch.priority = "Normal";
  } else if (newType === "Client") {
    patch.services = [];
    patch.client_health = "Healthy";
    patch.client_since = todayISO();
  } else if (newType === "Partner") {
    patch.services = [];
    patch.partner_type = "Creative";
  }
  await patchContact(id, patch, "convert that contact");
}

export async function setContactActive(id, active, currentType, currentHealth) {
  const patch = { status: active ? "Active" : "Inactive" };
  if (currentType === "Client") {
    patch.client_health = active ? (currentHealth === "Inactive" ? "Healthy" : currentHealth) : "Inactive";
  }
  await patchContact(id, patch, active ? "reactivate that contact" : "mark that contact inactive");
}

/* ---------- notes / interactions (contact_notes) ---------- */

async function insertContactNote(id, { type, content, authorProfileId }) {
  const client = requireClient();
  const { data, error } = await client
    .from("contact_notes")
    .insert({ contact_id: id, author_profile_id: authorProfileId, type, content })
    .select("*, profiles(full_name)")
    .single();
  if (error) throw error;
  return { id: data.id, type: data.type, content: data.content, created_at: data.created_at, authorName: data.profiles?.full_name || "Team" };
}

export async function addContactNote(id, text, authorProfileId) {
  return insertContactNote(id, { type: "note", content: text, authorProfileId });
}

export async function addContactInteraction(id, { type, description }, authorProfileId) {
  return insertContactNote(id, { type: INTERACTION_TYPE_TO_DB[type] || "other", content: description, authorProfileId });
}
