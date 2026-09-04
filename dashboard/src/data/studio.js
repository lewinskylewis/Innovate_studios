/*
 * Innov8 Studios — Studio/Projects data layer, ported from
 * dashboard/legacy/studio-data.js. Same Supabase tables, same mapping,
 * same "mutate() throws on an RLS-filtered no-op write" safety net — the
 * only real change is shape: the legacy file kept PROJECTS/TEAM/FIELDS as
 * module-level mutable arrays that studio.js read synchronously; here
 * every function is pure (reads its inputs, returns a value) so React
 * state (see pages/Studio/useStudio.js) stays the single source of
 * truth and re-renders correctly.
 *
 * Stage 3A adds the custom-column builder, file uploads (private Storage
 * bucket "project-files"), and the read-only project_activity feed —
 * activity rows are only ever produced by the database's own triggers
 * (see supabase/migrations/20260831000012_project_activity.sql), never
 * inserted from here.
 */
import { supabase } from "../lib/supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

/* Supabase/PostgREST does NOT raise an error when RLS filters an
   UPDATE/DELETE down to zero rows — it reports success with an empty
   result. Every mutating query here is routed through this so a
   permission failure always surfaces as a real, thrown error instead of
   a silently-reverted UI. */
async function mutate(query, actionDescription) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`You don't have permission to ${actionDescription}, or it no longer exists.`);
  }
  return data;
}

function toOption(o) {
  return { id: o.id, label: o.label, color: o.color };
}

function optionId(options, label) {
  return options.find((o) => o.label === label)?.id ?? null;
}
function optionLabel(options, id) {
  return options.find((o) => o.id === id)?.label ?? null;
}

function mapMilestoneRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    dueDate: row.due_date,
    statusId: row.status_id,
    priorityId: row.priority_id,
    assignees: (row.milestone_assignees || []).map((a) => a.team_member_id),
    clientVisible: row.client_visible,
    sortOrder: row.sort_order
  };
}

function mapProjectRow(row, membersByProject, milestonesByProject, clientsById) {
  const members = membersByProject.get(row.id) || [];
  const lead = members.find((m) => m.is_lead) || members[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    client: clientsById.get(row.client_id) || "",
    clientId: row.client_id,
    service: row.service || "",
    statusId: row.status_id,
    priorityId: row.priority_id,
    startDate: row.start_date,
    deadline: row.due_date,
    estimatedValue: row.estimated_value === null ? null : Number(row.estimated_value),
    paid: row.paid_value === null ? null : Number(row.paid_value),
    completedAt: row.completed_at,
    notes: row.notes || "",
    custom: row.custom_fields || {},
    team: members.map((m) => m.team_member_id),
    leadMemberId: row.lead_member_id || lead?.team_member_id || null,
    milestones: (milestonesByProject.get(row.id) || []).map(mapMilestoneRow),
    comments: [], // loaded lazily — see loadProjectComments()
    files: [], // loaded lazily — see loadProjectFiles()
    activity: [], // loaded lazily — see loadProjectActivity()
    isDraft: row.is_draft,
    deletedAt: row.deleted_at,
    publicSlug: row.public_slug
  };
}

/* ---------- load ---------- */

