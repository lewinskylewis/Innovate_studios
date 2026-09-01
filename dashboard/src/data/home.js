/*
 * Innov8 Studios — Home page data, ported from legacy/home.js's
 * renderStats()/renderWork(). Deliberately its own small queries rather
 * than reusing src/data/studio.js's full loadStudioData() — Home only
 * ever needs the "Active work" count and a due-date-ordered shortlist,
 * not the whole Studio module's team/fields/milestone graph.
 */
import { supabase } from "../lib/supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase is not configured — see dashboard/public/env.example.js.");
  return supabase;
}

export async function loadActiveWork(limit = 4) {
  const client = requireClient();

  // Plain columns + single-column FK embeds only (clients.id is a simple
  // FK, safe to embed). Status labels are resolved client-side against a
  // small lookup, avoiding a filtered embed on the composite
  // status_id/status_kind FK guard from 20260831000006_projects.sql.
  const [{ data: statusRows, error: statusError }, { data: projectRows, error: projectError }] = await Promise.all([
    client.from("project_option_lists").select("id, label").eq("kind", "project_status"),
    client
      .from("projects")
      .select("id, title, due_date, status_id, clients(name), milestones(status_id)")
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
  ]);
  if (statusError) throw statusError;
  if (projectError) throw projectError;

  const statusLabel = new Map((statusRows || []).map((s) => [s.id, s.label]));
  const completedStatusId = (statusRows || []).find((s) => s.label === "Completed")?.id;

  const withStatus = (projectRows || []).map((row) => ({
    id: row.id,
    title: row.title,
    dueDate: row.due_date,
    client: row.clients?.name || "",
    status: statusLabel.get(row.status_id) || "—",
    milestoneTotal: row.milestones?.length || 0,
    milestoneDone: (row.milestones || []).filter((m) => m.status_id === completedStatusId).length
  }));

  const activeCount = withStatus.filter((p) => !["Completed", "Archived"].includes(p.status)).length;
  const items = withStatus.filter((p) => !["Completed", "Archived"].includes(p.status)).slice(0, limit);

  return { activeCount, items };
}
