/*
 * Innov8 Studios — Enquiries-specific formatting + query helpers,
 * mirroring the split relationshipsFormat.js keeps from
 * src/lib/format.js: generic date/money helpers stay in lib/format.js,
 * everything that only makes sense for an enquiry record lives here.
 */
import { daysUntil } from "../../lib/format.js";

export const STATUS_BADGE = { New: "soon", Contacted: "waiting", Qualifying: "pending", Qualified: "pending", Converted: "active", Closed: "urgent" };

export const CONVERSION_BADGE = { Contact: "waiting", Prospect: "pending", Lead: "pending", Client: "active", Partner: "active" };

export function followupState(enquiry) {
  if (!enquiry.nextFollowUp) return "none";
  const diff = daysUntil(enquiry.nextFollowUp);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "week";
  return "later";
}

export function isOpen(enquiry) {
  return !["Converted", "Closed"].includes(enquiry.status);
}

export function needsAttention(enquiry) {
  if (followupState(enquiry) === "overdue") return true;
  if (!isOpen(enquiry)) return false;
  if (enquiry.status === "New" && daysUntil(enquiry.dateReceived) <= -2) return true;
  if (["High", "Urgent"].includes(enquiry.priority)) return true;
  return false;
}

export function attentionReason(enquiry) {
  if (followupState(enquiry) === "overdue") return `Follow-up overdue — ${enquiry.followUpNote || "no reason set"}`;
  if (enquiry.status === "New") return "New enquiry, not yet contacted";
  if (enquiry.status === "Qualifying") return "Qualification pending";
  if (["High", "Urgent"].includes(enquiry.priority)) return `${enquiry.priority} priority opportunity`;
  return "Needs review";
}

export function buildTimeline(enquiry) {
  const items = [];
  (enquiry.events || []).forEach((e) => items.push({ id: `ev-${e.id}`, date: e.date, kind: e.type, label: e.label }));
  (enquiry.notes || []).forEach((n) => items.push({ id: `note-${n.id}`, date: n.date, kind: "note", label: n.text, meta: n.author }));
  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function matchesQuickState(enquiry, state) {
  if (state === "all") return true;
  if (state === "attention") return needsAttention(enquiry);
  if (state === "overdue") return followupState(enquiry) === "overdue";
  if (state === "open") return isOpen(enquiry);
  if (state === "recent") return daysUntil(enquiry.dateReceived) >= -7;
  return true;
}

export function searchMatches(enquiry, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (enquiry.personName || "").toLowerCase().includes(q) ||
    (enquiry.brandName || "").toLowerCase().includes(q) ||
    (enquiry.email || "").toLowerCase().includes(q) ||
    (enquiry.phone || "").toLowerCase().includes(q)
  );
}

export function formatServiceList(list) {
  if (!list || !list.length) return "—";
  return list.join(", ");
}

export const QUICK_STATES = [
  { key: "all", label: "All" },
  { key: "attention", label: "Attention Required" },
  { key: "overdue", label: "Overdue" },
  { key: "open", label: "Open" },
  { key: "recent", label: "Recently Added" }
];