export async function loadStudioData() {
  const client = requireClient();

  const [teamRes, optionsRes, fieldsRes, clientsRes] = await Promise.all([
    client.from("team_members").select("id, full_name, job_title").eq("is_active", true).order("full_name"),
    client.from("project_option_lists").select("id, kind, label, color, sort_order").order("sort_order"),
    client
      .from("project_fields")
      .select("id, key, name, type, system, is_multi, currency, sort_order, width_px, project_field_options(id, label, color, sort_order)")
      .order("sort_order"),
    client.from("contacts").select("id, brand_name, person_name, email, phone")
  ]);
  for (const res of [teamRes, optionsRes, fieldsRes, clientsRes]) if (res.error) throw res.error;
  const { data: team } = teamRes;
  const { data: options } = optionsRes;
  const { data: fields } = fieldsRes;
  const { data: clients } = clientsRes;

  const projectStatusOptions = (options || []).filter((o) => o.kind === "project_status").map(toOption);
  const priorityOptions = (options || []).filter((o) => o.kind === "priority").map(toOption);
  const milestoneStatusOptions = (options || []).filter((o) => o.kind === "milestone_status").map(toOption);

  const fieldList = (fields || []).map((f) => ({
    id: f.key,
    dbId: f.id,
    name: f.name,
    type: f.type,
    system: f.system,
    multi: f.is_multi,
    currency: f.currency || undefined,
    order: f.sort_order,
    width: f.width_px || undefined,
    options:
      f.type === "select" && !f.system
        ? (f.project_field_options || []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ id: o.id, label: o.label, color: o.color }))
        : f.key === "status"
          ? projectStatusOptions
          : f.key === "priority"
            ? priorityOptions
            : undefined
  }));

  const clientsById = new Map((clients || []).map((c) => [c.id, c.brand_name]));
  const clientsByName = new Map((clients || []).map((c) => [c.brand_name.toLowerCase(), c]));

  const teamList = (team || []).map((t) => ({ id: t.id, name: t.full_name, role: t.job_title || "" }));

  const projects = await loadProjects(clientsById);

  return {
    team: teamList,
    projectStatusOptions,
    priorityOptions,
    milestoneStatusOptions,
    fields: fieldList,
    clientsById,
    clientsByName,
    projects
  };
}

export async function loadProjects(clientsById) {
  const client = requireClient();

  const [projectsRes, membersRes, milestonesRes] = await Promise.all([
    client.from("projects").select("*").is("deleted_at", null).order("due_date", { ascending: true }),
    client.from("project_members").select("project_id, team_member_id, is_lead"),
    client.from("milestones").select("*, milestone_assignees(team_member_id)").order("sort_order")
  ]);
  for (const res of [projectsRes, membersRes, milestonesRes]) if (res.error) throw res.error;
  const { data: rows } = projectsRes;
  const { data: memberRows } = membersRes;
  const { data: milestoneRows } = milestonesRes;

  const membersByProject = new Map();
  (memberRows || []).forEach((m) => {
    if (!membersByProject.has(m.project_id)) membersByProject.set(m.project_id, []);
    membersByProject.get(m.project_id).push(m);
  });

  const milestonesByProject = new Map();
  (milestoneRows || []).forEach((m) => {
    if (!milestonesByProject.has(m.project_id)) milestonesByProject.set(m.project_id, []);
    milestonesByProject.get(m.project_id).push(m);
  });

  return (rows || []).map((row) => mapProjectRow(row, membersByProject, milestonesByProject, clientsById));
}

/* ---------- projects ---------- */

export async function createProject({ title = "", deadline, startDate, statusOptions, priorityOptions, createdBy }) {
  const client = requireClient();
  const { data, error } = await client
    .from("projects")
    .insert({
      title,
      status_id: optionId(statusOptions, "Planning"),
      priority_id: optionId(priorityOptions, "Normal"),
      start_date: startDate || null,
      due_date: deadline,
      is_draft: true,
      created_by: createdBy
    })
    .select()
    .single();
  if (error) throw error;

  const project = mapProjectRow(data, new Map(), new Map(), new Map());
  project.isDraft = true;
  return project;
}

export async function duplicateProject(original) {
  const client = requireClient();
  const { data, error } = await client
    .from("projects")
    .insert({
      client_id: original.clientId,
      title: `${original.title} (copy)`,
      description: original.description,
      service: original.service,
      status_id: original.statusId,
      priority_id: original.priorityId,
      start_date: original.startDate,
      due_date: original.deadline,
      estimated_value: original.estimatedValue,
      notes: original.notes,
      custom_fields: original.custom
    })
    .select()
    .single();
  if (error) throw error;

  return mapProjectRow(data, new Map(), new Map(), new Map());
}

export async function softDeleteProject(project) {
  const client = requireClient();
  // Also clears client_id: projects.client_id -> contacts.id is ON
  // DELETE RESTRICT, and a soft-deleted row (deleted_at set) still
  // physically exists — Postgres enforces the constraint against it
  // regardless of the app-level deleted_at convention. Without
  // clearing it here, "deleting" a project would leave its Contact
  // permanently unable to be deleted, even though the project no
  // longer shows up anywhere in the UI. The contact-delete RESTRICT
  // itself is untouched — this only ever removes the link from a
  // project the user has already deleted.
  await mutate(client.from("projects").update({ deleted_at: new Date().toISOString(), client_id: null }).eq("id", project.id), "delete that project");
}

