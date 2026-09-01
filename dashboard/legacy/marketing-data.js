/*
 * Innov8 Studios — MARKETING & SALES module.
 * UI/UX only — every array here is static mock data. Nothing in this
 * file (or marketing.js) talks to Supabase or any external service;
 * that's a deliberate, explicit constraint for this phase, not an
 * oversight. See marketing.js for the same note at the top.
 */

const MKT_KPIS = [
  { label: "Prospects Contacted", value: "132", meta: "+18% this month", direction: "up", icon: "megaphone" },
  { label: "Responses", value: "54", meta: "12 this week", direction: "up", icon: "messages" },
  { label: "Meetings", value: "19", meta: "5 this week", direction: "up", icon: "relationships" },
  { label: "Active Opportunities", value: "27", meta: "8 near close", direction: "up", icon: "insights" },
  { label: "Leads Generated", value: "63", meta: "+9 this week", direction: "up", icon: "enquiries" },
  { label: "Revenue Generated", value: "KES 4.6M", meta: "+22% this quarter", direction: "up", icon: "coin" }
];

const MKT_STATUS_META = {
  New:               { badge: "soon",    color: "#a9a7a4" },
  Contacted:         { badge: "pending", color: "#4f8cff" },
  Replied:           { badge: "active",  color: "#3ddc84" },
  "Meeting Scheduled": { badge: "active", color: "#3ddc84" },
  "Follow-up Due":   { badge: "urgent",  color: "#ffb54d" },
  "Not Interested":  { badge: "soon",    color: "#756e6a" }
};

