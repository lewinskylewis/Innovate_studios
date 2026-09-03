/*
 * Innov8 Studios — Marketing & Sales state. Prospects/Outreach are now
 * real, backed by public.contacts via useOutreach.js/data/outreach.js —
 * see that file's header for the full mapping. Studio Campaigns stay
 * exactly as before: local, in-memory, ported from marketing.js's
 * mktCampaigns — out of scope for this phase (Campaign Performance
 * wiring is a separate piece of work; see marketingMock.js's header).
 *
 * The public API surface below is unchanged from the old fully-mock
 * hook on purpose — every component that consumes this hook
 * (Marketing.jsx, Overview.jsx, Outreach.jsx, ProspectDetail.jsx,
 * NewProspectModal.jsx, OutreachActivityModal.jsx, Campaigns.jsx,
 * CampaignDetail.jsx, NewCampaignModal.jsx) keeps working with zero
 * edits beyond Overview.jsx's KPI/Next Actions data source (see that
 * file).
 */
import { useState } from "react";
import { MKT_CAMPAIGNS } from "./marketingMock.js";
import { useOutreach } from "./useOutreach.js";

let campaignSeed = MKT_CAMPAIGNS.length;

export function useMarketing() {
  const outreach = useOutreach();
  const [campaigns, setCampaigns] = useState(() => MKT_CAMPAIGNS.map((c) => ({ ...c })));

  function findCampaign(id) {
    return campaigns.find((c) => c.id === id);
  }

  function addCampaign({ name, objective, description, service, targetAudience, platforms, startDate, endDate, budget, cta }) {
    campaignSeed += 1;
    const usedPlatforms = platforms.length ? platforms : ["Instagram"];
    const campaign = {
      id: `camp-new-${campaignSeed}`,
      name,
      objective,
      description: description || "",
      service,
      status: "Draft",
      targetAudience: targetAudience || "—",
      platforms: usedPlatforms,
      dateRange: { start: startDate, end: endDate },
      budget: Number(budget) || 0,
      cta: cta || "Get a quote",
      kpis: { reach: 0, impressions: 0, engagement: 0, profileVisits: 0, linkClicks: 0, enquiries: 0, leads: 0, opportunities: 0, revenue: 0 },
      platformBreakdown: usedPlatforms.map((p) => ({ platform: p, reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 })),
      performanceSeries: [],
      timeline: [{ date: new Date().toISOString().slice(0, 10), label: "Campaign drafted" }],
      insightsSummary: "Campaign hasn't launched yet — insights will populate once it goes live.",
      insights: [],
      funnel: ["Reach", "Engagement", "Profile Visits", "Clicks", "Enquiries", "Leads", "Opportunities"].map((stage) => ({ stage, value: 0 })),
      assets: []
    };
    setCampaigns((list) => [campaign, ...list]);
    return campaign;
  }

  function toggleCampaignPause(campaignId) {
    let nextStatus = null;
    setCampaigns((list) =>
      list.map((c) => {
        if (c.id !== campaignId) return c;
        nextStatus = c.status === "Paused" ? "Active" : "Paused";
        return { ...c, status: nextStatus };
      })
    );
    return nextStatus;
  }

  return {
    prospects: outreach.prospects,
    leadsGenerated: outreach.leadsGenerated,
    activeOpportunities: outreach.activeOpportunities,
    loading: outreach.loading,
    error: outreach.error,
    reload: outreach.reload,
    findProspect: outreach.findProspect,
    addProspect: outreach.addProspect,
    logOutreachActivity: outreach.logOutreachActivity,
    addProspectNote: outreach.addProspectNote,

    campaigns,
    findCampaign,
    addCampaign,
    toggleCampaignPause
  };
}
