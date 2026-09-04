/*
 * Innov8 Studios — formatting helpers shared by Home and Studio, ported
 * from legacy/studio.js and legacy/home.js.
 */
export const STATUS_BADGE = { Planning: "soon", Active: "active", "Under Review": "pending", Stuck: "urgent", Completed: "active", Archived: "soon" };
export const PRIORITY_DOT = { Low: "", Normal: "", High: "pending", Urgent: "urgent" };

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(todayISO());
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

export function isOverdue(dateStr) {
  const diff = daysUntil(dateStr);
  return diff !== null && diff < 0;
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDueLabel(dateStr, isDone) {
  if (isDone) return `Completed ${formatDate(dateStr)}`;
  if (!dateStr) return "No date";
  const diff = daysUntil(dateStr);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff <= 6) return `Due in ${diff}d`;
  return `Due ${formatDate(dateStr)}`;
}

export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// <input type="datetime-local"> needs "YYYY-MM-DDTHH:mm" in the
// browser's local time, with no timezone suffix — reused by both
// Cell.jsx (Ongoing Projects table) and ProjectDetail.jsx (drawer) for
// the Due Date and Time editor.
export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// "4days, 17 hrs. 14mins" — days omitted once it's 0 (same-day due
// items are exactly what this granularity is for), hrs omitted only
// once both days and hours are 0. Comma only after "Ndays" — "hrs."
// and "Nmins" are just space-separated, matching the requested format
// literally.
function formatDueCountdown(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}days, ${hours} hrs. ${minutes}mins`;
  if (hours > 0) return `${hours} hrs. ${minutes}mins`;
  return `${minutes}mins`;
}

/* Project Timeline (Studio table, computed/read-only) — a friendly
   relative phrase derived from Start Date + Due Date and Time, not a
   literal date range (per explicit request: "displayed as e.g. 'Due in
   2 days'", later refined to "Due in 4days, 17 hrs. 14mins" so
   same-day-due projects still show real granularity instead of just
   "Due today"). Due Date and Time carries a real time now, so this
   works off the exact millisecond diff to "now" rather than
   calendar-day rounding. */
export function formatProjectTimeline(startDate, dueDate) {
  if (!startDate && !dueDate) return null;
  if (startDate) {
    const startDiff = daysUntil(startDate);
    if (startDiff !== null && startDiff > 0) {
      return startDiff === 1 ? "Starts tomorrow" : `Starts in ${startDiff}d`;
    }
  }
  if (!dueDate) return "In progress";
  const diffMs = new Date(dueDate) - new Date();
  return diffMs >= 0 ? `Due in ${formatDueCountdown(diffMs)}` : `Overdue by ${formatDueCountdown(-diffMs)}`;
}

export function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = daysUntil(dateStr.slice(0, 10));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return formatDate(dateStr);
}

export function formatMoney(value, currency = "KES") {
  if (!value && value !== 0) return "—";
  return `${currency} ${Number(value).toLocaleString("en-KE")}`;
}
