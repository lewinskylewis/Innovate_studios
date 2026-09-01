/*
 * Innov8 Studios — Marketing-specific formatting helpers not already in
 * src/lib/format.js, ported from marketing.js.
 */
import { daysUntil, formatDate } from "../../lib/format.js";

export function formatDateRange(start, end) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function formatCompact(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return String(value);
}

export function followupState(prospect) {
  if (!prospect.nextFollowUp) return "none";
  const diff = daysUntil(prospect.nextFollowUp);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "week";
  return "later";
}

export const CAMPAIGN_STATUS_BADGE = { Active: "active", Paused: "pending", Completed: "soon", Draft: "soon" };
