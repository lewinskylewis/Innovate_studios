/*
 * Data layer for the STUDIO module — backed by Supabase. studio.js never
 * imports supabase or writes a query itself; every read/write goes
 * through the functions and arrays in this file, matching the "HTML ->
 * studio.js -> studio-data.js -> supabaseClient.js -> Supabase" layering
 * from the approved architecture.
 *
 * PROJECTS / FIELDS / TEAM / *_OPTIONS below are the same in-memory
 * arrays studio.js has always read synchronously — that rendering
 * architecture is unchanged. What changed is where they're populated
 * from: loadStudioData() below fetches them from Supabase once at
 * startup, and every mutation function persists to Supabase *before*
 * updating these arrays, so the UI never shows a change that failed to
 * save (see the error handling in studio.js's call sites).
 *
 * BILLS / MEETINGS / INVOICES stay exactly what they were: local,
 * read-only mock data for the Overview "Upcoming" panel. Nothing in the
 * app creates, edits, or deletes them, so nothing about them is backed
 * by Supabase — see the architecture audit's §3 and this project's §42.
 */

// CURRENT_USER is a plain global set by js/auth/session.js (window.CURRENT_USER)
// before this file's data loads — deliberately NOT re-declared here with
// const/let, which would create a separate lexical binding and shadow the
// real value for every classic script on the page, including this one.

let TEAM = [];
let PROJECT_STATUS_OPTIONS = [];
let PRIORITY_OPTIONS = [];
let MILESTONE_STATUS_OPTIONS = [];
let PROJECT_STATUSES = [];
let PRIORITIES = [];
let FIELDS = [];
let PROJECTS = [];

// id -> name, populated by loadStudioData(); getCellValue("client") reads
// through this so the Brand column keeps working exactly as before.
let CLIENTS_BY_ID = new Map();
let CLIENTS_BY_NAME = new Map();

function nextProjectId() {
  throw new Error("Projects are created by createProject(), which returns the real database id — there is no client-generated id anymore.");
}
function nextFieldId() {
  throw new Error("Fields are created by createField(), which returns the real database id.");
}

const BILLS = [
  { vendor: "Adobe Creative Cloud", amount: 84000, dueDate: "2026-09-03", status: "Unpaid" },
  { vendor: "Nairobi Studio Rent", amount: 220000, dueDate: "2026-09-01", status: "Unpaid" },
  { vendor: "Render Farm — CloudGPU", amount: 46500, dueDate: "2026-09-08", status: "Scheduled" },
  { vendor: "Canon Kenya — Lens Hire", amount: 32000, dueDate: "2026-08-27", status: "Overdue" },
  { vendor: "Music Licensing — Artlist", amount: 18500, dueDate: "2026-09-14", status: "Unpaid" }
];

const MEETINGS = [
  { contact: "Wanjiru Kamau — Stanbic Bank", purpose: "Client review — rough cut", date: "2026-09-02", time: "10:30" },
  { contact: "James Mwangi — Horizon Motors", purpose: "Final delivery walkthrough", date: "2026-08-31", time: "15:00" },
  { contact: "Peter Otieno — Jubilee Insurance", purpose: "Staging review call", date: "2026-09-08", time: "09:00" },
  { contact: "Studio team", purpose: "Weekly production standup", date: "2026-09-01", time: "09:00" },
  { contact: "Daniel Kiptoo — Rentora", purpose: "Final cut approval", date: "2026-08-30", time: "13:00" }
];

const INVOICES = [
  { client: "Sanaa Coffee Co.", amount: 620000, dueDate: "2026-07-05", status: "Paid" },
  { client: "GreenLeaf Wellness", amount: 620000, dueDate: "2026-07-27", status: "Paid" },
  { client: "Stanbic Bank", amount: 1200000, dueDate: "2026-09-05", status: "Pending" },
  { client: "Rentora", amount: 1450000, dueDate: "2026-09-01", status: "Pending" },
  { client: "Horizon Motors", amount: 560000, dueDate: "2026-08-31", status: "Overdue" }
];