/* setCellValue's single choke point, ported from studio-data.js, but
   keyed by a plain fieldId string rather than a project_fields metadata
   object: only the 8 columns the Ongoing Projects *table* renders
   (title, client, assignee, startDate, deadline, priority, status,
   estimatedValue) have a project_fields row. description/service/notes
   are real `projects` columns the detail drawer also edits but that the
   legacy spreadsheet never exposed as a column — keying by field object
   would throw for those. Anything not recognized as a system column
   falls through to custom_fields, so a genuine custom field (by its
   `key`) still works. `updateProjectField` returns a *patch* object the
   caller merges into its own project state, rather than mutating a
   shared PROJECTS array in place. */

const SYSTEM_COLUMNS = {
  title: "title",
  description: "description",
  service: "service",
  startDate: "start_date",
  deadline: "due_date",
  estimatedValue: "estimated_value",
  paid: "paid_value",
  notes: "notes"
};

export async function updateProjectField(project, fieldId, value, { statusOptions, priorityOptions, clientsById }) {
  const client = requireClient();
  const patch = {};

  if (project.isDraft) {
    await mutate(client.from("projects").update({ is_draft: false }).eq("id", project.id), "edit that project");
    patch.isDraft = false;
  }

  if (fieldId === "assignee") {
    await setProjectAssignees(project, value);
    patch.team = value;
    return patch;
  }

  if (fieldId === "client") {
    // value is an existing contacts.id (or null to unassign) — chosen
    // from the real Contacts list in Cell.jsx's picker, never free
    // text. Contacts are canonical: this never creates one.
    const clientId = value || null;
    await mutate(client.from("projects").update({ client_id: clientId }).eq("id", project.id), "change the client");
    patch.clientId = clientId;
    patch.client = clientId ? clientsById.get(clientId) || "" : "";

    if (clientId) {
      // Attaching a real Studio project to a Contact makes them a
      // client in practice — promote them in Relationships too if
      // they aren't already classified as one, so the two modules
      // never silently drift out of sync. The `.or(...)` guard means
      // an already-Client contact (or a second project for the same
      // one) is left untouched — this never resets their existing
      // health/since date. Best-effort: this side effect must not
      // undo the client assignment that already succeeded above.
      const { error: promoteError } = await client
        .from("contacts")
        .update({ contact_type: "Client", status: "Active", client_health: "Healthy", client_since: new Date().toISOString().slice(0, 10) })
        .eq("id", clientId)
        .or("contact_type.is.null,contact_type.neq.Client");
      if (promoteError) console.error("[studio] auto-promote contact to Client failed", promoteError);
    }

    return patch;
  }

  if (fieldId === "status" || fieldId === "priority") {
    const options = fieldId === "status" ? statusOptions : priorityOptions;
    const dbColumn = fieldId === "status" ? "status_id" : "priority_id";
    const idKey = fieldId === "status" ? "statusId" : "priorityId";
    const id = optionId(options, value);
    const updatePayload = { [dbColumn]: id };

    // Drives the Delivery Status automation (see lib/deliveryStatus.js):
    // record the moment a project transitions INTO Completed, so a
    // later comparison against the due date can tell GOOD from LATE.
    // Never overwritten while it stays Completed (guarded by the
    // statusId !== id check — a no-op "Completed -> Completed" write
    // never reaches here anyway since Cell.jsx only commits on an
    // actual pick, but this keeps the intent explicit). Cleared back to
    // null the moment it leaves Completed, so a later re-completion
    // records a fresh timestamp rather than reusing a stale one.
    if (fieldId === "status") {
      if (value === "Completed") {
        if (project.statusId !== id) updatePayload.completed_at = new Date().toISOString();
      } else {
        updatePayload.completed_at = null;
      }
    }

    await mutate(client.from("projects").update(updatePayload).eq("id", project.id), `change ${fieldId}`);
    patch[idKey] = id;
    if (fieldId === "status" && "completed_at" in updatePayload) patch.completedAt = updatePayload.completed_at;
    return patch;
  }

  const column = SYSTEM_COLUMNS[fieldId];
  if (column) {
    await mutate(client.from("projects").update({ [column]: value }).eq("id", project.id), `edit ${fieldId}`);
    patch[fieldId] = value;
    return patch;
  }

  const nextCustom = { ...project.custom, [fieldId]: value };
  await mutate(client.from("projects").update({ custom_fields: nextCustom }).eq("id", project.id), `edit ${fieldId}`);
  patch.custom = nextCustom;
  return patch;
}

