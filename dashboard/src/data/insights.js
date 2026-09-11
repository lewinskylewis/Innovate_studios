/*
 * Innov8 Studios — Insights module aggregation layer. A read-only layer
 * over the Studio/Enquiries/Relationships/Outreach data that already
 * exists — it never owns records, never writes anything, and never
 * re-derives a number a module already computes for itself (reuses
 * data/home.js's loadActiveWork for Budget/Paid/Balance totals, and
 * lib/deliveryStatus.js's computeDeliveryStatus/computeBalance for
 * per-project health, exactly like the Studio table and Home's income
 * card already do).
 *
 * Anything with no real backend integration yet (Meta/Instagram, GA4/
 * Search Console, per-campaign performance) is NOT computed here — see
 * pages/Insights/insightsMock.js, merged in by the page components
 * directly. This file only ever returns real, currently-true numbers.
 *
 * No historical snapshots exist anywhere in this schema, so period-
 * over-period deltas (e.g. "+18.4%") cannot be computed honestly yet —
 * every figure below is a current-state total, never a fabricated trend.
 * Callers should render "—" for a trend rather than inventing one.
 */
import { loadStudioData } from "./studio.js";
import { loadActiveWork } from "./home.js";
import { loadEnquiriesData } from "./enquiries.js";
import { loadRelationshipsData } from "./relationships.js";
import { loadOutreachData } from "./outreach.js";
import { computeDeliveryStatus, computeBalance } from "../lib/deliveryStatus.js";
import { isOpen, needsAttention } from "../pages/Enquiries/enquiriesFormat.js";
import { daysUntil } from "../lib/format.js";

const ACTIVE_STATUSES = ["Planning", "Active", "Under Review", "Stuck"];

function projectsSummary(studioData) {
  const { projects, projectStatusOptions } = studioData;
  const statusLabel = (id) => projectStatusOptions.find((o) => o.id === id)?.label || "—";

  const withDerived = projects.map((p) => {
    const status = statusLabel(p.statusId);
    return { ...p, status, deliveryStatus: computeDeliveryStatus(p, status), balance: computeBalance(p) };
  });

  const active = withDerived.filter((p) => ACTIVE_STATUSES.includes(p.status));
  const completed = withDerived.filter((p) => p.status === "Completed");
  const late = withDerived.filter((p) => p.deliveryStatus === "LATE");

  const healthy = active.filter((p) => p.deliveryStatus !== "LATE" && p.deliveryStatus !== "PENDING").length;
  const atRisk = active.filter((p) => p.deliveryStatus === "PENDING").length;
  const lateActive = active.filter((p) => p.deliveryStatus === "LATE").length;

  const completedWithOutcome = completed.filter((p) => p.deliveryStatus === "GOOD" || p.deliveryStatus === "LATE");
  const onTimeRate = completedWithOutcome.length ? Math.round((completedWithOutcome.filter((p) => p.deliveryStatus === "GOOD").length / completedWithOutcome.length) * 100) : null;

  const durations = completed.filter((p) => p.startDate && p.completedAt).map((p) => Math.max(0, Math.round((new Date(p.completedAt) - new Date(p.startDate)) / 86400000)));
  const avgDuration = durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null;

  const withValue = withDerived.filter((p) => p.estimatedValue != null);
  const avgValue = withValue.length ? Math.round(withValue.reduce((s, p) => s + p.estimatedValue, 0) / withValue.length) : null;

  const approachingDeadline = active.filter((p) => {
    if (!p.deadline || p.deliveryStatus === "LATE") return false;
    const d = daysUntil(p.deadline);
    return d !== null && d >= 0 && d <= 3;
  });

  return {
    total: projects.length,
    active: active.length,
    completed: completed.length,
    late: late.length,
    health: { healthy, atRisk, late: lateActive },
    delivery: { onTimeRate, avgDuration, avgValue },
    pipeline: {
      planning: withDerived.filter((p) => p.status === "Planning").length,
      active: withDerived.filter((p) => p.status === "Active").length,
      review: withDerived.filter((p) => p.status === "Under Review" || p.status === "Stuck").length,
      completed: completed.length
    },
    approachingDeadline,
    lateProjects: late
  };
}

