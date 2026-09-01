/*
 * Innov8 Studios — Relationships-specific formatting + query helpers,
 * mirroring the split marketingFormat.js keeps from src/lib/format.js:
 * generic date/money helpers stay in lib/format.js, everything that
 * only makes sense for a relationship record lives here.
 */
import { daysUntil, formatDate } from "../../lib/format.js";

export const LEAD_STATUS_BADGE = { New: "soon", Contacted: "waiting", Qualified: "pending", Proposal: "pending", Won: "active", Lost: "urgent" };

export const HEALTH_BADGE = { Healthy: "active", "At Risk": "pending", Inactive: "soon" };

export const PRIORITY_BADGE = { Low: "soon", Normal: "waiting", High: "pending", Urgent: "urgent" };

export const TYPE_BADGE = { Contact: "waiting", Prospect: "pending", Lead: "active", Client: "active", Partner: "soon" };

export const PROJECT_STATUS_BADGE = { Active: "active", Completed: "soon" };

export function activeBadge(record) {
  return record.active ? "active" : "soon";
}

export function statusLabel(record) {
  if (record.type === "Lead") return record.status;
  if (record.type === "Client") return record.relationshipHealth;
  return record.active ? "Active" : "Inactive";
}

export function statusBadgeClass(record) {
  if (record.type === "Lead") return LEAD_STATUS_BADGE[record.status] || "soon";
  if (record.type === "Client") return HEALTH_BADGE[record.relationshipHealth] || "soon";
  return activeBadge(record);
}

export function followupState(record) {
  if (!record.nextFollowUp) return "none";
  const diff = daysUntil(record.nextFollowUp);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "week";
  return "later";
}

export function lastActivityDate(record) {
  const dates = [
    record.dateAdded,
    ...(record.notes || []).map((n) => n.date),
    ...(record.interactions || []).map((i) => i.date),
    ...(record.events || []).map((e) => e.date)
  ].filter(Boolean);
  if (!dates.length) return record.dateAdded || null;
  return dates.reduce((latest, d) => (new Date(d) > new Date(latest) ? d : latest));
}

export function buildTimeline(record) {
  const items = [];
  (record.events || []).forEach((e) => items.push({ id: `ev-${e.id}`, date: e.date, kind: e.type, label: e.label }));
  (record.interactions || []).forEach((i) =>
    items.push({ id: `int-${i.id}`, date: i.date, kind: interactionTimelineKind(i.type), label: i.description, meta: i.person })
  );
  (record.notes || []).forEach((n) => items.push({ id: `note-${n.id}`, date: n.date, kind: "note", label: n.text, meta: n.author }));
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function interactionTimelineKind(type) {
  const map = { Email: "email", Call: "call", Meeting: "meeting", Message: "message", Enquiry: "enquiry", Outreach: "outreach", Note: "note", Other: "other" };
  return map[type] || "other";
}

export function totalProjectValue(record) {
  return (record.projects || []).reduce((sum, p) => sum + (p.value || 0), 0);
}

export function activeProjects(record) {
  return (record.projects || []).filter((p) => p.status === "Active");
}

export function completedProjects(record) {
  return (record.projects || []).filter((p) => p.status === "Completed");
}

export function matchesQuickState(record, state) {
  if (state === "all") return true;
  if (state === "needs-followup") return followupState(record) === "week" || followupState(record) === "overdue";
  if (state === "overdue") return followupState(record) === "overdue";
  if (state === "active") return record.active;
  if (state === "recent") return daysUntil(record.dateAdded) >= -14;
  return true;
}

export function searchMatches(record, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (record.personName || "").toLowerCase().includes(q) ||
    (record.brandName || "").toLowerCase().includes(q) ||
    (record.email || "").toLowerCase().includes(q) ||
    (record.phone || "").toLowerCase().includes(q)
  );
}

export function formatServiceList(list) {
  if (!list || !list.length) return "—";
  return list.join(", ");
}

export const QUICK_STATES = [
  { key: "all", label: "All" },
  { key: "needs-followup", label: "Needs Follow-up" },
  { key: "overdue", label: "Overdue" },
  { key: "active", label: "Active" },
  { key: "recent", label: "Recently Added" }
];