const MKT_PROSPECTS = [
  {
    id: "pr-1", business: "Safari Lounge", industry: "Hospitality", serviceInterest: "Motion Graphics",
    channel: "Instagram", status: "Contacted",
    contact: { name: "Njeri Kamande", role: "Marketing Lead" }, email: "njeri@safarilounge.co.ke", phone: "+254 711 220 340",
    lastContact: "2026-08-28", nextFollowUp: "2026-09-04",
    notes: "Interested in a reel series for the new rooftop menu launch.",
    history: [
      { date: "2026-08-28", label: "Instagram DM sent" }
    ]
  },
  {
    id: "pr-2", business: "Nairobi Coffee Co.", industry: "Food & Beverage", serviceInterest: "Social Media Design",
    channel: "Email", status: "Replied",
    contact: { name: "Brian Odhiambo", role: "Founder" }, email: "brian@nairobicoffee.co.ke", phone: "+254 722 118 904",
    lastContact: "2026-08-29", nextFollowUp: "2026-09-02",
    notes: "Wants a consistent Instagram grid ahead of their Westlands branch opening.",
    history: [
      { date: "2026-08-26", label: "Cold email sent" },
      { date: "2026-08-29", label: "Prospect replied — asked for a portfolio" }
    ]
  },
  {
    id: "pr-3", business: "Urban Living", industry: "Real Estate", serviceInterest: "3D Commercial",
    channel: "LinkedIn", status: "Follow-up Due",
    contact: { name: "Diana Wafula", role: "Sales & Marketing Manager" }, email: "diana@urbanliving.co.ke", phone: "+254 733 902 117",
    lastContact: "2026-08-30", nextFollowUp: "2026-09-02",
    notes: "Wants a 3D walkthrough for the Kiambu Road show-unit.",
    history: [
      { date: "2026-08-27", label: "Connected on LinkedIn" },
      { date: "2026-08-28", label: "Prospect replied" },
      { date: "2026-08-30", label: "Portfolio sent" },
      { date: "2026-09-02", label: "Follow-up scheduled" }
    ]
  },
  {
    id: "pr-4", business: "Zuri Wellness Spa", industry: "Wellness & Beauty", serviceInterest: "Branding",
    channel: "Instagram", status: "New",
    contact: { name: "Achieng Otieno", role: "Owner" }, email: "achieng@zuriwellness.co.ke", phone: "+254 700 441 228",
    lastContact: null, nextFollowUp: "2026-09-03",
    notes: "Flagged via hashtag research — no outreach sent yet.",
    history: []
  },
  {
    id: "pr-5", business: "Kilimani Motors", industry: "Automotive", serviceInterest: "Website Design",
    channel: "WhatsApp", status: "Meeting Scheduled",
    contact: { name: "Samuel Kariuki", role: "General Manager" }, email: "samuel@kilimanimotors.co.ke", phone: "+254 720 556 812",
    lastContact: "2026-08-25", nextFollowUp: "2026-09-05",
    notes: "Booked a call to scope a new inventory-listing site.",
    history: [
      { date: "2026-08-20", label: "WhatsApp intro sent" },
      { date: "2026-08-23", label: "Prospect replied" },
      { date: "2026-08-25", label: "Discovery call booked for Sept 5" }
    ]
  },
  {
    id: "pr-6", business: "Baraka Foods", industry: "Food & Beverage", serviceInterest: "Motion Graphics",
    channel: "Email", status: "Contacted",
    contact: { name: "Faith Mumbi", role: "Brand Manager" }, email: "faith@barakafoods.co.ke", phone: "+254 715 330 776",
    lastContact: "2026-08-27", nextFollowUp: "2026-09-06",
    notes: "Sent a proposal for a product-launch commercial.",
    history: [
      { date: "2026-08-27", label: "Proposal emailed" }
    ]
  },
  {
    id: "pr-7", business: "Equity Heights Realty", industry: "Real Estate", serviceInterest: "Social Media Design",
    channel: "LinkedIn", status: "Replied",
    contact: { name: "Peter Njuguna", role: "Marketing Director" }, email: "peter@equityheights.co.ke", phone: "+254 733 118 660",
    lastContact: "2026-08-30", nextFollowUp: "2026-09-04",
    notes: "Comparing us against two other studios — wants case studies.",
    history: [
      { date: "2026-08-24", label: "LinkedIn message sent" },
      { date: "2026-08-30", label: "Prospect replied — requested case studies" }
    ]
  },
  {
    id: "pr-8", business: "Savanna Fitness Club", industry: "Wellness & Beauty", serviceInterest: "3D Commercial",
    channel: "Instagram", status: "Follow-up Due",
    contact: { name: "Grace Chebet", role: "Marketing Coordinator" }, email: "grace@savannafitness.co.ke", phone: "+254 701 992 340",
    lastContact: "2026-08-22", nextFollowUp: "2026-09-01",
    notes: "Went quiet after the first portfolio share — due a nudge.",
    history: [
      { date: "2026-08-18", label: "Instagram DM sent" },
      { date: "2026-08-22", label: "Portfolio shared" }
    ]
  },
  {
    id: "pr-9", business: "Nyati Bank", industry: "Finance & Banking", serviceInterest: "Branding",
    channel: "LinkedIn", status: "New",
    contact: { name: "Caroline Wambui", role: "Head of Marketing" }, email: "caroline@nyatibank.co.ke", phone: "+254 722 774 511",
    lastContact: null, nextFollowUp: "2026-09-03",
    notes: "High-value target — needs a tailored, formal first approach.",
    history: []
  },
  {
    id: "pr-10", business: "Little Nairobi Preschool", industry: "Education", serviceInterest: "Social Media Design",
    channel: "WhatsApp", status: "Not Interested",
    contact: { name: "Mercy Adhiambo", role: "Director" }, email: "mercy@littlenairobi.co.ke", phone: "+254 710 664 229",
    lastContact: "2026-08-15", nextFollowUp: null,
    notes: "Budget allocated elsewhere this term — revisit in January.",
    history: [
      { date: "2026-08-12", label: "WhatsApp intro sent" },
      { date: "2026-08-15", label: "Prospect declined for now" }
    ]
  },
  {
    id: "pr-11", business: "Loft Interiors", industry: "Real Estate", serviceInterest: "Creative Retainer",
    channel: "Instagram", status: "Meeting Scheduled",
    contact: { name: "Kevin Mwas", role: "Creative Director" }, email: "kevin@loftinteriors.co.ke", phone: "+254 724 883 105",
    lastContact: "2026-08-26", nextFollowUp: "2026-09-03",
    notes: "Wants an ongoing monthly content retainer, not a one-off.",
    history: [
      { date: "2026-08-19", label: "Instagram DM sent" },
      { date: "2026-08-22", label: "Prospect replied" },
      { date: "2026-08-26", label: "Retainer call booked for Sept 3" }
    ]
  },
  {
    id: "pr-12", business: "Pesa Point Fintech", industry: "Technology", serviceInterest: "Website Design",
    channel: "Email", status: "Contacted",
    contact: { name: "Dennis Kiptoo", role: "Head of Growth" }, email: "dennis@pesapoint.co.ke", phone: "+254 706 552 981",
    lastContact: "2026-08-31", nextFollowUp: "2026-09-07",
    notes: "Wants a landing page refresh ahead of their Series A push.",
    history: [
      { date: "2026-08-31", label: "Cold email sent" }
    ]
  }
];

const MKT_UPCOMING_ACTIONS = [
  { icon: "clock", text: "Follow up with Urban Living", meta: "3D Commercial — due Sept 2" },
  { icon: "insights", text: "Review Motion / 3D Commercials performance", meta: "Active campaign · ends Sept 30" },
  { icon: "megaphone", text: "Contact Nyati Bank", meta: "New prospect — no outreach yet" },
  { icon: "enquiries", text: "Check Social Media Design Showcase enquiries", meta: "3 new since last review" }
];

