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

  // Plain columns + single-column FK embeds only (contacts.id is a
  // simple FK, safe to embed). Status labels are resolved client-side
  // against a small lookup, avoiding a filtered embed on the composite
  // status_id/status_kind FK guard from 20260831000006_projects.sql.
  const [{ data: statusRows, error: statusError }, { data: projectRows, error: projectError }] = await Promise.all([
    client.from("project_option_lists").select("id, label").eq("kind", "project_status"),
    client
      .from("projects")
      .select("id, title, due_date, status_id, estimated_value, contacts(brand_name, person_name), milestones(status_id)")
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
    client: row.contacts?.brand_name || "",
    status: statusLabel.get(row.status_id) || "—",
    estimatedValue: row.estimated_value === null ? 0 : Number(row.estimated_value),
    milestoneTotal: row.milestones?.length || 0,
    milestoneDone: (row.milestones || []).filter((m) => m.status_id === completedStatusId).length
  }));

  // "Active/ongoing" = not Completed, not Archived, not soft-deleted
  // (already excluded by the .is("deleted_at", null) query filter) —
  // the exact same definition StudioOverview.jsx's "Active projects"
  // stat and this same function's activeCount already use. Income is
  // the sum of that set's Budget (projects.estimated_value) — a
  // running total, not a monthly figure; there is no per-period
  // income data to slice by yet.
  const activeProjects = withStatus.filter((p) => !["Completed", "Archived"].includes(p.status));
  const activeCount = activeProjects.length;
  const totalBudget = activeProjects.reduce((sum, p) => sum + p.estimatedValue, 0);
  const items = activeProjects.slice(0, limit);
  const weeklyBudget = currentMonthWeeklyBudget(activeProjects);

  return { activeCount, totalBudget, weeklyBudget, items };
}

/* Real, derived breakdown of the same Budget total the headline figure
   sums — buckets each active project's Budget into whichever week
   (1-7 / 8-14 / 15-21 / 22-end) of the CURRENT calendar month its
   due_date falls in. A project with no due date, or one due outside
   the current month, still counts toward the headline total but has
   no week to show it in here — this is a supplementary view of a
   subset, not a second income source. */
function currentMonthWeeklyBudget(activeProjects) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const buckets = [0, 0, 0, 0];
  for (const p of activeProjects) {
    if (!p.dueDate) continue;
    const due = new Date(`${p.dueDate}T00:00:00`);
    if (due.getFullYear() !== year || due.getMonth() !== month) continue;
    const day = due.getDate();
    const weekIndex = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    buckets[weekIndex] += p.estimatedValue;
  }
  return buckets;
}