/* ---------- internal helpers ---------- */

function optionId(kind, label) {
  const list = { project_status: PROJECT_STATUS_OPTIONS, priority: PRIORITY_OPTIONS, milestone_status: MILESTONE_STATUS_OPTIONS }[kind];
  return list?.find((o) => o.label === label)?.id ?? null;
}
function optionLabel(kind, id) {
  const list = { project_status: PROJECT_STATUS_OPTIONS, priority: PRIORITY_OPTIONS, milestone_status: MILESTONE_STATUS_OPTIONS }[kind];
  return list?.find((o) => o.id === id)?.label ?? null;
}

async function sb() {
  await window.supabaseReady;
  if (!window.supabase) throw new Error("Supabase is not configured — see dashboard/js/env.example.js.");
  return window.supabase;
}

/* Supabase/PostgREST does NOT raise an error when RLS filters an
   UPDATE/DELETE down to zero rows — it reports success with an empty
   result. Without checking for that, a write a user isn't allowed to
   make would look like it saved when nothing actually changed in the
   database. Every mutating query in this file is routed through this so
   a permission failure always surfaces as a real, thrown error instead
   of a silently-reverted UI. */
async function mutate(query, actionDescription) {
  const { data, error } = await query.select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`You don't have permission to ${actionDescription}, or it no longer exists.`);
  }
  return data;
}

function mapProjectRow(row, membersByProject, milestonesByProject) {
  const members = membersByProject.get(row.id) || [];
  const lead = members.find((m) => m.is_lead) || members[0];
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    client: CLIENTS_BY_ID.get(row.client_id) || "",
    clientId: row.client_id,
    contact: null, // client contact fields moved to the clients table; the detail drawer reads them via clientRecord() below
    service: row.service || "",
    status: optionLabel("project_status", row.status_id),
    priority: optionLabel("priority", row.priority_id),
    startDate: row.start_date,
    deadline: row.due_date,
    estimatedValue: row.estimated_value === null ? null : Number(row.estimated_value),
    notes: row.notes || "",
    custom: row.custom_fields || {},
    team: members.map((m) => m.team_member_id),
    leadMemberId: row.lead_member_id || lead?.team_member_id || null,
    milestones: (milestonesByProject.get(row.id) || []).map(mapMilestoneRow),
    files: [], // see loadProjectFiles(project) — loaded lazily when a project's detail drawer opens
    comments: [], // see loadProjectComments(project)
    activity: [], // see loadProjectActivity(project) — server-generated, see 0012_project_activity.sql
    isDraft: row.is_draft,
    deletedAt: row.deleted_at
  };
}

function mapMilestoneRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    dueDate: row.due_date,
    status: optionLabel("milestone_status", row.status_id),
    priority: row.priority_id ? optionLabel("priority", row.priority_id) : "Normal",
    assignees: (row.milestone_assignees || []).map((a) => a.team_member_id),
    clientVisible: row.client_visible
  };
}

function clientRecord(project) {
  return CLIENTS_BY_NAME.get((project.client || "").toLowerCase()) || null;
}

/* ---------- load ---------- */

