/*
 * Innov8 Studios — MARKETING & SALES mock data. Prospects/Outreach and
 * the Overview KPIs/Next Actions built from them are now real (see
 * data/outreach.js, useOutreach.js, Overview.jsx) — only MKT_STATUS_META
 * (the Outreach status vocabulary, matched verbatim by the
 * contacts.outreach_status check constraint) and MKT_CAMPAIGNS (Studio
 * Campaigns, out of scope for this phase) remain here.
 */
export const MKT_STATUS_META = {
  New: { badge: "soon", color: "#a9a7a4" },
  Contacted: { badge: "pending", color: "#4f8cff" },
  Replied: { badge: "active", color: "#3ddc84" },
  "Meeting Scheduled": { badge: "active", color: "#3ddc84" },
  "Follow-up Due": { badge: "urgent", color: "#ffb54d" },
  "Not Interested": { badge: "soon", color: "#756e6a" }
};

export const MKT_CAMPAIGNS = [
  {
    id: "camp-1", name: "Motion / 3D Commercials",
    objective: "Generate enquiries for Motion Graphics & 3D services.",
    description: "Generate enquiries for Motion Graphics & 3D Commercial services.",
    service: "Motion Graphics + 3D", status: "Active", targetAudience: "Nairobi businesses",
    platforms: ["Instagram", "TikTok"], dateRange: { start: "2026-09-01", end: "2026-09-30" }, budget: 3000, cta: "Get a quote",
    kpis: { reach: 12400, impressions: 18900, engagement: 2300, profileVisits: 1180, linkClicks: 83, enquiries: 17, leads: 8, opportunities: 5, revenue: 480000 },
    platformBreakdown: [
      { platform: "Instagram", reach: 8420, engagement: 1620, clicks: 51, leads: 11, costPerEnquiry: 96 },
      { platform: "TikTok", reach: 4060, engagement: 721, clicks: 32, leads: 6, costPerEnquiry: 142 }
    ],
    performanceSeries: [180, 240, 310, 420, 390, 460, 520, 610, 580, 690, 750, 720, 810, 890],
    timeline: [
      { date: "2026-09-01", label: "Campaign launched across Instagram & TikTok" },
      { date: "2026-09-06", label: "3D commercial creative published" },
      { date: "2026-09-12", label: "Reach crossed 8,000 — boosted top-performing reel" },
      { date: "2026-09-20", label: "17th enquiry received" }
    ],
    insightsSummary: "Campaign is performing above expectations, driven mainly by the 3D commercial reel on Instagram.",
    insights: [
      { title: "Instagram is driving more qualified enquiries", body: "Instagram generated more enquiries despite TikTok having strong engagement." },
      { title: "3D content is outperforming static content", body: "The 3D commercial generated the highest engagement and enquiry rate of any asset in this campaign." },
      { title: "Best-performing audience", body: "Nairobi businesses in real estate and hospitality showed the strongest response." },
      { title: "Best-performing platform", body: "Instagram generated the highest number of qualified leads at the lowest cost per enquiry." }
    ],
    funnel: [
      { stage: "Reach", value: 12400 }, { stage: "Engagement", value: 2300 }, { stage: "Profile Visits", value: 1180 },
      { stage: "Clicks", value: 83 }, { stage: "Enquiries", value: 17 }, { stage: "Leads", value: 8 }, { stage: "Opportunities", value: 5 }
    ],
    assets: [
      { name: "Main 3D Commercial", platform: "Instagram", format: "Reel", views: 8200, engagements: 412, enquiries: 7 },
      { name: "Instagram Reel — Behind the Scenes", platform: "Instagram", format: "Reel", views: 4300, engagements: 268, enquiries: 3 },
      { name: "TikTok Cut", platform: "TikTok", format: "Video", views: 4060, engagements: 721, enquiries: 4 },
      { name: "Instagram Story — Studio Tour", platform: "Instagram", format: "Story", views: 2100, engagements: 96, enquiries: 1 },
      { name: "Static Creative — Service Card", platform: "Instagram", format: "Static Post", views: 1850, engagements: 74, enquiries: 1 },
      { name: "Campaign Thumbnail", platform: "Instagram", format: "Static Post", views: 940, engagements: 31, enquiries: 1 }
    ]
  },
  {
    id: "camp-2", name: "Social Media Design Showcase",
    objective: "Showcase social media design work to win monthly retainer clients.",
    description: "Showcase social media design work to win monthly retainer clients.",
    service: "Social Media Design", status: "Active", targetAudience: "Nairobi SMEs & hospitality brands",
    platforms: ["Instagram", "Facebook"], dateRange: { start: "2026-08-15", end: "2026-09-15" }, budget: 5000, cta: "Book a call",
    kpis: { reach: 9600, impressions: 14200, engagement: 1740, profileVisits: 860, linkClicks: 61, enquiries: 12, leads: 6, opportunities: 3, revenue: 210000 },
    platformBreakdown: [
      { platform: "Instagram", reach: 6900, engagement: 1310, clicks: 44, leads: 5, costPerEnquiry: 118 },
      { platform: "Facebook", reach: 2700, engagement: 430, clicks: 17, leads: 1, costPerEnquiry: 205 }
    ],
    performanceSeries: [120, 160, 210, 260, 300, 280, 340, 380, 410, 390, 430, 470, 500, 540],
    timeline: [
      { date: "2026-08-15", label: "Campaign launched" },
      { date: "2026-08-24", label: "Carousel grid showcase published" },
      { date: "2026-09-05", label: "Boosted top carousel post" }
    ],
    insightsSummary: "Campaign is performing on target, with Instagram carrying most of the qualified interest.",
    insights: [
      { title: "Carousels outperform single-image posts", body: "Multi-slide grid showcases drove nearly double the saves of single-image creative." },
      { title: "Facebook reach is cheap but shallow", body: "Facebook reach is high-volume but converts to enquiries at a much lower rate than Instagram." }
    ],
    funnel: [
      { stage: "Reach", value: 9600 }, { stage: "Engagement", value: 1740 }, { stage: "Profile Visits", value: 860 },
      { stage: "Clicks", value: 61 }, { stage: "Enquiries", value: 12 }, { stage: "Leads", value: 6 }, { stage: "Opportunities", value: 3 }
    ],
    assets: [
      { name: "Grid Showcase Carousel", platform: "Instagram", format: "Carousel", views: 5100, engagements: 640, enquiries: 5 },
      { name: "Before / After Reel", platform: "Instagram", format: "Reel", views: 3200, engagements: 388, enquiries: 3 },
      { name: "Facebook Boosted Post", platform: "Facebook", format: "Static Post", views: 2700, engagements: 430, enquiries: 1 },
      { name: "Campaign Thumbnail", platform: "Instagram", format: "Static Post", views: 780, engagements: 42, enquiries: 0 }
    ]
  },
  {
    id: "camp-3", name: "Website Design Sprint",
    objective: "Fill two open website-design slots for October.",
    description: "Fill two open website-design production slots for October.",
    service: "Website Design", status: "Paused", targetAudience: "Nairobi finance & real estate firms",
    platforms: ["LinkedIn", "Instagram"], dateRange: { start: "2026-08-01", end: "2026-08-31" }, budget: 8000, cta: "Get a quote",
    kpis: { reach: 5200, impressions: 7100, engagement: 640, profileVisits: 310, linkClicks: 39, enquiries: 6, leads: 2, opportunities: 1, revenue: 0 },
    platformBreakdown: [
      { platform: "LinkedIn", reach: 3400, engagement: 420, clicks: 28, leads: 2, costPerEnquiry: 480 },
      { platform: "Instagram", reach: 1800, engagement: 220, clicks: 11, leads: 0, costPerEnquiry: 0 }
    ],
    performanceSeries: [80, 110, 140, 160, 150, 170, 190, 175, 160, 150, 140, 130, 120, 110],
    timeline: [
      { date: "2026-08-01", label: "Campaign launched" },
      { date: "2026-08-14", label: "LinkedIn case-study post published" },
      { date: "2026-08-28", label: "Paused — production slots filled ahead of schedule" }
    ],
    insightsSummary: "Campaign under-performed relative to spend and was paused early once both slots were filled organically.",
    insights: [
      { title: "LinkedIn out-converted Instagram for this service", body: "B2B website-design enquiries came almost entirely through LinkedIn." },
      { title: "Cost per enquiry ran high", body: "This service line needs a sharper offer or case study before the next flight." }
    ],
    funnel: [
      { stage: "Reach", value: 5200 }, { stage: "Engagement", value: 640 }, { stage: "Profile Visits", value: 310 },
      { stage: "Clicks", value: 39 }, { stage: "Enquiries", value: 6 }, { stage: "Leads", value: 2 }, { stage: "Opportunities", value: 1 }
    ],
    assets: [
      { name: "LinkedIn Case Study Post", platform: "LinkedIn", format: "Static Post", views: 3400, engagements: 420, enquiries: 4 },
      { name: "Instagram Story — Portfolio", platform: "Instagram", format: "Story", views: 1800, engagements: 220, enquiries: 2 }
    ]
  },
  {
    id: "camp-4", name: "Branding for Startups",
    objective: "Win identity/branding projects from newly-funded Nairobi startups.",
    description: "Win identity and branding projects from newly-funded Nairobi startups.",
    service: "Branding", status: "Completed", targetAudience: "Early-stage Nairobi startups",
    platforms: ["Instagram", "TikTok", "Facebook"], dateRange: { start: "2026-06-01", end: "2026-06-30" }, budget: 6000, cta: "Book a call",
    kpis: { reach: 15800, impressions: 22400, engagement: 3120, profileVisits: 1540, linkClicks: 102, enquiries: 21, leads: 11, opportunities: 6, revenue: 890000 },
    platformBreakdown: [
      { platform: "Instagram", reach: 9200, engagement: 1980, clicks: 66, leads: 8, costPerEnquiry: 88 },
      { platform: "TikTok", reach: 4600, engagement: 890, clicks: 27, leads: 2, costPerEnquiry: 150 },
      { platform: "Facebook", reach: 2000, engagement: 250, clicks: 9, leads: 1, costPerEnquiry: 220 }
    ],
    performanceSeries: [200, 260, 340, 410, 480, 560, 640, 700, 780, 820, 860, 900, 870, 840],
    timeline: [
      { date: "2026-06-01", label: "Campaign launched" },
      { date: "2026-06-09", label: "Rebrand case-study reel published" },
      { date: "2026-06-18", label: "Reach crossed 10,000" },
      { date: "2026-06-30", label: "Campaign completed — 21 enquiries logged" }
    ],
    insightsSummary: "The best-performing campaign the Studio has run to date — strong performance across every platform.",
    insights: [
      { title: "Rebrand storytelling resonated strongly", body: "The before/after identity case study was the single highest-performing asset the Studio has posted." },
      { title: "Instagram remained the primary lead driver", body: "Instagram converted at nearly 3x the rate of Facebook, consistent with other campaigns." },
      { title: "Startup founders respond to founder-to-founder tone", body: "Copy written in a peer voice outperformed formal agency copy in this audience." }
    ],
    funnel: [
      { stage: "Reach", value: 15800 }, { stage: "Engagement", value: 3120 }, { stage: "Profile Visits", value: 1540 },
      { stage: "Clicks", value: 102 }, { stage: "Enquiries", value: 21 }, { stage: "Leads", value: 11 }, { stage: "Opportunities", value: 6 }
    ],
    assets: [
      { name: "Rebrand Case Study Reel", platform: "Instagram", format: "Reel", views: 9200, engagements: 1120, enquiries: 9 },
      { name: "TikTok Process Cut", platform: "TikTok", format: "Video", views: 4600, engagements: 890, enquiries: 5 },
      { name: "Facebook Carousel", platform: "Facebook", format: "Carousel", views: 2000, engagements: 250, enquiries: 2 },
      { name: "Instagram Story — Logo Reveal", platform: "Instagram", format: "Story", views: 1900, engagements: 340, enquiries: 3 },
      { name: "Static Creative — Before/After", platform: "Instagram", format: "Static Post", views: 1400, engagements: 210, enquiries: 2 },
      { name: "Campaign Thumbnail", platform: "Instagram", format: "Static Post", views: 620, engagements: 45, enquiries: 0 }
    ]
  },
  {
    id: "camp-5", name: "Creative Retainer Program",
    objective: "Promote the Studio's monthly creative retainer package.",
    description: "Promote the Studio's monthly creative retainer package to established Nairobi brands.",
    service: "Creative Retainer", status: "Draft", targetAudience: "Established Nairobi brands",
    platforms: ["Instagram", "LinkedIn"], dateRange: { start: "2026-10-01", end: "2026-10-31" }, budget: 4000, cta: "Learn more",
    kpis: { reach: 0, impressions: 0, engagement: 0, profileVisits: 0, linkClicks: 0, enquiries: 0, leads: 0, opportunities: 0, revenue: 0 },
    platformBreakdown: [
      { platform: "Instagram", reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 },
      { platform: "LinkedIn", reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 }
    ],
    performanceSeries: [],
    timeline: [{ date: "2026-08-30", label: "Campaign drafted — creative in production" }],
    insightsSummary: "Campaign hasn't launched yet — insights will populate once it goes live on Oct 1.",
    insights: [],
    funnel: ["Reach", "Engagement", "Profile Visits", "Clicks", "Enquiries", "Leads", "Opportunities"].map((stage) => ({ stage, value: 0 })),
    assets: [{ name: "Retainer Offer — Static Draft", platform: "Instagram", format: "Static Post", views: 0, engagements: 0, enquiries: 0 }]
  }
];
