/*
 * Innov8 Studios — HOME / Overview page behavior.
 * Shell-level concerns (sidebar, palette, account menu, toasts, modals,
 * avatar colors) live in shell.js, loaded before this file.
 */

/* HOME's two action-row modals */

document.getElementById("form-add-portfolio")?.addEventListener("submit", (event) => {
  event.preventDefault();
  closeAllModals();
  event.currentTarget.reset();
  showToast("Queued for Portfolio — publish it once Studio is live.");
});

document.getElementById("form-add-testimonial")?.addEventListener("submit", (event) => {
  event.preventDefault();
  closeAllModals();
  event.currentTarget.reset();
  showToast("Testimonial request saved to Relationships.");
});

/* Greeting + date */

function renderGreeting() {
  const greetingEl = document.querySelector("[data-greeting]");
  const dateEl = document.querySelector("[data-current-date]");
  if (!greetingEl && !dateEl) return;

  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

  const firstName = (window.CURRENT_USER || "there").split(" ")[0];
  if (greetingEl) greetingEl.textContent = `Good ${timeOfDay}, ${firstName}`;
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    dateEl.setAttribute("datetime", now.toISOString());
  }
}

/* Charts */

let chartIdCounter = 0;

function lineChartSVG(series, { height = 80, width = 320, gridLines = false } = {}) {
  chartIdCounter += 1;
  const gradientId = `chart-fill-${chartIdCounter}`;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);
  const points = series.map((value, i) => {
    const x = i * stepX;
    const y = height - ((value - min) / range) * (height * 0.75) - height * 0.12;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  const grid = gridLines
    ? [0.25, 0.5, 0.75]
        .map((f) => `<line x1="0" y1="${(height * f).toFixed(1)}" x2="${width}" y2="${(height * f).toFixed(1)}" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-dasharray="3 4" />`)
        .join("")
    : "";

  return `
    <svg class="dash-line-chart" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--orange)" stop-opacity="0.55" />
          <stop offset="100%" stop-color="var(--orange)" stop-opacity="0" />
        </linearGradient>
      </defs>
      ${grid}
      <path class="chart-fill" d="${fillPath}" fill="url(#${gradientId})" stroke="none" />
      <path class="chart-line" d="${linePath}" fill="none" stroke="var(--orange-bright)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
      <circle class="chart-dot" cx="${lastX}" cy="${lastY}" r="4" fill="var(--orange-bright)" />
    </svg>
  `;
}

function segmentedBarMarkup(percent, segments = 8) {
  const filled = Math.round((percent / 100) * segments);
  const spans = Array.from({ length: segments }, (_, i) => `<span class="${i < filled ? "is-filled" : ""}"></span>`).join("");
  return `<div class="segmented-bar">${spans}</div><span class="segmented-bar-pct">${percent}%</span>`;
}

function deltaMarkup(value) {
  if (value === undefined || value === null) return "";
  const up = value >= 0;
  return `<span class="stat-delta ${up ? "is-up" : "is-down"}">${up ? "+" : ""}${value}%</span>`;
}

/* Home content, rendered from mock-data.js */

function renderIncome() {
  const periods = DASH_MOCK?.income?.periods;
  if (!periods) return;

  const periodSelect = document.querySelector("[data-income-period]");
  const data = periods[periodSelect?.value] || periods["last-month"];

  const valueEl = document.querySelector("[data-income-value]");
  const trendEl = document.querySelector("[data-income-trend]");
  const chartEl = document.querySelector("[data-income-chart]");

  if (valueEl) valueEl.textContent = data.value;
  if (trendEl) {
    trendEl.textContent = data.trend;
    trendEl.className = `dash-stat-trend is-${data.direction}`;
  }
  if (chartEl) chartEl.innerHTML = lineChartSVG(data.series, { height: 80, width: 320, gridLines: true });
}

document.querySelector("[data-income-period]")?.addEventListener("change", renderIncome);

async function renderStats() {
  const container = document.querySelector("[data-stats]");
  if (!container || typeof DASH_MOCK === "undefined") return;

  const stats = DASH_MOCK.stats.map((s) => ({ ...s }));
  const activeWorkStat = stats.find((s) => s.label === "Active work");

  // Only "Active work" comes from Projects — Open enquiries/New leads/
  // Website sessions stay mock until Enquiries/Relationships/Analytics
  // are real modules (see the architecture audit's §12 and this
  // project's §38/§39).
  if (activeWorkStat) {
    await window.supabaseReady;
    if (window.supabase) {
      // Plain columns, filtered client-side — same reasoning as
      // renderWork() above: avoids filtering the query on an embedded
      // relation's column, which is fragile against the composite
      // status_id/status_kind FK guard.
      const [{ data: statusRows }, { data: projectRows, error }] = await Promise.all([
        window.supabase.from("project_option_lists").select("id, label").eq("kind", "project_status"),
        window.supabase.from("projects").select("id, status_id").is("deleted_at", null)
      ]);
      if (!error) {
        const statusLabel = new Map((statusRows || []).map((s) => [s.id, s.label]));
        const activeCount = (projectRows || []).filter((p) => !["Completed", "Archived"].includes(statusLabel.get(p.status_id))).length;
        activeWorkStat.value = String(activeCount);
        activeWorkStat.trend = "";
      }
    }
  }

  container.innerHTML = stats
    .map(
      (stat) => `
        <div class="panel dash-stat-card">
          <span class="dash-stat-card-icon">${icon(stat.icon)}</span>
          <div>
            <strong>${stat.value}</strong>
            <span class="dash-stat-label">${stat.label}</span>
            ${stat.trend ? `<span class="dash-stat-trend is-${stat.direction}">${stat.trend}</span>` : ""}
          </div>
        </div>
      `
    )
    .join("");
}

function renderEnquiries() {
  const tbody = document.querySelector("[data-enquiry-table]");
  if (!tbody || typeof DASH_MOCK === "undefined") return;

  tbody.innerHTML = DASH_MOCK.enquiries
    .map(
      (enquiry) => `
        <tr>
          <td class="dash-table-name"><span class="dash-table-person" data-toast-msg="Full profile for ${enquiry.name} will live in the Enquiries module.">${avatarMarkup(enquiry.name)} ${enquiry.name}</span></td>
          <td class="dash-table-muted">${enquiry.phone}</td>
          <td class="dash-table-muted">${enquiry.email}</td>
          <td>${enquiry.service}</td>
          <td><span class="badge badge--${enquiry.status}">${enquiry.status}</span></td>
        </tr>
      `
    )
    .join("");
}

/* Active work is real Project data, not DASH_MOCK.work — this is the
   exact inconsistency the architecture audit flagged (§1/§12): the old
   Home page kept its own separately-maintained mock counters instead of
   reading the same source Studio's own Overview already computes from.
   Enquiries/Relationships/Income/Website Analytics stay mock below —
   those modules don't exist yet, so there's nothing real to read from. */

const WORK_STATUS_BADGE = { Planning: "soon", Active: "active", "Under Review": "pending", Stuck: "urgent", Completed: "active", Archived: "soon" };

function dueLabel(dateStr) {
  if (!dateStr) return "No date";
  const diffDays = Math.round((new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays <= 6) return `Due in ${diffDays}d`;
  return `Due ${new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

async function renderWork() {
  const container = document.querySelector("[data-work-list]");
  if (!container) return;

  await window.supabaseReady;
  if (!window.supabase) return;

  // Plain columns + single-column FK embeds only (clients.id is a simple
  // FK, safe to embed). Status/priority labels are resolved client-side
  // against a small lookup, avoiding a filtered embed on the composite
  // status_id/status_kind FK guard from 20260831000006_projects.sql.
  const [{ data: statusRows }, { data: projectRows, error }] = await Promise.all([
    window.supabase.from("project_option_lists").select("id, label").eq("kind", "project_status"),
    window.supabase
      .from("projects")
      .select("id, title, due_date, status_id, clients(name), milestones(status_id)")
      .is("deleted_at", null)
      .order("due_date", { ascending: true })
      .limit(20)
  ]);

  if (error) {
    console.error("[home] failed to load active work", error);
    container.innerHTML = emptyState("Couldn't load active work", "Check your connection and try reloading.");
    return;
  }

  const statusLabel = new Map((statusRows || []).map((s) => [s.id, s.label]));
  const completedStatusId = (statusRows || []).find((s) => s.label === "Completed")?.id;

  const items = (projectRows || [])
    .map((item) => ({ ...item, status: statusLabel.get(item.status_id) || "—" }))
    .filter((item) => !["Completed", "Archived"].includes(item.status))
    .slice(0, 4);

  container.innerHTML = items.length
    ? items
        .map((item) => {
          const total = item.milestones?.length || 0;
          const done = (item.milestones || []).filter((m) => m.status_id === completedStatusId).length;
          const progress = total ? Math.round((done / total) * 100) : 0;
          return `
            <div class="dash-work-row">
              <div class="dash-work-row-main">
                <div class="dash-work-title">${item.title}</div>
                <div class="dash-work-client">${item.clients?.name || ""}</div>
              </div>
              <div class="dash-work-row-progress">${segmentedBarMarkup(progress)}</div>
              <div class="dash-work-row-status">
                <span class="badge badge--${WORK_STATUS_BADGE[item.status] || "soon"}">${item.status}</span>
                <span class="dash-work-due">${dueLabel(item.due_date)}</span>
              </div>
            </div>
          `;
        })
        .join("")
    : emptyState("No active work", "New projects will show up here.");
}

function emptyState(title, body) {
  return `<div class="empty-state"><strong>${title}</strong><span>${body}</span></div>`;
}

function renderRelationships() {
  const container = document.querySelector("[data-relationship-list]");
  if (!container || typeof DASH_MOCK === "undefined") return;

  container.innerHTML = DASH_MOCK.relationships
    .map(
      (person) => `
        <div class="dash-relationship-row">
          ${avatarMarkup(person.name)}
          <div class="dash-relationship-main">
            <p>${person.name}</p>
            <span>${person.source}</span>
          </div>
          <button class="message-btn" type="button" data-toast-msg="Messaging ${person.name} will live in the Messages module." aria-label="Message ${person.name}">${icon("messages")}</button>
        </div>
      `
    )
    .join("");
}

function renderActivity() {
  const container = document.querySelector("[data-activity-list]");
  if (!container || typeof DASH_MOCK === "undefined") return;

  container.innerHTML = DASH_MOCK.activity
    .map(
      (event) => `
        <div class="timeline-item">
          <span class="timeline-icon">${icon(event.type === "website" ? "globe" : "bell")}</span>
          <div class="timeline-body">
            <p>${event.text}</p>
            <time>${event.time}</time>
          </div>
        </div>
      `
    )
    .join("");
}

function renderWebsiteAnalytics() {
  const periods = DASH_MOCK?.websiteAnalytics?.periods;
  const periodSelect = document.querySelector("[data-analytics-period]");
  const chartEl = document.querySelector("[data-insights-chart]");
  const statsEl = document.querySelector("[data-insights-stats]");
  const gscEl = document.querySelector("[data-insights-gsc]");
  if (!periods || !chartEl || !statsEl || !gscEl) return;

  const data = periods[periodSelect?.value] || periods["7d"];
  const sessionsTotal = data.sessions.reduce((sum, v) => sum + v, 0).toLocaleString("en-KE");

  chartEl.innerHTML = lineChartSVG(data.sessions, { height: 96, width: 320, gridLines: true });

  statsEl.innerHTML = `
    <div><strong>${sessionsTotal}</strong><span>Sessions</span></div>
    <div><strong>${data.bounceRate}${deltaMarkup(data.bounceDelta)}</strong><span>Bounce rate</span></div>
    <div><strong>${data.avgSession}${deltaMarkup(data.avgSessionDelta)}</strong><span>Avg. session</span></div>
  `;

  gscEl.innerHTML = `
    <div class="dash-insights-section-label" style="grid-column: 1 / -1;">Search Console</div>
    <div><strong>${data.impressions}${deltaMarkup(data.impressionsDelta)}</strong><span>Impressions</span></div>
    <div><strong>${data.clicks}${deltaMarkup(data.clicksDelta)}</strong><span>Clicks</span></div>
    <div><strong>${data.ctr}${deltaMarkup(data.ctrDelta)}</strong><span>CTR</span></div>
    <div><strong>${data.avgPosition}${deltaMarkup(data.avgPositionDelta)}</strong><span>Avg. position</span></div>
  `;
}

document.querySelector("[data-analytics-period]")?.addEventListener("change", renderWebsiteAnalytics);

(async () => {
  await window.authReady;
  renderGreeting();
  renderIncome();
  renderStats();
  renderEnquiries();
  renderWork();
  renderRelationships();
  renderActivity();
  renderWebsiteAnalytics();
})();