export async function setProjectAssignees(project, teamMemberIds) {
  const client = requireClient();
  const current = new Set(project.team);
  const next = new Set(teamMemberIds);
  const toAdd = [...next].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toRemove.length) {
    await mutate(client.from("project_members").delete().eq("project_id", project.id).in("team_member_id", toRemove), "remove that team member");
  }
  if (toAdd.length) {
    const wasEmpty = current.size === 0;
    const { error } = await client
      .from("project_members")
      .insert(toAdd.map((id, i) => ({ project_id: project.id, team_member_id: id, is_lead: wasEmpty && i === 0 })));
    if (error) throw error;
  }
}

/* ---------- milestones ---------- */

export async function createMilestone(project, { title, dueDate }, { milestoneStatusOptions, priorityOptions }) {
  const client = requireClient();
  const { data, error } = await client
    .from("milestones")
    .insert({
      project_id: project.id,
      title: title || "Untitled milestone",
      due_date: dueDate || null,
      status_id: optionId(milestoneStatusOptions, "Not started"),
      priority_id: optionId(priorityOptions, "Normal"),
      sort_order: project.milestones.length
    })
    .select("*, milestone_assignees(team_member_id)")
    .single();
  if (error) throw error;

  return mapMilestoneRow(data);
}

export async function updateMilestoneField(milestone, key, value, { milestoneStatusOptions, priorityOptions }) {
  const client = requireClient();
  const columnMap = { title: "title", description: "description", dueDate: "due_date", clientVisible: "client_visible" };

  if (key === "status" || key === "priority") {
    const options = key === "status" ? milestoneStatusOptions : priorityOptions;
    const column = key === "status" ? "status_id" : "priority_id";
    const idKey = key === "status" ? "statusId" : "priorityId";
    const id = optionId(options, value);
    await mutate(client.from("milestones").update({ [column]: id }).eq("id", milestone.id), `change milestone ${key}`);
    return { [idKey]: id };
  }

  if (columnMap[key]) {
    await mutate(client.from("milestones").update({ [columnMap[key]]: value }).eq("id", milestone.id), "edit that milestone");
    return { [key]: value };
  }

  return {};
}

export async function setMilestoneAssignees(milestone, teamMemberIds) {
  const client = requireClient();
  const current = new Set(milestone.assignees);
  const next = new Set(teamMemberIds);
  const toAdd = [...next].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toRemove.length) {
    await mutate(client.from("milestone_assignees").delete().eq("milestone_id", milestone.id).in("team_member_id", toRemove), "remove that milestone assignee");
  }
  if (toAdd.length) {
    const { error } = await client.from("milestone_assignees").insert(toAdd.map((id) => ({ milestone_id: milestone.id, team_member_id: id })));
    if (error) throw error;
  }
}

export async function deleteMilestone(milestone) {
  const client = requireClient();
  await mutate(client.from("milestones").delete().eq("id", milestone.id), "delete that milestone");
}

/* Persists a new Studio-chosen order — orderedMilestones is the full
   milestone list already spliced into its new order client-side; this
   just writes each row's new position. Client View's sharedProject.js
   query already orders by this same sort_order column, so this is the
   only place milestone order is ever written. */
export async function reorderMilestones(orderedMilestones) {
  const client = requireClient();
  await Promise.all(orderedMilestones.map((m, i) => client.from("milestones").update({ sort_order: i }).eq("id", m.id)));
}

/* ---------- comments (lazy-loaded when a project's detail drawer opens) ---------- */