async function loadStudioData() {
  const client = await sb();

  const [teamRes, optionsRes, fieldsRes, clientsRes] = await Promise.all([
    client.from("team_members").select("id, full_name, job_title").eq("is_active", true).order("full_name"),
    client.from("project_option_lists").select("id, kind, label, color, sort_order").order("sort_order"),
    client.from("project_fields").select("id, key, name, type, system, is_multi, currency, sort_order, width_px, project_field_options(id, label, color, sort_order)").order("sort_order"),
    client.from("clients").select("id, name, contact_name, email, phone")
  ]);
  for (const res of [teamRes, optionsRes, fieldsRes, clientsRes]) if (res.error) throw res.error;
  const { data: team } = teamRes, { data: options } = optionsRes, { data: fields } = fieldsRes, { data: clients } = clientsRes;

  TEAM = (team || []).map((t) => ({ id: t.id, name: t.full_name, role: t.job_title || "" }));

  PROJECT_STATUS_OPTIONS = (options || []).filter((o) => o.kind === "project_status").map(toOption);
  PRIORITY_OPTIONS = (options || []).filter((o) => o.kind === "priority").map(toOption);
  MILESTONE_STATUS_OPTIONS = (options || []).filter((o) => o.kind === "milestone_status").map(toOption);
  PROJECT_STATUSES = PROJECT_STATUS_OPTIONS.map((o) => o.label);
  PRIORITIES = PRIORITY_OPTIONS.map((o) => o.label);

  FIELDS = (fields || []).map((f) => ({
    id: f.key,
    dbId: f.id,
    name: f.name,
    type: f.type,
    system: f.system,
    multi: f.is_multi,
    currency: f.currency || undefined,
    order: f.sort_order,
    width: f.width_px || undefined,
    options: f.type === "select" && !f.system
      ? (f.project_field_options || []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ id: o.id, label: o.label, color: o.color }))
      : f.key === "status"
        ? PROJECT_STATUS_OPTIONS
        : f.key === "priority"
          ? PRIORITY_OPTIONS
          : undefined
  }));

  CLIENTS_BY_ID = new Map((clients || []).map((c) => [c.id, c.name]));
  CLIENTS_BY_NAME = new Map((clients || []).map((c) => [c.name.toLowerCase(), c]));

  await reloadProjects();
}

function toOption(o) {
  return { id: o.id, label: o.label, color: o.color };
}

async function reloadProjects() {
  const client = await sb();

  const [projectsRes, membersRes, milestonesRes] = await Promise.all([
    client.from("projects").select("*").is("deleted_at", null).order("due_date", { ascending: true }),
    client.from("project_members").select("project_id, team_member_id, is_lead"),
    client.from("milestones").select("*, milestone_assignees(team_member_id)").order("sort_order")
  ]);
  for (const res of [projectsRes, membersRes, milestonesRes]) if (res.error) throw res.error;
  const { data: rows } = projectsRes, { data: memberRows } = membersRes, { data: milestoneRows } = milestonesRes;

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

  PROJECTS = (rows || []).map((row) => mapProjectRow(row, membersByProject, milestonesByProject));
}

/* ---------- projects ---------- */

async function findOrCreateClientId(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return null;
  const existing = CLIENTS_BY_NAME.get(trimmed.toLowerCase());
  if (existing) return existing.id;

  const client = await sb();
  const { data, error } = await client.from("clients").insert({ name: trimmed }).select().single();
  if (error) throw error;
  CLIENTS_BY_ID.set(data.id, data.name);
  CLIENTS_BY_NAME.set(data.name.toLowerCase(), data);
  return data.id;
}

async function createProject({ title = "", deadline, startDate } = {}) {
  const client = await sb();
  const { data, error } = await client
    .from("projects")
    .insert({
      title,
      status_id: optionId("project_status", "Planning"),
      priority_id: optionId("priority", "Normal"),
      start_date: startDate || null,
      due_date: deadline,
      is_draft: true,
      created_by: window.CURRENT_PROFILE?.id
    })
    .select()
    .single();
  if (error) throw error;

  const project = mapProjectRow(data, new Map(), new Map());
  project.isDraft = true;
  PROJECTS.push(project);
  return project;
}

async function duplicateProject(original) {
  const client = await sb();
  const { data, error } = await client
    .from("projects")
    .insert({
      client_id: original.clientId,
      title: `${original.title} (copy)`,
      description: original.description,
      service: original.service,
      status_id: optionId("project_status", original.status),
      priority_id: optionId("priority", original.priority),
      start_date: original.startDate,
      due_date: original.deadline,
      estimated_value: original.estimatedValue,
      notes: original.notes,
      custom_fields: original.custom
    })
    .select()
    .single();
  if (error) throw error;

  const copy = mapProjectRow(data, new Map(), new Map());
  PROJECTS.unshift(copy);
  return copy;
}

