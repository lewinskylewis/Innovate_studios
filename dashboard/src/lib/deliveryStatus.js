/*
 * Innov8 Studios — the Delivery Status automation (Studio table,
 * computed/read-only column). Deliberately NOT a stored column: GOOD/
 * PENDING/LATE depends on the current wall-clock time, so a value
 * written at one moment can silently go stale the instant a deadline
 * passes with nothing re-touching the row. Computing it at read time
 * instead means it's always correct on every load/render, with no
 * cron/trigger needed to "catch" the deadline passing — see
 * supabase/migrations/20260906000002's header comment.
 */

const PENDING_STATUSES = new Set(["Under Review", "Stuck", "Archived"]);
const LATE_STATUSES = new Set(["Planning", "Active"]);

// Matches the colors the user had already set on the option list of the
// manually-set "Delivery Status" column this automation replaces.
export const DELIVERY_STATUS_COLOR = { GOOD: "#3ddc84", PENDING: "#ffb54d", LATE: "#ff5a5f" };

/*
 * project: needs .deadline (Due Date and Time, ISO string) and
 * .completedAt (ISO string or null, set/cleared by
 * data/studio.js's updateProjectField on every status change).
 * statusLabel: the project's current Status option label.
 */
export function computeDeliveryStatus(project, statusLabel) {
  if (!project?.deadline || !statusLabel) return null;
  const due = new Date(project.deadline);
  if (statusLabel === "Completed") {
    if (!project.completedAt) return null;
    return new Date(project.completedAt) <= due ? "GOOD" : "LATE";
  }
  if (new Date() <= due) return null;
  if (PENDING_STATUSES.has(statusLabel)) return "PENDING";
  if (LATE_STATUSES.has(statusLabel)) return "LATE";
  return null;
}