const MKT_CAMPAIGNS = [
  {
    id: "camp-1",
    name: "Motion / 3D Commercials",
    objective: "Generate enquiries for Motion Graphics & 3D services.",
    description: "Generate enquiries for Motion Graphics & 3D Commercial services.",
    service: "Motion Graphics + 3D",
    status: "Active",
    targetAudience: "Nairobi businesses",
    platforms: ["Instagram", "TikTok"],
    dateRange: { start: "2026-09-01", end: "2026-09-30" },
    budget: 3000,
    cta: "Get a quote",
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
      { stage: "Reach", value: 12400 },
      { stage: "Engagement", value: 2300 },
      { stage: "Profile Visits", value: 1180 },
      { stage: "Clicks", value: 83 },
      { stage: "Enquiries", value: 17 },
      { stage: "Leads", value: 8 },
      { stage: "Opportunities", value: 5 }
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
    id: "camp-2",
    name: "Social Media Design Showcase",
    objective: "Showcase social media design work to win monthly retainer clients.",
    description: "Showcase social media design work to win monthly retainer clients.",
    service: "Social Media Design",
    status: "Active",
    targetAudience: "Nairobi SMEs & hospitality brands",
    platforms: ["Instagram", "Facebook"],
    dateRange: { start: "2026-08-15", end: "2026-09-15" },
    budget: 5000,
    cta: "Book a call",
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
      { stage: "Reach", value: 9600 },
      { stage: "Engagement", value: 1740 },
      { stage: "Profile Visits", value: 860 },
      { stage: "Clicks", value: 61 },
      { stage: "Enquiries", value: 12 },
      { stage: "Leads", value: 6 },
      { stage: "Opportunities", value: 3 }
    ],
    assets: [
      { name: "Grid Showcase Carousel", platform: "Instagram", format: "Carousel", views: 5100, engagements: 640, enquiries: 5 },
      { name: "Before / After Reel", platform: "Instagram", format: "Reel", views: 3200, engagements: 388, enquiries: 3 },
      { name: "Facebook Boosted Post", platform: "Facebook", format: "Static Post", views: 2700, engagements: 430, enquiries: 1 },
      { name: "Campaign Thumbnail", platform: "Instagram", format: "Static Post", views: 780, engagements: 42, enquiries: 0 }
    ]
  },
  {
    id: "camp-3",
    name: "Website Design Sprint",
    objective: "Fill two open website-design slots for October.",
    description: "Fill two open website-design production slots for October.",
    service: "Website Design",
    status: "Paused",
    targetAudience: "Nairobi finance & real estate firms",
    platforms: ["LinkedIn", "Instagram"],
    dateRange: { start: "2026-08-01", end: "2026-08-31" },
    budget: 8000,
    cta: "Get a quote",
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
      { stage: "Reach", value: 5200 },
      { stage: "Engagement", value: 640 },
      { stage: "Profile Visits", value: 310 },
      { stage: "Clicks", value: 39 },
      { stage: "Enquiries", value: 6 },
      { stage: "Leads", value: 2 },
      { stage: "Opportunities", value: 1 }
    ],
    assets: [
      { name: "LinkedIn Case Study Post", platform: "LinkedIn", format: "Static Post", views: 3400, engagements: 420, enquiries: 4 },
      { name: "Instagram Story — Portfolio", platform: "Instagram", format: "Story", views: 1800, engagements: 220, enquiries: 2 }
    ]
  },
  {
    id: "camp-4",
    name: "Branding for Startups",
    objective: "Win identity/branding projects from newly-funded Nairobi startups.",
    description: "Win identity and branding projects from newly-funded Nairobi startups.",
    service: "Branding",
    status: "Completed",
    targetAudience: "Early-stage Nairobi startups",
    platforms: ["Instagram", "TikTok", "Facebook"],
    dateRange: { start: "2026-06-01", end: "2026-06-30" },
    budget: 6000,
    cta: "Book a call",
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
      { stage: "Reach", value: 15800 },
      { stage: "Engagement", value: 3120 },
      { stage: "Profile Visits", value: 1540 },
      { stage: "Clicks", value: 102 },
      { stage: "Enquiries", value: 21 },
      { stage: "Leads", value: 11 },
      { stage: "Opportunities", value: 6 }
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
    id: "camp-5",
    name: "Creative Retainer Program",
    objective: "Promote the Studio's monthly creative retainer package.",
    description: "Promote the Studio's monthly creative retainer package to established Nairobi brands.",
    service: "Creative Retainer",
    status: "Draft",
    targetAudience: "Established Nairobi brands",
    platforms: ["Instagram", "LinkedIn"],
    dateRange: { start: "2026-10-01", end: "2026-10-31" },
    budget: 4000,
    cta: "Learn more",
    kpis: { reach: 0, impressions: 0, engagement: 0, profileVisits: 0, linkClicks: 0, enquiries: 0, leads: 0, opportunities: 0, revenue: 0 },
    platformBreakdown: [
      { platform: "Instagram", reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 },
      { platform: "LinkedIn", reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 }
    ],
    performanceSeries: [],
    timeline: [
      { date: "2026-08-30", label: "Campaign drafted — creative in production" }
    ],
    insightsSummary: "Campaign hasn't launched yet — insights will populate once it goes live on Oct 1.",
    insights: [],
    funnel: [
      { stage: "Reach", value: 0 },
      { stage: "Engagement", value: 0 },
      { stage: "Profile Visits", value: 0 },
      { stage: "Clicks", value: 0 },
      { stage: "Enquiries", value: 0 },
      { stage: "Leads", value: 0 },
      { stage: "Opportunities", value: 0 }
    ],
    assets: [
      { name: "Retainer Offer — Static Draft", platform: "Instagram", format: "Static Post", views: 0, engagements: 0, enquiries: 0 }
    ]
  }
];