export async function loadProjectComments(projectId) {
  const client = requireClient();
  const { data, error } = await client.from("project_comments").select("*").eq("project_id", projectId).order("created_at");
  if (error) throw error;
  return (data || []).map((c) => ({
    id: c.id,
    author: c.author_display_name,
    authorType: c.author_type,
    content: c.content,
    visibility: c.visibility,
    createdAt: c.created_at
  }));
}

export async function addComment(projectId, content, authorProfileId, authorDisplayName, visibility = "internal") {
  const client = requireClient();
  const { data, error } = await client
    .from("project_comments")
    .insert({ project_id: projectId, author_profile_id: authorProfileId, author_display_name: authorDisplayName, author_type: "studio", content, visibility })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, author: data.author_display_name, authorType: data.author_type, content: data.content, visibility: data.visibility, createdAt: data.created_at };
}

/* Studio-only — flips whether a studio-authored comment is exposed to
   the client. Meaningless (and never called) for author_type='client'
   rows, which are always visible to both sides regardless. */
export async function updateCommentVisibility(comment, visibility) {
  const client = requireClient();
  await mutate(client.from("project_comments").update({ visibility }).eq("id", comment.id), "change that comment's visibility");
}

/* Studio-only (never offered to the client). RLS: is_admin() or
   author_profile_id = auth.uid() — an admin can delete any comment
   including a client-authored one; a non-admin team member can only
   delete their own studio comments. */
export async function deleteComment(comment) {
  const client = requireClient();
  await mutate(client.from("project_comments").delete().eq("id", comment.id), "delete that comment");
}

/* ---------- fields (custom columns) ---------- */

/* project_fields.sort_order is a Postgres integer column — every write
   below computes a whole-number position (shifting later columns up by
   one when inserting in the middle), same as studio-data.js. */
async function shiftFieldsFrom(client, fields, fromIndex) {
  const toShift = fields.filter((f) => f.order >= fromIndex);
  if (!toShift.length) return;
  await Promise.all(toShift.map((f) => client.from("project_fields").update({ sort_order: f.order + 1 }).eq("id", f.dbId)));
}

export async function createField({ name, type, options = [], insertAfterId, fields, isMulti = false, keyPrefix = null }) {
  const client = requireClient();
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  const insertIndex = insertAfterId ? sorted.findIndex((f) => f.id === insertAfterId) + 1 : sorted.length;
  await shiftFieldsFrom(client, sorted, insertIndex);

  const key = `custom_${keyPrefix ? `${keyPrefix}_` : ""}${crypto.randomUUID()}`;
  const { data, error } = await client
    .from("project_fields")
    .insert({ key, name, type, system: false, is_multi: isMulti, sort_order: insertIndex, currency: type === "money" ? "KES" : null })
    .select()
    .single();
  if (error) throw error;

  let fieldOptions;
  if (type === "select" && options.length) {
    const { data: optRows, error: optErr } = await client
      .from("project_field_options")
      .insert(options.map((label, i) => ({ field_id: data.id, label, color: OPTION_COLOR_PALETTE[i % OPTION_COLOR_PALETTE.length], sort_order: i })))
      .select();
    if (optErr) throw optErr;
    fieldOptions = optRows.map((o) => ({ id: o.id, label: o.label, color: o.color }));
  }

  return { id: data.key, dbId: data.id, name: data.name, type: data.type, system: false, multi: data.is_multi, order: data.sort_order, width: undefined, options: fieldOptions };
}

export async function renameField(field, name) {
  const client = requireClient();
  await mutate(client.from("project_fields").update({ name }).eq("id", field.dbId), "rename that column");
}

/* Changes the *underlying* type/is_multi of an existing custom field.
   The field's `key` (and therefore its already-stored values in every
   project's custom_fields) never changes — Select <-> Multi-select is a
   clean, lossless toggle of is_multi; other conversions just reinterpret
   the same stored JSON value under the new type (matching Notion/Monday,
   which don't attempt to transform existing data across a type change
   either). */
export async function changeFieldType(field, type, isMulti = false) {
  const client = requireClient();
  await mutate(client.from("project_fields").update({ type, is_multi: isMulti }).eq("id", field.dbId), "change that column's type");
}

export async function resizeField(field, widthPx) {
  const client = requireClient();
  const width = Math.round(widthPx);
  await mutate(client.from("project_fields").update({ width_px: width }).eq("id", field.dbId), "resize that column");
  return width;
}