function enquiriesSummary(enquiriesData, clientsWithProjects) {
  const list = enquiriesData.enquiries;
  const total = list.length;
  // "At least qualified" — status is a single current value, not a
  // history, so a Converted enquiry no longer literally says
  // "Qualified"; counting both keeps the funnel monotonically
  // decreasing (Qualified is always >= Converted).
  const atLeastQualified = list.filter((e) => e.status === "Qualified" || e.status === "Converted").length;
  const qualified = list.filter((e) => e.status === "Qualified").length;
  const converted = list.filter((e) => e.status === "Converted").length;
  const conversionRate = total ? Math.round((converted / total) * 1000) / 10 : 0;
  const uncontacted = list.filter((e) => e.status === "New").length;

  const sourceMap = new Map();
  for (const e of list) {
    const key = e.source || "Other";
    if (!sourceMap.has(key)) sourceMap.set(key, { source: key, count: 0, converted: 0 });
    const row = sourceMap.get(key);
    row.count += 1;
    if (e.status === "Converted") row.converted += 1;
  }
  const sources = [...sourceMap.values()].sort((a, b) => b.count - a.count);

  // Best-effort "time to first action" — the earliest logged activity
  // event after the enquiry came in, for enquiries that have any event
  // at all. There is no dedicated "first contacted at" column, so this
  // is a proxy, not an exact response-time metric.
  const responseDays = list
    .filter((e) => e.events?.length)
    .map((e) => {
      const first = [...e.events].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      return Math.max(0, (new Date(first.date) - new Date(e.dateReceived)) / 86400000);
    })
    .sort((a, b) => a - b);
  const medianResponseDays = responseDays.length ? responseDays[Math.floor(responseDays.length / 2)] : null;

  const needingAttention = list.filter(needsAttention).length;

  return {
    total,
    atLeastQualified,
    qualified,
    converted,
    conversionRate,
    uncontacted,
    sources,
    medianResponseDays,
    open: list.filter(isOpen).length,
    needingAttention,
    // Same org-wide "Client with a real Studio project" proxy used by
    // the Outreach funnel — see that function's own comment. Reused
    // here (not re-derived) so the Enquiry funnel's "Projects" stage
    // means the same thing everywhere it's shown.
    projects: clientsWithProjects
  };
}

function outreachSummary(outreachData, clientsWithProjects) {
  const prospects = outreachData.prospects;
  const contactsReached = prospects.length;
  const responses = prospects.filter((p) => p.status !== "New").length;
  const positiveResponses = prospects.filter((p) => ["Replied", "Meeting Scheduled"].includes(p.status)).length;
  const opportunities = outreachData.leadsGenerated;

  return { contactsReached, responses, positiveResponses, opportunities, projectsWon: clientsWithProjects, activeOpportunities: outreachData.activeOpportunities };
}

export async function loadInsightsData() {
  const [studioData, activeWork, enquiriesData, relationshipsData, outreachData] = await Promise.all([
    loadStudioData(),
    loadActiveWork(4),
    loadEnquiriesData(),
    loadRelationshipsData(),
    loadOutreachData()
  ]);

  // No source-tracking exists yet to attribute a Client's projects back
  // to the specific enquiry or outreach lead that produced them — this
  // is the best available org-wide proxy (every real Client contact
  // with at least one Studio project), not a strict per-record cohort
  // count. Shared by both the Enquiry funnel and the Outreach funnel's
  // final "Projects" stage so they mean the same thing everywhere.
  const clientsWithProjects = relationshipsData.contacts.filter((r) => r.type === "Client" && r.projects?.length).length;

  const projects = projectsSummary(studioData);
  const enquiries = enquiriesSummary(enquiriesData, clientsWithProjects);
  const outreach = outreachSummary(outreachData, clientsWithProjects);

  const newLeadsCount = relationshipsData.contacts.filter((r) => r.type === "Lead").length;

  return {
    finance: { totalBudget: activeWork.totalBudget, collected: activeWork.collected, outstanding: activeWork.outstanding },
    projects,
    enquiries,
    outreach,
    newLeadsCount
  };
}
