/*
 * Innov8 Studios — Insights module mock data, following the same
 * per-module *Mock.js convention as homeMock.js / marketingMock.js /
 * enquiriesMock.js: real data (Studio projects, Enquiries, Relationships,
 * Outreach prospects) is loaded live via src/data/insights.js; anything
 * with no backend integration yet (Meta/Instagram, GA4/Search Console,
 * per-campaign performance numbers) lives here instead, clearly isolated
 * so the later real integrations are a drop-in replacement for this file
 * alone — nothing else needs to change.
 */

// ---------- Meta (Instagram/Facebook) — no Meta Graph API integration exists yet ----------
export const meta = {
  kpis: { reach: 48200, reachDelta: 34, engagementRate: 6.8, engagementDelta: 1.2, followers: 8420, followersDelta: 4.7, profileActions: 1284, profileActionsDelta: 18 },
  performance: {
    reach: [3200, 4100, 3800, 5200, 6100, 5800, 6400, 7100, 6800, 7400, 8100, 7800],
    engagement: [4.2, 4.8, 5.1, 5.4, 5.9, 6.1, 6.4, 6.2, 6.6, 6.9, 6.7, 6.8],
    followers: [7900, 7950, 8010, 8060, 8120, 8180, 8230, 8280, 8320, 8360, 8390, 8420],
    profileActions: [820, 890, 940, 1010, 1080, 1120, 1150, 1190, 1210, 1240, 1260, 1284]
  },
  topContent: [
    { id: "c1", label: "Campaign Reel", type: "Reel", reach: 12400, engagement: 9.2, actions: 86 },
    { id: "c2", label: "3D Product Post", type: "Post", reach: 8700, engagement: 8.4, actions: 63 },
    { id: "c3", label: "Brand Carousel", type: "Carousel", reach: 6100, engagement: 6.8, actions: 41 }
  ],
  insights: [
    { label: "Reels", detail: "Highest reach — consistently the top-performing format this period." },
    { label: "3D work", detail: "Highest engagement rate of any content type produced." },
    { label: "Educational carousels", detail: "Highest saves — the format most likely to be revisited." }
  ]
};

// ---------- Website (GA4 / Search Console) — no integration exists yet ----------
export const website = {
  kpis: { users: 12842, usersDelta: 18, sessions: 16904, sessionsDelta: 14, engagementRate: 61.4, engagementDelta: 4.2, conversions: 84, conversionsDelta: 21 },
  traffic: {
    "7d": { users: [1200, 1350, 1280, 1490, 1610, 1540, 1690], sessions: [1500, 1680, 1590, 1820, 1990, 1900, 2050], conversions: [8, 11, 9, 13, 15, 12, 14] },
    "30d": { users: Array.from({ length: 30 }, (_, i) => 300 + Math.round(Math.sin(i / 3) * 80 + i * 12)), sessions: Array.from({ length: 30 }, (_, i) => 400 + Math.round(Math.sin(i / 3) * 100 + i * 16)), conversions: Array.from({ length: 30 }, (_, i) => 2 + Math.round(Math.sin(i / 4) * 2 + i * 0.2)) },
    "90d": { users: Array.from({ length: 12 }, (_, i) => 8000 + i * 400), sessions: Array.from({ length: 12 }, (_, i) => 10500 + i * 520), conversions: Array.from({ length: 12 }, (_, i) => 40 + i * 4) }
  },
  trafficSources: [
    { source: "Organic Search", percent: 42 },
    { source: "Direct", percent: 27 },
    { source: "Social", percent: 19 },
    { source: "Referral", percent: 12 }
  ],
  topPages: [
    { page: "Home", views: 8421, engagement: 64 },
    { page: "Work", views: 3182, engagement: 71 },
    { page: "Services", views: 2741, engagement: 68 },
    { page: "Contact", views: 1204, engagement: 52 }
  ],
  // Visitors/Engaged Visitors are mock (no GA4 yet) — Enquiries/Qualified
  // Opportunities/Projects should eventually be swapped for the real
  // counts src/data/insights.js already derives from Enquiries/Studio,
  // filtered to source = "Website", once GA4 attribution exists to
  // confirm which enquiries actually originated from the site.
  businessFunnel: { visitors: 12842, engaged: 7891, enquiries: 84, qualified: 31, projects: 8 }
};

// ---------- Outreach campaign performance — campaigns exist as identity
// records in Supabase (name/status/dates/budget) but performance numbers
// (contacted/responses/opportunities per campaign) aren't tracked yet —
// see src/pages/Marketing/marketingMock.js's MKT_CAMPAIGNS for the same
// gap in the Marketing module itself. ----------
export const campaignPerformance = [
  { campaign: "Nairobi Finance", contacted: 32, responses: 11, opportunities: 3 },
  { campaign: "Real Estate", contacted: 28, responses: 7, opportunities: 2 },
  { campaign: "Healthcare", contacted: 21, responses: 5, opportunities: 1 }
];

export const outreachInsight = "Finance outreach currently produces the strongest opportunity rate.";

// ---------- Overview "Performance" trend chart — no historical
// snapshots exist anywhere in the schema yet (every real number
// src/data/insights.js returns is a current-state total), so a real
// period-over-period trend line can't be computed honestly. This is a
// clearly-structured placeholder shape (not random noise) so the chart
// itself is fully functional; replace with a real time-series query
// once daily/weekly snapshots exist. ----------
export const overviewTrend = {
  enquiries: [18, 21, 19, 24, 22, 27, 25, 29, 26, 31, 30, 34],
  projects: [3, 3, 4, 4, 5, 5, 5, 6, 6, 6, 7, 7],
  revenue: [180000, 195000, 210000, 205000, 230000, 245000, 250000, 265000, 280000, 300000, 310000, 420000]
};