export async function reorderFields(orderedFields) {
  const client = requireClient();
  await Promise.all(orderedFields.map((f, i) => client.from("project_fields").update({ sort_order: i }).eq("id", f.dbId)));
}

export async function duplicateField(field, fields, projects) {
  const client = requireClient();
  const sorted = [...fields].sort((a, b) => a.order - b.order);
  const sourceIndex = sorted.findIndex((f) => f.id === field.id);
  const insertIndex = sourceIndex + 1;
  await shiftFieldsFrom(client, sorted, insertIndex);

  const { data, error } = await client
    .from("project_fields")
    .insert({ key: `custom_${crypto.randomUUID()}`, name: `${field.name} copy`, type: field.type, system: false, sort_order: insertIndex, currency: field.currency || null })
    .select()
    .single();
  if (error) throw error;

  let fieldOptions;
  if (field.type === "select" && field.options?.length) {
    const { data: optRows, error: optErr } = await client
      .from("project_field_options")
      .insert(field.options.map((o, i) => ({ field_id: data.id, label: o.label, color: o.color, sort_order: i })))
      .select();
    if (optErr) throw optErr;
    fieldOptions = optRows.map((o) => ({ id: o.id, label: o.label, color: o.color }));
  }

  // Copy every project's existing value for the source field onto the new one.
  const patches = new Map();
  await Promise.all(
    projects
      .filter((p) => p.custom[field.id] !== undefined)
      .map(async (p) => {
        const nextCustom = { ...p.custom, [data.key]: p.custom[field.id] };
        const { error: copyErr } = await client.from("projects").update({ custom_fields: nextCustom }).eq("id", p.id);
        if (copyErr) throw copyErr;
        patches.set(p.id, nextCustom);
      })
  );

  return { field: { id: data.key, dbId: data.id, name: data.name, type: data.type, system: false, order: data.sort_order, width: undefined, options: fieldOptions }, patches };
}

export async function deleteField(field) {
  const client = requireClient();
  await mutate(client.from("project_fields").delete().eq("id", field.dbId), "delete that column");
}

/* ---------- options (status / priority / milestone-status / custom-select) ---------- */

export const OPTION_COLOR_PALETTE = ["#a9a7a4", "#4f8cff", "#3ddc84", "#ffb54d", "#ff8a3d", "#ff5a5f", "#a855f7", "#22c1c3", "#f2b705", "#756e6a"];

export async function addSystemOption(kind, label, existingCount) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_option_lists")
    .insert({ kind, label, color: OPTION_COLOR_PALETTE[existingCount % OPTION_COLOR_PALETTE.length], sort_order: existingCount })
    .select()
    .single();
  if (error) throw error;
  return toOption(data);
}

export async function recolorSystemOption(option) {
  const client = requireClient();
  const next = OPTION_COLOR_PALETTE[(OPTION_COLOR_PALETTE.indexOf(option.color) + 1 + OPTION_COLOR_PALETTE.length) % OPTION_COLOR_PALETTE.length];
  await mutate(client.from("project_option_lists").update({ color: next }).eq("id", option.id), "recolor that option");
  return next;
}

export async function deleteSystemOption(option) {
  const client = requireClient();
  await mutate(client.from("project_option_lists").delete().eq("id", option.id), "delete that option");
}

export async function addFieldOption(field, label) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_field_options")
    .insert({ field_id: field.dbId, label, color: OPTION_COLOR_PALETTE[(field.options?.length || 0) % OPTION_COLOR_PALETTE.length], sort_order: field.options?.length || 0 })
    .select()
    .single();
  if (error) throw error;
  return { id: data.id, label: data.label, color: data.color };
}

export async function recolorFieldOption(option) {
  const client = requireClient();
  const next = OPTION_COLOR_PALETTE[(OPTION_COLOR_PALETTE.indexOf(option.color) + 1 + OPTION_COLOR_PALETTE.length) % OPTION_COLOR_PALETTE.length];
  await mutate(client.from("project_field_options").update({ color: next }).eq("id", option.id), "recolor that option");
  return next;
}

export async function deleteFieldOption(option) {
  const client = requireClient();
  await mutate(client.from("project_field_options").delete().eq("id", option.id), "delete that option");
}

