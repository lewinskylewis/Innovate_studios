/*
 * Innov8 Studios — placeholder content for Home sections whose modules
 * (Enquiries, Relationships, website analytics) don't exist yet, ported
 * from legacy/mock-data.js. "Active work" / project counts are NOT here
 * — those come from src/data/home.js's real Supabase queries. This file
 * only covers the parts legacy/home.js itself documented as staying
 * mock until their own modules are built (see that file's comments).
 */
export const income = {
  periods: {
    "last-month": { value: "KES 1,842,600", trend: "+12.4% vs last month", direction: "up", series: [8, 10, 9, 13, 15, 14, 18, 21] },
    "avg-3": { value: "KES 1,610,200", trend: "+8.1% vs prior 3-month avg.", direction: "up", series: [11, 13, 12, 14, 15, 16, 17, 18] },
    "avg-6": { value: "KES 1,420,900", trend: "+5.6% vs prior 6-month avg.", direction: "up", series: [9, 10, 11, 10, 12, 13, 14, 15] }
  }
};

export const otherStats = [
  { label: "Open enquiries", value: "4", trend: "1 awaiting reply", direction: "down", icon: "enquiries" },
  { label: "New leads", value: "9", trend: "+9 this week", direction: "up", icon: "relationships" },
  { label: "Website sessions", value: "2,438", trend: "+18% vs last week", direction: "up", icon: "globe" }
];

export const enquiries = [
  { name: "Amina Otieno", phone: "+254 712 445 210", email: "amina.otieno@gmail.com", service: "Brand Identity", status: "pending" },
  { name: "David Mwangi", phone: "+254 700 118 823", email: "d.mwangi@outlook.com", service: "3D Product Renders", status: "pending" },
  { name: "Sarah Kimani", phone: "+254 722 908 471", email: "sarah.kimani@hospitality.co.ke", service: "Website Redesign", status: "active" },
  { name: "Kevin Njoroge", phone: "+254 733 560 902", email: "kevin.n@eventsco.com", service: "Motion Graphics", status: "active" }
];

export const relationships = [
  { name: "Amina Otieno", source: "Website enquiry" },
  { name: "Wanjiru Kamau", source: "Referral — Stanbic" },
  { name: "Peter Otieno", source: "LinkedIn" },
  { name: "Grace Achieng", source: "Instagram" }
];

export const activity = [
  { type: "website", text: "Hero slide 02 replaced with new campaign render", time: "1h ago" },
  { type: "studio", text: "Lewis shared 3 new deliverables on Jubilee Insurance", time: "3h ago" },
  { type: "website", text: "“Nike Kenya” case study published to Portfolio", time: "Yesterday" },
  { type: "studio", text: "New comment on Stanbic Bank — Brand Campaign", time: "Yesterday" },
  { type: "website", text: "Client logos reordered on homepage", time: "2 days ago" }
];

export const websiteAnalytics = {
  periods: {
    "24h": { sessions: [12, 18, 9, 34, 52, 41, 22], bounceRate: "41%", bounceDelta: -3, avgSession: "2m 48s", avgSessionDelta: 6, impressions: "3.1K", impressionsDelta: 9, clicks: "142", clicksDelta: 14, ctr: "4.6%", ctrDelta: 4, avgPosition: "8.2", avgPositionDelta: 5 },
    "7d": { sessions: [280, 310, 340, 300, 380, 410, 418], bounceRate: "38%", bounceDelta: -5, avgSession: "3m 12s", avgSessionDelta: 8, impressions: "21.4K", impressionsDelta: 11, clicks: "986", clicksDelta: 18, ctr: "4.6%", ctrDelta: 3, avgPosition: "7.9", avgPositionDelta: 6 },
    "14d": { sessions: [240, 260, 300, 280, 350, 390, 400, 410, 300, 340, 360, 380, 400, 418], bounceRate: "39%", bounceDelta: -2, avgSession: "3m 05s", avgSessionDelta: 4, impressions: "38.9K", impressionsDelta: 7, clicks: "1.8K", clicksDelta: 12, ctr: "4.5%", ctrDelta: 2, avgPosition: "8.1", avgPositionDelta: 3 },
    "30d": { sessions: [210, 230, 260, 240, 300, 340, 360, 380, 300, 320, 340, 360, 400, 418, 260, 280, 300, 320, 340, 360], bounceRate: "40%", bounceDelta: 1, avgSession: "2m 58s", avgSessionDelta: -2, impressions: "82.6K", impressionsDelta: 15, clicks: "3.9K", clicksDelta: 21, ctr: "4.7%", ctrDelta: 6, avgPosition: "8.4", avgPositionDelta: -1 }
  }
};
