/*
 * Innov8 Studios — Marketing & Sales state, ported from marketing.js's
 * local mutable copies of the mock data (mktProspects/mktCampaigns) and
 * its filter/mutation functions. Entirely in-memory, exactly like the
 * legacy page — nothing here talks to Supabase, and nothing survives a
 * refresh. That's intentional; see marketingMock.js's header comment.
 */
import { useState } from "react";
import { MKT_CAMPAIGNS, MKT_PROSPECTS } from "./marketingMock.js";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

let prospectSeed = MKT_PROSPECTS.length;
let campaignSeed = MKT_CAMPAIGNS.length;

export function useMarketing() {
  const [prospects, setProspects] = useState(() => MKT_PROSPECTS.map((p) => ({ ...p, history: [...p.history] })));
  const [campaigns, setCampaigns] = useState(() => MKT_CAMPAIGNS.map((c) => ({ ...c })));

  function findProspect(id) {
    return prospects.find((p) => p.id === id);
  }
  function findCampaign(id) {
    return campaigns.find((c) => c.id === id);
  }

  function addProspect({ business, contact, industry, serviceInterest, channel, nextFollowUp, notes }) {
    prospectSeed += 1;
    const prospect = {
      id: `pr-new-${prospectSeed}`,
      business,
      industry,
      serviceInterest,
      channel,
      status: "New",
      contact: { name: contact, role: "" },
      email: "",
      phone: "",
      lastContact: null,
      nextFollowUp: nextFollowUp || null,
      notes: notes || "",
      history: []
    };
    setProspects((list) => [prospect, ...list]);
    return prospect;
  }

  function logOutreachActivity(prospectId, note) {
    let updated = null;
    setProspects((list) =>
      list.map((p) => {
        if (p.id !== prospectId) return p;
        updated = {
          ...p,
          history: [...p.history, { date: todayISO(), label: note }],
          lastContact: todayISO(),
          status: p.status === "New" ? "Contacted" : p.status
        };
        return updated;
      })
    );
    return updated;
  }

  function addProspectNote(prospectId, label) {
    setProspects((list) =>
      list.map((p) => (p.id === prospectId ? { ...p, history: [...p.history, { date: todayISO(), label }], lastContact: todayISO() } : p))
    );
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
      timeline: [{ date: todayISO(), label: "Campaign drafted" }],
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
    prospects,
    campaigns,
    findProspect,
    findCampaign,
    addProspect,
    logOutreachActivity,
    addProspectNote,
    addCampaign,
    toggleCampaignPause
  };
}