/* ---------- files (lazy-loaded when a project's detail drawer opens) ---------- */

export function formatBytes(bytes) {
  if (!bytes) return "—";
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export async function loadProjectFiles(projectId) {
  const client = requireClient();
  const { data, error } = await client.from("project_files").select("*, profiles(full_name)").eq("project_id", projectId).order("created_at");
  if (error) throw error;
  return (data || []).map((f) => ({
    id: f.id,
    name: f.original_filename,
    type: f.original_filename.split(".").pop(),
    category: f.category,
    size: formatBytes(f.size_bytes),
    uploadedBy: f.profiles?.full_name || "—",
    uploadedAt: f.created_at?.slice(0, 10),
    visibility: f.visibility,
    storagePath: f.storage_path
  }));
}

export async function uploadProjectFile(project, file, { category = "Working Files", visibility = "Internal" } = {}, uploaderProfileId, uploaderName) {
  const client = requireClient();
  const path = `${project.id}/${crypto.randomUUID()}_${file.name}`;
  const { error: uploadErr } = await client.storage.from("project-files").upload(path, file);
  if (uploadErr) throw uploadErr;

  const { data, error } = await client
    .from("project_files")
    .insert({ project_id: project.id, storage_path: path, original_filename: file.name, category, size_bytes: file.size, visibility, uploaded_by: uploaderProfileId })
    .select()
    .single();
  if (error) throw error;

  return {
    id: data.id,
    name: file.name,
    type: file.name.split(".").pop(),
    category,
    size: formatBytes(file.size),
    uploadedBy: uploaderName,
    uploadedAt: new Date().toISOString().slice(0, 10),
    visibility,
    storagePath: path
  };
}

/* Studio-only — flips whether a file is visible to the client. This is
   the only way a file ever becomes client-visible: upload always
   defaults to "Internal" (see uploadProjectFile above), matching prior
   behavior — Studio explicitly publishes a file via this toggle. */
export async function updateFileVisibility(file, visibility) {
  const client = requireClient();
  await mutate(client.from("project_files").update({ visibility }).eq("id", file.id), "change that file's visibility");
}

export async function getFileDownloadUrl(file) {
  const client = requireClient();
  const { data, error } = await client.storage.from("project-files").createSignedUrl(file.storagePath, 60, { download: file.name });
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteProjectFile(file) {
  const client = requireClient();
  // Delete the metadata row first — it's RLS-protected (only the
  // uploader or an admin can), so this is the real permission check.
  // Only remove the Storage object once that's confirmed, so a rejected
  // delete never leaves an orphaned metadata row pointing at nothing.
  await mutate(client.from("project_files").delete().eq("id", file.id), "delete that file");
  await client.storage.from("project-files").remove([file.storagePath]);
}

/* ---------- activity (read-only — every row comes from a database
   trigger, see supabase/migrations/20260831000012_project_activity.sql;
   this file never inserts into project_activity) ---------- */

export async function loadProjectActivity(projectId) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_activity")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((a) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.created_at, visibility: a.visibility }));
}

/* ---------- per-user Studio table view preferences (column
   visibility + order) — supabase/migrations/20260906000001, RLS-scoped
   to profile_id = auth.uid() so each Studio account has its own. ---------- */

export async function loadTablePreferences(profileId, tableKey = "projects") {
  const client = requireClient();
  const { data, error } = await client
    .from("studio_table_preferences")
    .select("hidden_field_keys, column_order")
    .eq("profile_id", profileId)
    .eq("table_key", tableKey)
    .maybeSingle();
  if (error) throw error;
  return { hiddenFieldKeys: data?.hidden_field_keys || [], columnOrder: data?.column_order || [] };
}

export async function saveTablePreferences(profileId, { hiddenFieldKeys, columnOrder }, tableKey = "projects") {
  const client = requireClient();
  const { error } = await client
    .from("studio_table_preferences")
    .upsert({ profile_id: profileId, table_key: tableKey, hidden_field_keys: hiddenFieldKeys, column_order: columnOrder, updated_at: new Date().toISOString() }, { onConflict: "profile_id,table_key" });
  if (error) throw error;
}

export { optionId, optionLabel };
