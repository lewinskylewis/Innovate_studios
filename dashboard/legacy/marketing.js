/*
 * Innov8 Studios — MARKETING & SALES module (UI/UX only).
 *
 * Everything on this page reads from and writes to the mock arrays in
 * marketing-data.js, entirely in memory — there is no Supabase client,
 * no API call, and nothing here survives a refresh. That's intentional
 * for this phase; see the header comment in marketing-data.js.
 *
 * Structure mirrors studio.js on purpose: one set of render functions
 * driven by a small amount of local state, wired up once at the bottom
 * of this file.
 */

/* ---------- local, mutable copies of the mock data ---------- */

const mktProspects = MKT_PROSPECTS.map((p) => ({ ...p, history: [...p.history] }));
const mktCampaigns = MKT_CAMPAIGNS.map((c) => ({ ...c }));

let mktProspectSeed = mktProspects.length;
let mktCampaignSeed = mktCampaigns.length;

const prospectFilters = { search: "", industry: "All", status: "All", channel: "All", serviceInterest: "All", followup: "All" };
let activeCampaignId = null;
let activeCampaignTab = "overview";

/* ---------- generic helpers ---------- */

function todayISO() { return new Date().toISOString().slice(0, 10); }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(todayISO());
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateRange(start, end) {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatMoney(value) {
  if (!value && value !== 0) return "—";
  return `KES ${Number(value).toLocaleString("en-KE")}`;
}

function formatCompact(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  return String(value);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function emptyState(title, body) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>`;
}

function findProspect(id) { return mktProspects.find((p) => p.id === id); }
function findCampaign(id) { return mktCampaigns.find((c) => c.id === id); }

function prospectStatusBadge(status) {
  const meta = MKT_STATUS_META[status] || { badge: "soon" };
  return `<span class="badge badge--${meta.badge}">${escapeHtml(status)}</span>`;
}

function campaignStatusBadge(status) {
  const map = { Active: "active", Paused: "pending", Completed: "soon", Draft: "soon" };
  return `<span class="badge badge--${map[status] || "soon"}">${escapeHtml(status)}</span>`;
}

function followupState(prospect) {
  if (!prospect.nextFollowUp) return "none";
  const diff = daysUntil(prospect.nextFollowUp);
  if (diff < 0) return "overdue";
  if (diff <= 7) return "week";
  return "later";
}

/* Small inline line chart — same gradient-fill technique used elsewhere
   in the dashboard (see home.js's lineChartSVG), rebuilt here since this
   page doesn't load that file. */
let mktChartSeed = 0;
function lineChartSVG(series, { height = 90, width = 320 } = {}) {
  if (!series.length) return `<div class="mkt-chart-empty">No data yet</div>`;
  mktChartSeed += 1;
  const gradientId = `mkt-chart-fill-${mktChartSeed}`;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1 || 1);
  const points = series.map((value, i) => {
    const x = i * stepX;
    const y = height - ((value - min) / range) * (height * 0.75) - height * 0.12;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return `
    <svg class="dash-line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--orange)" stop-opacity="0.55" />
          <stop offset="100%" stop-color="var(--orange)" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path class="chart-fill" d="${fillPath}" fill="url(#${gradientId})" stroke="none" />
      <path class="chart-line" d="${linePath}" fill="none" stroke="var(--orange-bright)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle class="chart-dot" cx="${lastX}" cy="${lastY}" r="4" fill="var(--orange-bright)" />
    </svg>
  `;
}

/* ---------- tabs ---------- */

function switchMktTab(view) {
  document.querySelectorAll("[data-mkt-tabs] .work-tab").forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-mkt-tab") === view));
  document.querySelectorAll("[data-mkt-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.getAttribute("data-mkt-panel") === view));
  document.querySelectorAll("[data-mkt-actions]").forEach((el) => { el.style.display = el.getAttribute("data-mkt-actions") === view ? "flex" : "none"; });
  if (view !== "campaigns") closeCampaignDetail();
}

document.querySelectorAll("[data-mkt-tabs] .work-tab").forEach((tab) => tab.addEventListener("click", () => switchMktTab(tab.getAttribute("data-mkt-tab"))));
document.addEventListener("click", (e) => {
  const goto = e.target.closest("[data-goto-mkt-tab]");
  if (goto) switchMktTab(goto.getAttribute("data-goto-mkt-tab"));
});

/* ---------- Overview ---------- */

function renderKpis() {
  const el = document.querySelector("[data-mkt-kpis]");
  if (!el) return;
  el.innerHTML = MKT_KPIS.map((k) => `
    <div class="panel dash-stat-card">
      <span class="dash-stat-card-icon">${icon(k.icon)}</span>
      <div>
        <strong>${k.value}</strong>
        <span class="dash-stat-label">${k.label}</span>
        <span class="dash-stat-trend is-${k.direction}">${k.meta}</span>
      </div>
    </div>
  `).join("");
}

function allTouchpoints() {
  const rows = [];
  mktProspects.forEach((p) => {
    p.history.forEach((h) => rows.push({ ...h, business: p.business, contact: p.contact.name, channel: p.channel, status: p.status, prospectId: p.id }));
  });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderOverviewOutreachActivity() {
  const body = document.querySelector("[data-mkt-outreach-activity]");
  const meta = document.querySelector("[data-mkt-outreach-meta]");
  if (!body) return;
  const rows = allTouchpoints().slice(0, 7);
  const contactedThisWeek = mktProspects.filter((p) => p.lastContact && daysUntil(p.lastContact) >= -7).length;
  if (meta) meta.textContent = `${contactedThisWeek} prospects contacted this week`;

  body.innerHTML = rows.length
    ? rows.map((r) => `
        <tr class="mkt-clickable-row" data-open-prospect="${r.prospectId}">
          <td class="dash-table-name">${escapeHtml(r.business)}</td>
          <td class="dash-table-muted">${escapeHtml(r.contact)}</td>
          <td>${escapeHtml(r.channel)}</td>
          <td>${prospectStatusBadge(r.status)}</td>
          <td class="dash-table-muted">${formatDate(r.date)}</td>
        </tr>
      `).join("")
    : `<tr><td colspan="5">${emptyState("No outreach yet", "Logged touchpoints will appear here.")}</td></tr>`;

  body.querySelectorAll("[data-open-prospect]").forEach((row) => row.addEventListener("click", () => openProspectDetail(row.getAttribute("data-open-prospect"))));
}

function renderUpcomingActions() {
  const el = document.querySelector("[data-mkt-upcoming-actions]");
  if (!el) return;
  el.innerHTML = MKT_UPCOMING_ACTIONS.length
    ? MKT_UPCOMING_ACTIONS.map((a) => `
        <div class="action-item">
          <span class="action-item-icon">${icon(a.icon)}</span>
          <div class="action-item-main"><p>${escapeHtml(a.text)}</p><span>${escapeHtml(a.meta)}</span></div>
        </div>
      `).join("")
    : emptyState("Nothing on deck", "New actions will show up here.");
}

function renderCampaignPerformanceOverview() {
  const el = document.querySelector("[data-mkt-campaign-performance]");
  if (!el) return;
  const top = mktCampaigns.filter((c) => c.status === "Active").slice(0, 3);
  el.innerHTML = top.length
    ? top.map((c) => `
        <div class="mkt-perf-row">
          <div class="mkt-perf-row-main">
            <strong>${escapeHtml(c.name)}</strong>
            ${campaignStatusBadge(c.status)}
          </div>
          <div class="mkt-perf-row-metrics">
            <span><strong>${formatCompact(c.kpis.reach)}</strong> Reach</span>
            <span><strong>${formatCompact(c.kpis.engagement)}</strong> Engagement</span>
            <span><strong>${c.kpis.enquiries}</strong> Enquiries</span>
            <span><strong>${c.kpis.leads}</strong> Leads</span>
          </div>
          <button class="panel-link" type="button" data-view-campaign="${c.id}">View Campaign</button>
        </div>
      `).join("")
    : emptyState("No active campaigns", "Launch a campaign to see performance here.");

  el.querySelectorAll("[data-view-campaign]").forEach((btn) => btn.addEventListener("click", () => {
    switchMktTab("campaigns");
    openCampaignDetail(btn.getAttribute("data-view-campaign"));
  }));
}

function renderOverview() {
  renderKpis();
  renderOverviewOutreachActivity();
  renderUpcomingActions();
  renderCampaignPerformanceOverview();
}

/* ---------- Outreach ---------- */

function renderOutreachSummary() {
  const el = document.querySelector("[data-mkt-outreach-summary]");
  if (!el) return;
  const total = mktProspects.length;
  const contacted = mktProspects.filter((p) => p.status !== "New").length;
  const responses = mktProspects.filter((p) => ["Replied", "Meeting Scheduled"].includes(p.status)).length;
  const followupsDue = mktProspects.filter((p) => followupState(p) === "overdue" || followupState(p) === "week").length;

  const cards = [
    { label: "Total Prospects", value: total, icon: "relationships" },
    { label: "Contacted", value: contacted, icon: "megaphone" },
    { label: "Responses", value: responses, icon: "messages" },
    { label: "Follow-ups Due", value: followupsDue, icon: "clock" }
  ];
  el.innerHTML = cards.map((c) => `
    <div class="panel dash-stat-card">
      <span class="dash-stat-card-icon">${icon(c.icon)}</span>
      <div><strong>${c.value}</strong><span class="dash-stat-label">${c.label}</span></div>
    </div>
  `).join("");
}

function populateProspectFilterOptions() {
  const fields = { industry: "industry", channel: "channel", serviceInterest: "serviceInterest" };
  Object.entries(fields).forEach(([filterKey, prop]) => {
    const select = document.querySelector(`[data-prospect-filter="${filterKey}"]`);
    if (!select) return;
    const values = [...new Set(mktProspects.map((p) => p[prop]))].sort();
    const placeholder = select.querySelector("option").outerHTML;
    select.innerHTML = placeholder + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  });

  const statusSelect = document.querySelector('[data-prospect-filter="status"]');
  if (statusSelect) {
    const values = Object.keys(MKT_STATUS_META);
    statusSelect.innerHTML = `<option value="All">Status</option>` + values.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
  }
}

["search", "industry", "status", "channel", "serviceInterest", "followup"].forEach((key) => {
  const attr = key === "search" ? "[data-prospect-search]" : `[data-prospect-filter="${key}"]`;
  const el = document.querySelector(attr);
  el?.addEventListener(key === "search" ? "input" : "change", (e) => {
    prospectFilters[key] = e.target.value;
    renderProspectTable();
  });
});

function getFilteredProspects() {
  let items = [...mktProspects];
  const { search, industry, status, channel, serviceInterest, followup } = prospectFilters;
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((p) => p.business.toLowerCase().includes(q) || p.contact.name.toLowerCase().includes(q) || p.industry.toLowerCase().includes(q));
  }
  if (industry !== "All") items = items.filter((p) => p.industry === industry);
  if (status !== "All") items = items.filter((p) => p.status === status);
  if (channel !== "All") items = items.filter((p) => p.channel === channel);
  if (serviceInterest !== "All") items = items.filter((p) => p.serviceInterest === serviceInterest);
  if (followup !== "All") items = items.filter((p) => followupState(p) === followup);
  return items;
}

function renderProspectTable() {
  const body = document.querySelector("[data-mkt-prospect-rows]");
  if (!body) return;
  const items = getFilteredProspects();

  body.innerHTML = items.length
    ? items.map((p) => {
        const fu = followupState(p);
        return `
          <tr class="mkt-clickable-row" data-open-prospect="${p.id}">
            <td class="dash-table-name">${escapeHtml(p.business)}</td>
            <td>
              <span class="dash-table-person">${avatarMarkup(p.contact.name)} <span>${escapeHtml(p.contact.name)}</span></span>
            </td>
            <td class="dash-table-muted">${escapeHtml(p.industry)}</td>
            <td class="dash-table-muted">${escapeHtml(p.serviceInterest)}</td>
            <td class="dash-table-muted">${escapeHtml(p.channel)}</td>
            <td>${prospectStatusBadge(p.status)}</td>
            <td class="dash-table-muted">${formatDate(p.lastContact)}</td>
            <td class="${fu === "overdue" ? "mkt-followup-overdue" : "dash-table-muted"}">${p.nextFollowUp ? formatDate(p.nextFollowUp) : "—"}</td>
          </tr>
        `;
      }).join("")
    : `<tr><td colspan="8">${emptyState("No prospects match", "Try clearing a filter or add a new prospect.")}</td></tr>`;

  body.querySelectorAll("[data-open-prospect]").forEach((row) => row.addEventListener("click", () => openProspectDetail(row.getAttribute("data-open-prospect"))));
}

/* ---------- Prospect detail drawer ---------- */

function buildProspectDetailHtml(p) {
  const fu = followupState(p);
  return `
    <button class="icon-btn" type="button" data-detail-close aria-label="Close" style="position:absolute;top:1.25rem;right:1.25rem;">${icon("close")}</button>

    <div class="detail-header">
      <div>
        <div class="detail-title-row"><h2>${escapeHtml(p.business)}</h2>${prospectStatusBadge(p.status)}</div>
        <div class="detail-meta">
          <span>${escapeHtml(p.industry)}</span>
          <span>${escapeHtml(p.serviceInterest)}</span>
          <span>${escapeHtml(p.channel)}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Contact</h3>
      <div class="detail-row">
        ${avatarMarkup(p.contact.name)}
        <div class="detail-row-main"><strong>${escapeHtml(p.contact.name)}</strong><span>${escapeHtml(p.contact.role)}</span></div>
      </div>
      <div class="detail-row"><div class="detail-row-main"><strong>Email</strong><span>${escapeHtml(p.email)}</span></div></div>
      <div class="detail-row"><div class="detail-row-main"><strong>Phone</strong><span>${escapeHtml(p.phone)}</span></div></div>
    </div>

    <div class="detail-section">
      <h3>Notes</h3>
      <p class="detail-description">${escapeHtml(p.notes || "No notes yet.")}</p>
    </div>

    <div class="detail-section">
      <h3>Next action</h3>
      <div class="detail-row">
        <span class="file-icon">${icon("clock")}</span>
        <div class="detail-row-main">
          <strong>${fu === "overdue" ? "Follow-up overdue" : "Follow up"}</strong>
          <span>${p.nextFollowUp ? formatDate(p.nextFollowUp) : "No follow-up scheduled"}</span>
        </div>
      </div>
    </div>

    <div class="detail-section">
      <h3>Outreach history</h3>
      ${p.history.length
        ? `<div class="milestone-timeline">${p.history.map((h) => `
            <div class="milestone-item is-complete">
              <span class="milestone-marker"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg></span>
              <div class="milestone-head"><strong>${escapeHtml(h.label)}</strong><span class="milestone-tags">${formatDate(h.date)}</span></div>
            </div>
          `).join("")}</div>`
        : emptyState("No outreach logged yet", "Add a note or log activity to start the history.")}
      <form class="note-composer" data-prospect-note-form>
        <input class="input" type="text" placeholder="Add a note…" required />
        <button class="btn" type="submit">Add Note</button>
      </form>
    </div>
  `;
}

function openProspectDetail(id) {
  const p = findProspect(id);
  if (!p) return;
  openDetail(buildProspectDetailHtml(p));
  wireProspectDetail(id);
}

function wireProspectDetail(id) {
  const drawer = document.querySelector("[data-detail-drawer]");
  if (!drawer) return;
  drawer.querySelector("[data-prospect-note-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector("input");
    const p = findProspect(id);
    p.history.push({ date: todayISO(), label: input.value.trim() });
    p.lastContact = todayISO();
    drawer.innerHTML = buildProspectDetailHtml(p);
    wireProspectDetail(id);
    renderProspectTable();
    renderOverviewOutreachActivity();
    showToast("Note added.");
  });
}

/* ---------- New Prospect / Outreach Activity modals ---------- */

document.getElementById("form-new-prospect")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  mktProspectSeed += 1;
  const prospect = {
    id: `pr-new-${mktProspectSeed}`,
    business: data.get("business"),
    industry: data.get("industry"),
    serviceInterest: data.get("serviceInterest"),
    channel: data.get("channel"),
    status: "New",
    contact: { name: data.get("contact"), role: "" },
    email: "", phone: "",
    lastContact: null,
    nextFollowUp: data.get("nextFollowUp") || null,
    notes: data.get("notes") || "",
    history: []
  };
  mktProspects.unshift(prospect);
  populateProspectFilterOptions();
  renderProspectTable();
  renderOutreachSummary();
  renderOverviewOutreachActivity();
  closeAllModals();
  event.currentTarget.reset();
  showToast(`“${prospect.business}” added to Outreach.`);
});

document.querySelector('[data-modal-open="outreach-activity"]')?.addEventListener("click", () => {
  const select = document.querySelector("[data-activity-prospect-select]");
  if (select) select.innerHTML = mktProspects.map((p) => `<option value="${p.id}">${escapeHtml(p.business)}</option>`).join("");
});

document.getElementById("form-outreach-activity")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const p = findProspect(data.get("prospectId"));
  if (p) {
    p.history.push({ date: todayISO(), label: data.get("note") });
    p.lastContact = todayISO();
    if (p.status === "New") p.status = "Contacted";
  }
  renderProspectTable();
  renderOutreachSummary();
  renderOverviewOutreachActivity();
  closeAllModals();
  event.currentTarget.reset();
  showToast(`Activity logged for “${p?.business}”.`);
});

/* ---------- Studio Campaigns: list ---------- */

function campaignCardHtml(c) {
  return `
    <div class="panel mkt-campaign-card">
      <div class="mkt-campaign-card-head">
        <h3>${escapeHtml(c.name.toUpperCase())}</h3>
        ${campaignStatusBadge(c.status)}
      </div>
      <p class="mkt-campaign-objective">${escapeHtml(c.objective)}</p>
      <div class="mkt-campaign-meta-row">
        <span>${escapeHtml(c.service)}</span>
        <span>${formatDateRange(c.dateRange.start, c.dateRange.end)}</span>
      </div>
      <div class="mkt-platform-pills">
        ${c.platforms.map((p) => `<span class="mkt-platform-pill">${escapeHtml(p)}</span>`).join("")}
      </div>
      <div class="mkt-campaign-budget">Budget: <strong>${formatMoney(c.budget)}</strong></div>
      <div class="mkt-campaign-stats">
        <div><strong>${formatCompact(c.kpis.reach)}</strong><span>Reach</span></div>
        <div><strong>${formatCompact(c.kpis.engagement)}</strong><span>Engagement</span></div>
        <div><strong>${c.kpis.enquiries}</strong><span>Enquiries</span></div>
        <div><strong>${c.kpis.leads}</strong><span>Leads</span></div>
      </div>
      <button class="btn btn-primary mkt-campaign-view-btn" type="button" data-view-campaign="${c.id}">View Campaign</button>
    </div>
  `;
}

function renderCampaignCards() {
  const el = document.querySelector("[data-mkt-campaign-cards]");
  if (!el) return;
  el.innerHTML = mktCampaigns.length
    ? mktCampaigns.map(campaignCardHtml).join("")
    : emptyState("No campaigns yet", "Create a campaign to start marketing the Studio.");
  el.querySelectorAll("[data-view-campaign]").forEach((btn) => btn.addEventListener("click", () => openCampaignDetail(btn.getAttribute("data-view-campaign"))));
}

/* ---------- Studio Campaigns: detail ---------- */

function openCampaignDetail(id) {
  activeCampaignId = id;
  activeCampaignTab = "overview";
  document.querySelector("[data-mkt-campaign-list]").style.display = "none";
  const detail = document.querySelector("[data-mkt-campaign-detail]");
  detail.style.display = "block";
  renderCampaignDetail();
}

function closeCampaignDetail() {
  activeCampaignId = null;
  const list = document.querySelector("[data-mkt-campaign-list]");
  const detail = document.querySelector("[data-mkt-campaign-detail]");
  if (list) list.style.display = "";
  if (detail) { detail.style.display = "none"; detail.innerHTML = ""; }
}

function campaignKpiCards(k) {
  const rows = [
    ["Reach", formatCompact(k.reach)], ["Impressions", formatCompact(k.impressions)], ["Engagement", formatCompact(k.engagement)],
    ["Profile Visits", formatCompact(k.profileVisits)], ["Link Clicks", k.linkClicks], ["Enquiries", k.enquiries],
    ["Leads", k.leads], ["Opportunities", k.opportunities], ["Revenue", formatMoney(k.revenue)]
  ];
  return `<div class="mkt-kpi-grid">${rows.map(([label, value]) => `<div class="mkt-kpi-cell"><strong>${value}</strong><span>${label}</span></div>`).join("")}</div>`;
}

function platformComparisonHtml(platforms) {
  if (!platforms.length || platforms.every((p) => !p.reach)) return emptyState("No platform data yet", "Performance breaks down by platform once the campaign is live.");
  const metrics = [
    { key: "reach", label: "Reach", format: formatCompact },
    { key: "engagement", label: "Engagement", format: formatCompact },
    { key: "clicks", label: "Clicks", format: (v) => v },
    { key: "leads", label: "Leads", format: (v) => v },
    { key: "costPerEnquiry", label: "Cost per enquiry", format: (v) => (v ? formatMoney(v) : "—") }
  ];
  const colors = ["#ff8a3d", "#4f8cff", "#3ddc84", "#a855f7"];

  return `
    <div class="mkt-platform-compare">
      <div class="mkt-platform-compare-legend">
        ${platforms.map((p, i) => `<span><i style="background:${colors[i % colors.length]}"></i>${escapeHtml(p.platform)}</span>`).join("")}
      </div>
      ${metrics.map((m) => {
        const max = Math.max(...platforms.map((p) => p[m.key] || 0), 1);
        return `
          <div class="mkt-compare-row">
            <span class="mkt-compare-label">${m.label}</span>
            <div class="mkt-compare-bars">
              ${platforms.map((p, i) => `
                <div class="mkt-compare-bar-track">
                  <div class="mkt-compare-bar" style="width:${Math.max(4, ((p[m.key] || 0) / max) * 100)}%;background:${colors[i % colors.length]}"></div>
                  <span>${m.format(p[m.key] || 0)}</span>
                </div>
              `).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function funnelHtml(funnel) {
  const max = funnel[0]?.value || 1;
  return `
    <div class="mkt-funnel">
      ${funnel.map((stage, i) => {
        const width = Math.max(6, (stage.value / max) * 100);
        const prev = i > 0 ? funnel[i - 1].value : null;
        const conv = prev ? Math.round((stage.value / prev) * 100) : null;
        return `
          <div class="mkt-funnel-row">
            <span class="mkt-funnel-label">${escapeHtml(stage.stage)}</span>
            <div class="mkt-funnel-track"><div class="mkt-funnel-bar" style="width:${width}%"></div></div>
            <span class="mkt-funnel-value">${stage.value.toLocaleString()}${conv !== null ? ` <em>(${conv}%)</em>` : ""}</span>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function campaignTimelineHtml(timeline) {
  if (!timeline.length) return emptyState("No activity yet", "Campaign activity will appear here once it launches.");
  return `<div class="timeline">${timeline.map((t) => `
    <div class="timeline-item">
      <span class="timeline-icon">${icon("calendar")}</span>
      <div class="timeline-body"><p>${escapeHtml(t.label)}</p><time>${formatDate(t.date)}</time></div>
    </div>
  `).join("")}</div>`;
}

function assetColor(seedStr) {
  const palette = ["#ff8a3d", "#4f8cff", "#3ddc84", "#a855f7", "#22c1c3", "#e5484d", "#f2b705"];
  let hash = 0;
  for (let i = 0; i < seedStr.length; i += 1) hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function assetGridHtml(assets) {
  if (!assets.length) return emptyState("No assets yet", "Creative assets will appear here once they're produced.");
  return `
    <div class="mkt-asset-grid">
      ${assets.map((a) => `
        <div class="mkt-asset-card">
          <div class="mkt-asset-thumb" style="background:linear-gradient(155deg, ${assetColor(a.name)}55, ${assetColor(a.name)}11);">
            <span>${escapeHtml(a.format)}</span>
          </div>
          <div class="mkt-asset-info">
            <strong>${escapeHtml(a.name)}</strong>
            <span class="mkt-asset-platform">${escapeHtml(a.platform)} · ${escapeHtml(a.format)}</span>
            <div class="mkt-asset-stats">
              <span>${a.views.toLocaleString()} views</span>
              <span>${a.engagements.toLocaleString()} engagements</span>
              <span>${a.enquiries} enquiries</span>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function campaignDetailTabsHtml(c) {
  const overviewTab = `
    ${campaignKpiCards(c.kpis)}
    <div class="dash-grid">
      <div class="dash-column">
        <div class="panel">
          <div class="panel-header"><h2>Platform performance</h2></div>
          <div style="padding: 0 var(--space-5) var(--space-5);">${platformComparisonHtml(c.platformBreakdown)}</div>
        </div>
      </div>
      <div class="dash-column">
        <div class="panel">
          <div class="panel-header"><h2>Campaign timeline</h2></div>
          <div style="padding: 0 var(--space-5) var(--space-5);">${campaignTimelineHtml(c.timeline)}</div>
        </div>
      </div>
    </div>
  `;

  const insightsTab = c.insights.length ? `
    <div class="panel mkt-insight-summary">
      <span class="mkt-insight-summary-icon">${icon("insights")}</span>
      <p>${escapeHtml(c.insightsSummary)}</p>
    </div>
    <div class="mkt-insight-grid">
      ${c.insights.map((i) => `
        <div class="panel mkt-insight-card">
          <strong>${escapeHtml(i.title)}</strong>
          <p>${escapeHtml(i.body)}</p>
        </div>
      `).join("")}
    </div>
    <div class="dash-grid">
      <div class="dash-column">
        <div class="panel">
          <div class="panel-header"><h2>Conversion funnel</h2></div>
          <div style="padding: 0 var(--space-5) var(--space-5);">${funnelHtml(c.funnel)}</div>
        </div>
      </div>
      <div class="dash-column">
        <div class="panel">
          <div class="panel-header"><h2>Performance over time</h2></div>
          <div style="padding: var(--space-2) var(--space-5) var(--space-5);">${lineChartSVG(c.performanceSeries, { height: 110, width: 340 })}</div>
        </div>
        <div class="panel">
          <div class="panel-header"><h2>Platform comparison</h2></div>
          <div style="padding: 0 var(--space-5) var(--space-5);">${platformComparisonHtml(c.platformBreakdown)}</div>
        </div>
      </div>
    </div>
  ` : `<div class="panel" style="padding:var(--space-6);text-align:center;">${emptyState("No insights yet", c.insightsSummary)}</div>`;

  const assetsTab = `<div class="panel" style="padding:var(--space-5);">${assetGridHtml(c.assets)}</div>`;

  return { overview: overviewTab, insights: insightsTab, assets: assetsTab };
}

function renderCampaignDetail() {
  const c = findCampaign(activeCampaignId);
  const container = document.querySelector("[data-mkt-campaign-detail]");
  if (!c || !container) return;

  container.innerHTML = `
    <div class="mkt-campaign-detail-head">
      <button class="btn btn-ghost" type="button" data-back-to-campaigns>${icon("chevronDown", "mkt-back-icon")} All campaigns</button>
      <div class="mkt-campaign-detail-title">
        <h2>${escapeHtml(c.name)}</h2>
        ${campaignStatusBadge(c.status)}
      </div>
      <div class="detail-actions">
        <button class="btn" type="button" data-edit-campaign>${icon("textLines")} Edit Campaign</button>
        <button class="btn" type="button" data-toggle-pause-campaign>${icon(c.status === "Paused" ? "eye" : "close")} ${c.status === "Paused" ? "Resume Campaign" : "Pause Campaign"}</button>
      </div>
    </div>

    <div class="panel mkt-campaign-info">
      <div><span class="field-label">Objective</span><p>${escapeHtml(c.objective)}</p></div>
      <div><span class="field-label">Service</span><p>${escapeHtml(c.service)}</p></div>
      <div><span class="field-label">Target Audience</span><p>${escapeHtml(c.targetAudience)}</p></div>
      <div><span class="field-label">Platforms</span><p>${c.platforms.join(" · ")}</p></div>
      <div><span class="field-label">Campaign Period</span><p>${formatDateRange(c.dateRange.start, c.dateRange.end)}</p></div>
      <div><span class="field-label">Budget</span><p>${formatMoney(c.budget)}</p></div>
    </div>

    <div class="work-tabs mkt-campaign-tabs" data-campaign-tabs>
      <button class="work-tab ${activeCampaignTab === "overview" ? "is-active" : ""}" type="button" data-campaign-tab="overview">Overview</button>
      <button class="work-tab ${activeCampaignTab === "insights" ? "is-active" : ""}" type="button" data-campaign-tab="insights">Insights</button>
      <button class="work-tab ${activeCampaignTab === "assets" ? "is-active" : ""}" type="button" data-campaign-tab="assets">Assets</button>
    </div>

    <div data-campaign-tab-content></div>
  `;

  renderCampaignTabContent(c);
  wireCampaignDetail(c);
}

function renderCampaignTabContent(c) {
  const tabs = campaignDetailTabsHtml(c);
  const el = document.querySelector("[data-campaign-tab-content]");
  if (el) el.innerHTML = tabs[activeCampaignTab];
}

function wireCampaignDetail(c) {
  document.querySelector("[data-back-to-campaigns]")?.addEventListener("click", closeCampaignDetail);

  document.querySelectorAll("[data-campaign-tab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCampaignTab = btn.getAttribute("data-campaign-tab");
      document.querySelectorAll("[data-campaign-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
      renderCampaignTabContent(c);
    });
  });

  document.querySelector("[data-toggle-pause-campaign]")?.addEventListener("click", () => {
    c.status = c.status === "Paused" ? "Active" : "Paused";
    renderCampaignDetail();
    renderCampaignCards();
    showToast(`“${c.name}” ${c.status === "Paused" ? "paused" : "resumed"}.`);
  });

  document.querySelector("[data-edit-campaign]")?.addEventListener("click", () => {
    showToast("Campaign editing is coming soon — this is a visual prototype.");
  });
}

/* ---------- New Campaign modal ---------- */

document.getElementById("form-new-campaign")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const platforms = data.getAll("platforms");
  mktCampaignSeed += 1;

  const campaign = {
    id: `camp-new-${mktCampaignSeed}`,
    name: data.get("name"),
    objective: data.get("objective"),
    description: data.get("description") || "",
    service: data.get("service"),
    status: "Draft",
    targetAudience: data.get("targetAudience") || "—",
    platforms: platforms.length ? platforms : ["Instagram"],
    dateRange: { start: data.get("startDate"), end: data.get("endDate") },
    budget: Number(data.get("budget")) || 0,
    cta: data.get("cta") || "Get a quote",
    kpis: { reach: 0, impressions: 0, engagement: 0, profileVisits: 0, linkClicks: 0, enquiries: 0, leads: 0, opportunities: 0, revenue: 0 },
    platformBreakdown: platforms.map((p) => ({ platform: p, reach: 0, engagement: 0, clicks: 0, leads: 0, costPerEnquiry: 0 })),
    performanceSeries: [],
    timeline: [{ date: todayISO(), label: "Campaign drafted" }],
    insightsSummary: "Campaign hasn't launched yet — insights will populate once it goes live.",
    insights: [],
    funnel: ["Reach", "Engagement", "Profile Visits", "Clicks", "Enquiries", "Leads", "Opportunities"].map((stage) => ({ stage, value: 0 })),
    assets: []
  };

  mktCampaigns.unshift(campaign);
  renderCampaignCards();
  renderCampaignPerformanceOverview();
  closeAllModals();
  event.currentTarget.reset();
  showToast(`“${campaign.name}” created as a draft.`);
});

/* ---------- init ---------- */

(async () => {
  await window.authReady;
  populateProspectFilterOptions();
  renderOverview();
  renderOutreachSummary();
  renderProspectTable();
  renderCampaignCards();
  initCardTilt();
})();
