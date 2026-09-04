/*
 * Innov8 Studios — public "shared project" data layer, for the
 * unauthenticated /project/:projectSlug route only (see
 * pages/Studio/SharedProject.jsx). Backed entirely by the anon-role RLS
 * policies + column grants added in supabase/migrations/
 * 20260904000001_project_public_sharing.sql — no RPC/SECURITY DEFINER
 * function, same declarative-policy pattern as every other data-layer
 * module, and no changes to data/studio.js's own authenticated queries.
 *
 * Does NOT reuse loadProjectFiles()/loadProjectActivity() from
 * data/studio.js, despite both being plain project-id-scoped queries —
 * both use `select("*")` (project_activity has actor_profile_id, never
 * granted to anon and never rendered anywhere, so select("*") 42501s)
 * and loadProjectFiles additionally embeds `profiles(full_name)`.
 * Verified directly: a PostgREST embed/join fails for the anon role
 * even when both sides' columns are individually granted — its join
 * mechanism needs more than column-level SELECT once column grants are
 * in play at all. So every query in this module lists exact columns
 * and never embeds; profile names are resolved via a second plain
 * query instead. Reuses formatBytes (now exported) from data/studio.js
 * so the "2.4 MB" formatting stays identical, not duplicated.
 *
 * client_id is used the same way — read directly, then a separate plain
 * contacts query by id, never an embed. client_id itself never appears
 * in this module's output — only contacts.brand_name does.
 */
import { supabase } from "../lib/supabaseClient.js";
import { formatBytes } from "./studio.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

function mapMilestoneRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    dueDate: row.due_date,
    statusId: row.status_id,
    clientVisible: row.client_visible,
    sortOrder: row.sort_order
  };
}

/* Plain query, no embed (see header comment) — RLS (20260905000004)
   already scopes this to author_type='client' OR visibility='client'
   rows, so no extra .eq() filtering is needed here, same pattern as
   loadClientVisibleFiles/loadClientVisibleActivity below. */
async function loadClientVisibleComments(client, projectId) {
  const { data, error } = await client
    .from("project_comments")
    .select("id, author_display_name, author_type, content, visibility, created_at")
    .eq("project_id", projectId)
    .order("created_at");
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

/* The only way an anonymous Client View visitor can write anything —
   always posts author_type='client', author_display_name='Client' (no
   per-visitor identity; see 20260905000003's with-check, which requires
   author_profile_id is null). */
export async function postComment(projectId, content) {
  const client = requireClient();
  const { data, error } = await client
    .from("project_comments")
    .insert({ project_id: projectId, author_display_name: "Client", author_type: "client", content })
    .select("id, project_id, author_display_name, author_type, content, visibility, created_at")
    .single();
  if (error) throw error;
  return { id: data.id, author: data.author_display_name, authorType: data.author_type, content: data.content, visibility: data.visibility, createdAt: data.created_at };
}

/* Same output shape as data/studio.js's loadProjectFiles(), including
   the same formatBytes()/date-slicing conventions — just Client-
   visibility only, and no PostgREST embed for the uploader's name (see
   header comment). */
async function loadClientVisibleFiles(client, projectId) {
  const { data, error } = await client
    .from("project_files")
    .select("id, storage_path, original_filename, category, size_bytes, visibility, uploaded_by, created_at")
    .eq("project_id", projectId)
    .eq("visibility", "Client")
    .order("created_at");
  if (error) throw error;
  const rows = data || [];

  const uploaderIds = [...new Set(rows.map((f) => f.uploaded_by).filter(Boolean))];
  const nameById = new Map();
  if (uploaderIds.length) {
    const { data: profileRows, error: profileError } = await client.from("profiles").select("id, full_name").in("id", uploaderIds);
    if (profileError) throw profileError;
    (profileRows || []).forEach((p) => nameById.set(p.id, p.full_name));
  }

  return rows.map((f) => ({
    id: f.id,
    name: f.original_filename,
    type: f.original_filename.split(".").pop(),
    category: f.category,
    size: formatBytes(f.size_bytes),
    uploadedBy: nameById.get(f.uploaded_by) || "—",
    uploadedAt: f.created_at?.slice(0, 10),
    visibility: f.visibility,
    storagePath: f.storage_path
  }));
}

/* Same output shape as data/studio.js's loadProjectActivity() (which
   never surfaces actor_profile_id to the frontend either) — just
   visibility = 'client' only. */
async function loadClientVisibleActivity(client, projectId) {
  const { data, error } = await client
    .from("project_activity")
    .select("id, type, description, visibility, created_at")
    .eq("project_id", projectId)
    .eq("visibility", "client")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []).map((a) => ({ id: a.id, type: a.type, description: a.description, createdAt: a.created_at, visibility: a.visibility }));
}

/* Loads exactly the Client-View-safe subset of one project, by its
   public slug — nothing internal (notes, custom_fields, estimated_value,
   team assignments, status/priority, internal comments/files/activity)
   is ever queried here. Returns null if the slug doesn't match a
   non-deleted project. */
export async function loadSharedProject(slug) {
  const client = requireClient();

  const { data: row, error } = await client
    .from("projects")
    .select("id, title, description, start_date, due_date, client_id")
    .eq("public_slug", slug)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const [contactRes, milestonesRes, statusOptionsRes, files, activity, comments] = await Promise.all([
    row.client_id ? client.from("contacts").select("brand_name").eq("id", row.client_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    client
      .from("milestones")
      .select("id, title, description, due_date, status_id, client_visible, sort_order")
      .eq("project_id", row.id)
      .eq("client_visible", true)
      .order("sort_order"),
    client.from("project_option_lists").select("id, label").eq("kind", "milestone_status"),
    loadClientVisibleFiles(client, row.id),
    loadClientVisibleActivity(client, row.id),
    loadClientVisibleComments(client, row.id)
  ]);
  if (contactRes.error) throw contactRes.error;
  if (milestonesRes.error) throw milestonesRes.error;
  if (statusOptionsRes.error) throw statusOptionsRes.error;

  const milestoneStatusLabelById = new Map((statusOptionsRes.data || []).map((s) => [s.id, s.label]));

  return {
    project: {
      id: row.id,
      title: row.title,
      description: row.description || "",
      client: contactRes.data?.brand_name || "",
      startDate: row.start_date,
      deadline: row.due_date,
      milestones: (milestonesRes.data || []).map(mapMilestoneRow),
      files,
      activity,
      team: [],
      comments,
      isDraft: false
    },
    // Only the milestoneStatus kind resolves this way — the stub studio
    // object passed to ProjectDetail never needs project status/priority
    // labels, since neither renders in Client View (see ProjectDetail.jsx's
    // own header comment: status/priority aren't shown in the drawer).
    labelFor(kind, id) {
      if (kind === "milestoneStatus") return milestoneStatusLabelById.get(id) || "";
      return "";
    }
  };
}