async function softDeleteProject(project) {
  const client = await sb();
  await mutate(client.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", project.id), "delete that project");
  PROJECTS.splice(PROJECTS.findIndex((p) => p.id === project.id), 1);
}

async function archiveProject(project) {
  await setCellValue(project, FIELDS.find((f) => f.id === "status"), "Archived");
}

/* getCellValue/setCellValue stay the single choke point studio.js already
   uses — system fields map to a real column (or, for client/assignee, a
   relationship), everything else lives in custom_fields. */

function getCellValue(project, field) {
  if (field.id === "assignee") return project.team;
  if (field.id === "client") return project.client;
  return field.system ? project[field.id] : project.custom[field.id];
}

async function setCellValue(project, field, value) {
  const client = await sb();

  if (project.isDraft) {
    await mutate(client.from("projects").update({ is_draft: false }).eq("id", project.id), "edit that project");
    project.isDraft = false;
  }

  if (field.id === "assignee") {
    await setProjectAssignees(project, value);
    return;
  }

  if (field.id === "client") {
    const clientId = await findOrCreateClientId(value);
    await mutate(client.from("projects").update({ client_id: clientId }).eq("id", project.id), "change the client");
    project.clientId = clientId;
    project.client = value;
    return;
  }

  if (field.system) {
    const column = { title: "title", description: "description", service: "service",
      startDate: "start_date", deadline: "due_date", estimatedValue: "estimated_value", notes: "notes" }[field.id];
    if (field.id === "status" || field.id === "priority") {
      const kind = field.id === "status" ? "project_status" : "priority";
      const dbColumn = field.id === "status" ? "status_id" : "priority_id";
      await mutate(client.from("projects").update({ [dbColumn]: optionId(kind, value) }).eq("id", project.id), `change ${field.name.toLowerCase()}`);
    } else if (column) {
      await mutate(client.from("projects").update({ [column]: value }).eq("id", project.id), `edit ${field.name}`);
    }
    project[field.id] = value;
  } else {
    const nextCustom = { ...project.custom, [field.id]: value };
    await mutate(client.from("projects").update({ custom_fields: nextCustom }).eq("id", project.id), `edit ${field.name}`);
    project.custom = nextCustom;
  }
}

async function setProjectAssignees(project, teamMemberIds) {
  const client = await sb();
  const current = new Set(project.team);
  const next = new Set(teamMemberIds);
  const toAdd = [...next].filter((id) => !current.has(id));
  const toRemove = [...current].filter((id) => !next.has(id));

  if (toRemove.length) {
    await mutate(client.from("project_members").delete().eq("project_id", project.id).in("team_member_id", toRemove), "remove that team member");
  }
  if (toAdd.length) {
    const wasEmpty = current.size === 0;
    const { error } = await client.from("project_members").insert(
      toAdd.map((id, i) => ({ project_id: project.id, team_member_id: id, is_lead: wasEmpty && i === 0 }))
    );
    if (error) throw error;
  }
  project.team = teamMemberIds;
}

async function setProjectLead(project, teamMemberId) {
  const client = await sb();
  const { error: clearErr } = await client.from("project_members").update({ is_lead: false }).eq("project_id", project.id);
  if (clearErr) throw clearErr;
  await mutate(client.from("project_members").update({ is_lead: true }).eq("project_id", project.id).eq("team_member_id", teamMemberId), "set that project lead");
  project.leadMemberId = teamMemberId;
}

/* ---------- milestones ---------- */

async function createMilestone(project, { title, dueDate } = {}) {
  const client = await sb();
  const { data, error } = await client
    .from("milestones")
    .insert({
      project_id: project.id,
      title: title || "Untitled milestone",
      due_date: dueDate || null,
      status_id: optionId("milestone_status", "Not started"),
      priority_id: optionId("priority", "Normal"),
      sort_order: project.milestones.length
    })
    .select("*, milestone_assignees(team_member_id)")
    .single();
  if (error) throw error;

  const milestone = mapMilestoneRow(data);
  project.milestones.push(milestone);
  return milestone;
}

async function setMilestoneField(project, milestone, key, value) {
  const client = await sb();
  const columnMap = { title: "title", description: "description", dueDate: "due_date", clientVisible: "client_visible" };

  if (key === "status" || key === "priority") {
    const kind = key === "status" ? "milestone_status" : "priority";
    const column = key === "status" ? "status_id" : "priority_id";
    await mutate(client.from("milestones").update({ [column]: optionId(kind, value) }).eq("id", milestone.id), `change milestone ${key}`);
  } else if (columnMap[key]) {
    await mutate(client.from("milestones").update({ [columnMap[key]]: value }).eq("id", milestone.id), `edit that milestone`);
  }
  milestone[key] = value;
}

async function setMilestoneAssignees(milestone, teamMemberIds) {
  const client = await sb();
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
  milestone.assignees = teamMemberIds;
}

async function deleteMilestone(project, milestone) {
  const client = await sb();
  await mutate(client.from("milestones").delete().eq("id", milestone.id), "delete that milestone");
  project.milestones.splice(project.milestones.findIndex((m) => m.id === milestone.id), 1);
}

/* ---------- fields (custom columns) ---------- */

/* project_fields.sort_order is a Postgres integer column — every write
   below computes a whole-number position (shifting later columns up by
   one when inserting in the middle) rather than the fractional +0.5
   offsets an earlier version of this file used, which Postgres rejects
   outright ("invalid input syntax for type integer"). */
async function shiftFieldsFrom(client, fromIndex) {
  const toShift = FIELDS.filter((f) => f.order >= fromIndex);
  if (!toShift.length) return;
  await Promise.all(toShift.map((f) => client.from("project_fields").update({ sort_order: f.order + 1 }).eq("id", f.dbId)));
  toShift.forEach((f) => { f.order += 1; });
}

async function createField({ name, type, options = [], insertAfterId } = {}) {
  const client = await sb();
  normalizeFieldOrder();
  const insertIndex = insertAfterId ? FIELDS.findIndex((f) => f.id === insertAfterId) + 1 : FIELDS.length;
  await shiftFieldsFrom(client, insertIndex);

  const { data, error } = await client
    .from("project_fields")
    .insert({ key: `custom_${crypto.randomUUID()}`, name, type, system: false, sort_order: insertIndex, currency: type === "money" ? "KES" : null })
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

  const field = { id: data.key, dbId: data.id, name: data.name, type: data.type, system: false, order: data.sort_order, width: undefined, options: fieldOptions };
  FIELDS.splice(insertIndex, 0, field);
  return field;
}

async function renameField(field, name) {
  const client = await sb();
  await mutate(client.from("project_fields").update({ name }).eq("id", field.dbId), "rename that column");
  field.name = name;
}

async function resizeField(field, widthPx) {
  const client = await sb();
  const width = Math.round(widthPx);
  await mutate(client.from("project_fields").update({ width_px: width }).eq("id", field.dbId), "resize that column");
  field.width = width;
}

async function reorderFields(orderedFields) {
  const client = await sb();
  await Promise.all(
    orderedFields.map((f, i) => client.from("project_fields").update({ sort_order: i }).eq("id", f.dbId))
  );
  orderedFields.forEach((f, i) => { f.order = i; });
}

function normalizeFieldOrder() {
  FIELDS.sort((a, b) => a.order - b.order);
}

async function duplicateField(field) {
  const client = await sb();
  normalizeFieldOrder();
  const sourceIndex = FIELDS.findIndex((f) => f.id === field.id);
  const insertIndex = sourceIndex + 1;
  await shiftFieldsFrom(client, insertIndex);

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
  const sourceProjects = PROJECTS.filter((p) => p.custom[field.id] !== undefined);
  await Promise.all(
    sourceProjects.map(async (p) => {
      const nextCustom = { ...p.custom, [data.key]: p.custom[field.id] };
      const { error: copyErr } = await client.from("projects").update({ custom_fields: nextCustom }).eq("id", p.id);
      if (copyErr) throw copyErr;
      p.custom = nextCustom;
    })
  );

  const copy = { id: data.key, dbId: data.id, name: data.name, type: data.type, system: false, order: data.sort_order, width: undefined, options: fieldOptions };
  FIELDS.splice(insertIndex, 0, copy);
  return copy;
}

async function deleteField(field) {
  const client = await sb();
  await mutate(client.from("project_fields").delete().eq("id", field.dbId), "delete that column");
  FIELDS.splice(FIELDS.findIndex((f) => f.id === field.id), 1);
  PROJECTS.forEach((p) => delete p.custom[field.id]);
}

/* ---------- options (status / priority / milestone-status / custom-select) ---------- */

const OPTION_COLOR_PALETTE = ["#a9a7a4", "#4f8cff", "#3ddc84", "#ffb54d", "#ff8a3d", "#ff5a5f", "#a855f7", "#22c1c3", "#f2b705", "#756e6a"];

async function addSystemOption(kind, label) {
  const client = await sb();
  const list = { project_status: PROJECT_STATUS_OPTIONS, priority: PRIORITY_OPTIONS, milestone_status: MILESTONE_STATUS_OPTIONS }[kind];
  const { data, error } = await client
    .from("project_option_lists")
    .insert({ kind, label, color: OPTION_COLOR_PALETTE[list.length % OPTION_COLOR_PALETTE.length], sort_order: list.length })
    .select()
    .single();
  if (error) throw error;
  list.push(toOption(data));
  if (kind === "project_status") PROJECT_STATUSES = PROJECT_STATUS_OPTIONS.map((o) => o.label);
  if (kind === "priority") PRIORITIES = PRIORITY_OPTIONS.map((o) => o.label);
  return data;
}

async function recolorSystemOption(kind, option) {
  const client = await sb();
  const next = OPTION_COLOR_PALETTE[(OPTION_COLOR_PALETTE.indexOf(option.color) + 1 + OPTION_COLOR_PALETTE.length) % OPTION_COLOR_PALETTE.length];
  await mutate(client.from("project_option_lists").update({ color: next }).eq("id", option.id), "recolor that option");
  option.color = next;
}

async function deleteSystemOption(kind, option) {
  const client = await sb();
  await mutate(client.from("project_option_lists").delete().eq("id", option.id), "delete that option");
  const list = { project_status: PROJECT_STATUS_OPTIONS, priority: PRIORITY_OPTIONS, milestone_status: MILESTONE_STATUS_OPTIONS }[kind];
  list.splice(list.findIndex((o) => o.id === option.id), 1);
}

async function addFieldOption(field, label) {
  const client = await sb();
  const { data, error } = await client
    .from("project_field_options")
    .insert({ field_id: field.dbId, label, color: OPTION_COLOR_PALETTE[(field.options?.length || 0) % OPTION_COLOR_PALETTE.length], sort_order: field.options?.length || 0 })
    .select()
    .single();
  if (error) throw error;
  field.options = [...(field.options || []), { id: data.id, label: data.label, color: data.color }];
}

async function recolorFieldOption(field, option) {
  const client = await sb();
  const next = OPTION_COLOR_PALETTE[(OPTION_COLOR_PALETTE.indexOf(option.color) + 1 + OPTION_COLOR_PALETTE.length) % OPTION_COLOR_PALETTE.length];
  await mutate(client.from("project_field_options").update({ color: next }).eq("id", option.id), "recolor that option");
  option.color = next;
}

async function deleteFieldOption(field, option) {
  const client = await sb();
  await mutate(client.from("project_field_options").delete().eq("id", option.id), "delete that option");
  field.options = field.options.filter((o) => o.id !== option.id);
}

/* ---------- files, comments (lazy-loaded per project, see studio.js's openProjectDetail) ---------- */

async function loadProjectFiles(project) {
  const client = await sb();
  const { data, error } = await client.from("project_files").select("*, profiles(full_name)").eq("project_id", project.id).order("created_at");
  if (error) throw error;
  project.files = (data || []).map((f) => ({
    id: f.id, name: f.original_filename, type: f.original_filename.split(".").pop(),
    category: f.category, size: formatBytes(f.size_bytes), uploadedBy: f.profiles?.full_name || "—",
    uploadedAt: f.created_at?.slice(0, 10), visibility: f.visibility, storagePath: f.storage_path
  }));
}

function formatBytes(bytes) {
  if (!bytes) return "—";
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

async function uploadProjectFile(project, file, { category = "Working Files", visibility = "Internal" } = {}) {
  const client = await sb();
  const path = `${project.id}/${crypto.randomUUID()}_${file.name}`;
  const { error: uploadErr } = await client.storage.from("project-files").upload(path, file);
  if (uploadErr) throw uploadErr;

  const { data, error } = await client
    .from("project_files")
    .insert({ project_id: project.id, storage_path: path, original_filename: file.name, category, size_bytes: file.size, visibility, uploaded_by: window.CURRENT_PROFILE?.id })
    .select()
    .single();
  if (error) throw error;

  const record = { id: data.id, name: file.name, type: file.name.split(".").pop(), category, size: formatBytes(file.size), uploadedBy: window.CURRENT_USER, uploadedAt: todayISO(), visibility, storagePath: path };
  project.files.push(record);
  return record;
}

async function deleteProjectFile(project, file) {
  const client = await sb();
  // Delete the metadata row first — it's RLS-protected (only the
  // uploader or an admin can), so this is the real permission check.
  // Only remove the Storage object once that's confirmed, so a rejected
  // delete never leaves an orphaned metadata row pointing at nothing.
  await mutate(client.from("project_files").delete().eq("id", file.id), "delete that file");
  await client.storage.from("project-files").remove([file.storagePath]);
  project.files.splice(project.files.findIndex((f) => f.id === file.id), 1);
}

async function loadProjectComments(project) {
  const client = await sb();
  const { data, error } = await client.from("project_comments").select("*").eq("project_id", project.id).order("created_at");
  if (error) throw error;
  project.comments = (data || []).map((c) => ({
    id: c.id, author: c.author_display_name, authorType: c.author_type, content: c.content, createdAt: c.created_at, context: c.context_file_id
  }));
}

async function addComment(project, content) {
  const client = await sb();
  const { data, error } = await client
    .from("project_comments")
    .insert({ project_id: project.id, author_profile_id: window.CURRENT_PROFILE?.id, author_display_name: window.CURRENT_USER, author_type: "studio", content })
    .select()
    .single();
  if (error) throw error;
  const comment = { id: data.id, author: data.author_display_name, authorType: data.author_type, content: data.content, createdAt: data.created_at };
  project.comments.push(comment);
  return comment;
}

async function loadProjectActivity(project) {
  const client = await sb();
  const { data, error } = await client.from("project_activity").select("*").eq("project_id", project.id).order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  project.activity = (data || []).map((a) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.created_at, visibility: a.visibility }));
}

/* ---------- Overview: data spanning every project, not just the one
   whose detail drawer happens to be open ---------- */

async function loadRecentActivityAcrossProjects(limit = 6) {
  const client = await sb();
  const { data, error } = await client
    .from("project_activity")
    .select("id, type, description, created_at, projects(title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((a) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.created_at, projectTitle: a.projects?.title || "" }));
}

async function loadPendingClientReplies() {
  const client = await sb();
  const { data, error } = await client
    .from("project_comments")
    .select("id, project_id, author_display_name, author_type, created_at, projects(id, title)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const lastCommentByProject = new Map();
  (data || []).forEach((c) => {
    if (!lastCommentByProject.has(c.project_id)) lastCommentByProject.set(c.project_id, c);
  });

  return [...lastCommentByProject.values()]
    .filter((c) => c.author_type === "client")
    .map((c) => ({ projectId: c.project_id, projectTitle: c.projects?.title || "", author: c.author_display_name, createdAt: c.created_at }));
}
