/*
 * Innov8 Studios — Settings module mock/local data, following the same
 * per-module *Mock.js convention as homeMock.js / marketingMock.js /
 * insightsMock.js. Real data (Project Statuses/Priorities, Team
 * Members) is loaded live via useStudio()/data/studio.js — everything
 * here has no backend table/column to persist to yet (studio identity,
 * notification preferences, integrations, appearance, security,
 * system status/activity). Centralized in one file so a future
 * Supabase-backed settings table is a drop-in swap for this module
 * alone.
 */

export const generalDefaults = {
  studioName: "Innov8 Studios",
  businessEmail: "studio@innov8.studio",
  phone: "+254 700 000 000",
  website: "innov8.studio",
  location: "Nairobi, Kenya",
  currency: "KES",
  timezone: "Africa/Nairobi",
  dateFormat: "DD/MM/YYYY",
  language: "English",
  defaultProjectStatus: "Planning",
  defaultProjectPriority: "Normal",
  defaultProjectVisibility: "Private"
};

export const CURRENCIES = ["KES — Kenyan Shilling", "USD — US Dollar", "EUR — Euro", "GBP — British Pound"];
export const TIMEZONES = ["Africa/Nairobi", "Africa/Lagos", "Europe/London", "America/New_York"];
export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];
export const LANGUAGES = ["English", "Swahili"];
export const VISIBILITY_OPTIONS = ["Private", "Team", "Client-visible by default"];

export const clientPortalDefaults = {
  clientAccess: true,
  clientComments: true,
  fileDownloads: true,
  milestoneVisibility: true,
  financialInformation: false
};

export const financialDefaults = {
  currency: "KES",
  paymentTerms: "30 days",
  defaultDeposit: "50%",
  taxEnabled: false
};

// Delivery Status rules — describes the real, live automation in
// lib/deliveryStatus.js; this page is documentation/configuration
// display, not a second copy of the logic.
export const deliveryRules = [
  { key: "GOOD", label: "Good", color: "#3ddc84", description: "Completed before (or exactly at) the due date and time." },
  { key: "PENDING", label: "Pending", color: "#ffb54d", description: "Status is Under Review, Stuck or Archived, and the due date has passed." },
  { key: "LATE", label: "Late", color: "#ff5a5f", description: "Status is Planning, Active or Completed, and the due date has passed." }
];

// System-critical statuses the app itself depends on (see
// src/lib/deliveryStatus.js and src/data/studio.js) — never offered for
// deletion, matching the "not system-critical" guard already used for
// canonical Studio table columns.
export const PROTECTED_STATUS_LABELS = ["Planning", "Active", "Under Review", "Stuck", "Completed", "Archived"];

export const ROLES = ["Owner", "Admin", "Manager", "Creative", "Sales", "Viewer"];

export const ROLE_DESCRIPTIONS = {
  Owner: "Full system access.",
  Admin: "Almost complete access.",
  Manager: "Projects, clients, enquiries and marketing.",
  Creative: "Projects, files, milestones and comments.",
  Sales: "Contacts, enquiries and outreach.",
  Viewer: "Read-only access."
};

// UI representation only — the live permission model is the two-value
// profiles.permission_role (admin / team_member); this matrix documents
// the intended future role system for review, not a working ACL yet.
export const PERMISSION_MATRIX = [
  { permission: "Projects", Owner: "Full", Admin: "Full", Manager: "Manage", Creative: "Edit", Sales: "View", Viewer: "View" },
  { permission: "Contacts", Owner: "Full", Admin: "Full", Manager: "Manage", Creative: "View", Sales: "Manage", Viewer: "View" },
  { permission: "Marketing", Owner: "Full", Admin: "Full", Manager: "Manage", Creative: "View", Sales: "Manage", Viewer: "View" },
  { permission: "Insights", Owner: "Full", Admin: "Full", Manager: "View", Creative: "View", Sales: "View", Viewer: "View" },
  { permission: "Settings", Owner: "Full", Admin: "Manage", Manager: "—", Creative: "—", Sales: "—", Viewer: "—" }
];

export const notificationChannels = [
  { key: "email", label: "Email", description: "Sent to your account email.", enabled: true, editable: true },
  { key: "browser", label: "Browser notifications", description: "Shown by your browser when the dashboard is open.", enabled: true, editable: true },
  { key: "inApp", label: "In-app notifications", description: "Shown inside the dashboard itself.", enabled: true, editable: true },
  { key: "push", label: "Push notifications", description: "Coming soon — no mobile app exists yet.", enabled: false, editable: false }
];

export const notificationEvents = {
  Projects: [
    { key: "projectOverdue", label: "Project becomes overdue", enabled: true },
    { key: "projectApproaching", label: "Project approaching deadline", enabled: true, timing: "48h" },
    { key: "projectStatusChange", label: "Project status changes", enabled: false },
    { key: "clientComments", label: "Client comments", enabled: true },
    { key: "clientUpload", label: "Client uploads a file", enabled: true },
    { key: "milestoneCompleted", label: "Milestone completed", enabled: false },
    { key: "projectCompleted", label: "Project completed", enabled: true }
  ],
  Enquiries: [
    { key: "newEnquiry", label: "New enquiry", enabled: true },
    { key: "uncontactedEnquiry", label: "Uncontacted enquiry", enabled: true, timing: "24h" },
    { key: "enquiryStatusChange", label: "Enquiry status changes", enabled: false }
  ],
  Outreach: [
    { key: "positiveResponse", label: "Positive response", enabled: true },
    { key: "campaignMilestone", label: "Campaign milestone", enabled: false },
    { key: "newOpportunity", label: "New outreach opportunity", enabled: true }
  ],
  System: [
    { key: "integrationDisconnected", label: "Integration disconnected", enabled: true },
    { key: "backupFailure", label: "Backup failure", enabled: true },
    { key: "systemError", label: "System error", enabled: true }
  ]
};

export const TIMING_OPTIONS = ["24 hours", "48 hours", "72 hours"];

export const integrations = [
  { key: "supabase", name: "Supabase", initials: "SB", purpose: "Database + Authentication", status: "connected", lastSync: "Synced recently", configurable: true },
  { key: "vercel", name: "Vercel", initials: "VC", purpose: "Deployment", status: "connected", lastSync: "Synced recently", configurable: true },
  { key: "ga4", name: "Google Analytics", initials: "GA", purpose: "Website analytics", status: "not-connected", lastSync: null, configurable: false },
  { key: "gsc", name: "Google Search Console", initials: "SC", purpose: "Search performance", status: "not-connected", lastSync: null, configurable: false },
  { key: "meta", name: "Meta", initials: "M", purpose: "Instagram + Facebook analytics", status: "not-connected", lastSync: null, configurable: false },
  { key: "email", name: "Email", initials: "@", purpose: "Studio email", status: "not-connected", lastSync: null, configurable: false }
];

export const comingSoonIntegrations = ["Resend", "Google Workspace", "Slack", "Microsoft 365", "Stripe", "M-Pesa", "Calendar"];

export const securityState = {
  sessions: [{ id: "current", device: "This device", browser: "Chrome on Windows", location: "Nairobi, KE (approximate)", lastActive: "Active now", current: true }],
  twoFactorEnabled: false,
  lastBackup: "Today · 06:00",
  backupStatus: "Healthy"
};

export const exportCategories = [
  { key: "projects", label: "Projects" },
  { key: "contacts", label: "Contacts" },
  { key: "enquiries", label: "Enquiries" },
  { key: "outreach", label: "Outreach" },
  { key: "analytics", label: "Analytics" },
  { key: "fileMeta", label: "File metadata" }
];

export const systemStatus = [
  { key: "database", label: "Database", state: "healthy" },
  { key: "auth", label: "Authentication", state: "healthy" },
  { key: "storage", label: "Storage", state: "healthy" },
  { key: "analytics", label: "Analytics", state: "disabled", detail: "Not connected" },
  { key: "email", label: "Email", state: "disabled", detail: "Not connected" }
];

export const activityLog = [
  { id: "a1", text: "Project status changed", meta: "Sellam Launch Material → Planning", time: "9 minutes ago" },
  { id: "a2", text: "Project marked Completed", meta: "Service Offer Posters", time: "Today" },
  { id: "a3", text: "Milestone completed", meta: "Design development", time: "Today" },
  { id: "a4", text: "Team member access changed", meta: "Promoted to Administrator", time: "Yesterday" }
];

export const versionInfo = { version: "v1.4.0", lastDeployment: "Today · 20:31" };
