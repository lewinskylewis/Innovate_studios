/*
 * Innov8 Studios — STUDIO module (internal creative production).
 * Shell-level concerns (sidebar, palette, account menu, toasts, modals,
 * detail drawer open/close, avatar colors) live in shell.js. All
 * Supabase reads/writes live in studio-data.js — this file only renders
 * and wires up events, calling into that data layer and awaiting it.
 *
 * Ongoing Projects is metadata-driven: FIELDS (studio-data.js) is the
 * single source of truth for column identity, type, and order. Every
 * render/edit path goes through getCellValue/setCellValue rather than
 * special-casing field names, so a user-added column behaves exactly
 * like a built-in one.
 */

/* ---------- generic helpers ---------- */

/* Prefer the data layer's own message (e.g. mutate()'s "You don't have
   permission to…") over a generic fallback — a permission error and a
   dropped network request need different toasts, and the caller usually
   can't tell which one just happened. */
function toastError(err, fallback) {
  showToast(err?.message || fallback);
}

const STATUS_BADGE = { Planning: "soon", Active: "active", "Under Review": "pending", Stuck: "urgent", Completed: "active", Archived: "soon" };
const STATUS_RING_COLOR = { Planning: "var(--muted)", Active: "var(--orange-bright)", "Under Review": "var(--ember)", Stuck: "var(--danger)", Completed: "var(--success)", Archived: "var(--faint)" };
const PRIORITY_DOT = { Low: "", Normal: "", High: "pending", Urgent: "urgent" };
const FIELD_TYPE_ICON = { text: "textLines", longtext: "textLines", number: "hash", money: "coin", date: "calendar", select: "chevronDown", person: "relationships", checkbox: "check", url: "link", file: "file" };

function teamMember(id) { return TEAM.find((m) => m.id === id); }
function teamName(id) { return teamMember(id)?.name || "Unassigned"; }

function statusBadge(status) { return `<span class="badge badge--${STATUS_BADGE[status] || "soon"}">${status || "—"}</span>`; }

function priorityLabel(priority) {
  const dotClass = PRIORITY_DOT[priority] ? `status-dot--${PRIORITY_DOT[priority]}` : "status-dot";
  return `<span style="display:inline-flex;align-items:center;gap:0.375rem;white-space:nowrap;"><span class="${dotClass}" style="width:0.4375rem;height:0.4375rem;border-radius:50%;display:inline-block;"></span>${priority || "—"}</span>`;
}

function formatMoney(value, currency = "KES") {
  if (!value && value !== 0) return "—";
  return `${currency} ${Number(value).toLocaleString("en-KE")}`;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date(todayISO());
  const target = new Date(dateStr);
  return Math.round((target - today) / 86400000);
}

function isOverdue(dateStr) {
  const diff = daysUntil(dateStr);
  return diff !== null && diff < 0;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDueLabel(dateStr, isDone) {
  if (isDone) return `Completed ${formatDate(dateStr)}`;
  if (!dateStr) return "No date";
  const diff = daysUntil(dateStr);
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  if (diff < 0) return `Overdue by ${Math.abs(diff)}d`;
  if (diff <= 6) return `Due in ${diff}d`;
  return `Due ${formatDate(dateStr)}`;
}

function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const diff = daysUntil(dateStr.slice(0, 10));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d ago`;
  return formatDate(dateStr);
}

function computeProgress(project) {
  if (!project.milestones.length) return 0;
  const done = project.milestones.filter((m) => m.status === "Completed").length;
  return Math.round((done / project.milestones.length) * 100);
}

function findProject(id) { return PROJECTS.find((p) => p.id === id); }

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function emptyState(title, body) {
  return `<div class="empty-state"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(body)}</span></div>`;
}

function activityIcon(type) {
  return {
    project_created: "plus",
    status_changed: "insights",
    priority_changed: "insights",
    milestone_created: "calendar",
    milestone_completed: "calendar",
    assignment_changed: "relationships",
    file_uploaded: "file",
    comment_added: "bell"
  }[type] || "bell";
}

function monthKey(dateStr) { return (dateStr || "").slice(0, 7); }

function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return "NO DUE DATE";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

/* ---------- cell value abstraction — the metadata choke point ----------
   getCellValue/setCellValue, and OPTION_COLOR_PALETTE, now live in
   studio-data.js (the data layer) since setCellValue has to persist to
   Supabase. Kept out of this file entirely rather than duplicated, so
   there is exactly one place that decides how a field's value is read
   and written. */

function optionFor(field, label) {
  return (field.options || []).find((o) => o.label === label);
}

/* ---------- tabs + toolbar ---------- */

function switchTab(view) {
  document.querySelectorAll("[data-work-tabs] .work-tab").forEach((t) => t.classList.toggle("is-active", t.getAttribute("data-view") === view));
  document.querySelectorAll("[data-view-panel]").forEach((panel) => panel.classList.toggle("is-active", panel.getAttribute("data-view-panel") === view));
  const toolbar = document.querySelector("[data-projects-toolbar]");
  if (toolbar) toolbar.style.display = view === "projects" ? "flex" : "none";
  if (view === "projects") renderProjectsView();
}

document.querySelectorAll("[data-work-tabs] .work-tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.getAttribute("data-view"))));
document.addEventListener("click", (event) => {
  const goto = event.target.closest("[data-goto-view]");
  if (goto) switchTab(goto.getAttribute("data-goto-view"));
});

/* ---------- Studio Overview ---------- */

function overdueMilestoneCount() {
  let count = 0;
  PROJECTS.forEach((p) => p.milestones.forEach((m) => { if (m.status !== "Completed" && isOverdue(m.dueDate)) count += 1; }));
  return count;
}

function renderMetricCards() {
  const el = document.querySelector("[data-metric-cards]");
  if (!el) return;

  const active = PROJECTS.filter((p) => !["Completed", "Archived"].includes(p.status)).length;
  const milestonesDue = PROJECTS.reduce((sum, p) => sum + p.milestones.filter((m) => m.status !== "Completed" && daysUntil(m.dueDate) !== null && daysUntil(m.dueDate) >= 0 && daysUntil(m.dueDate) <= 7).length, 0);
  const overdueProjects = PROJECTS.filter((p) => !["Completed", "Archived"].includes(p.status) && isOverdue(p.deadline)).length;
  const overdue = overdueProjects + overdueMilestoneCount();
  const needsAttention = new Set();
  PROJECTS.forEach((p) => {
    if (p.status === "Stuck") needsAttention.add(p.id);
    if (!["Completed", "Archived"].includes(p.status) && isOverdue(p.deadline)) needsAttention.add(p.id);
    if (!p.team.length) needsAttention.add(p.id);
  });

  const cards = [
    { label: "Active projects", value: active, icon: "studio" },
    { label: "Milestones due", value: milestonesDue, icon: "calendar" },
    { label: "Overdue", value: overdue, icon: "clock" },
    { label: "Needs attention", value: needsAttention.size, icon: "bell" }
  ];

  el.innerHTML = cards
    .map(
      (c) => `
        <div class="panel dash-stat-card">
          <span class="dash-stat-card-icon">${icon(c.icon)}</span>
          <div>
            <strong>${c.value}</strong>
            <span class="dash-stat-label">${c.label}</span>
          </div>
        </div>
      `
    )
    .join("");
}

const UPCOMING_COLUMNS = {
  milestones: ["Project", "Milestone", "Due Date"],
  meetings: ["Contact", "Purpose", "Date", "Time"],
  bills: ["Vendor", "Amount", "Due Date", "Status"],
  invoices: ["Client", "Amount", "Due Date", "Status"]
};

function upcomingMilestones() {
  const rows = [];
  PROJECTS.forEach((p) => p.milestones.forEach((m) => { if (m.status !== "Completed") rows.push({ project: p.title, milestone: m.title, dueDate: m.dueDate }); }));
  return rows.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 8);
}

function renderUpcoming() {
  const type = document.querySelector("[data-upcoming-type]")?.value || "milestones";
  const head = document.querySelector("[data-upcoming-head]");
  const body = document.querySelector("[data-upcoming-body]");
  if (!head || !body) return;

  head.innerHTML = `<tr>${UPCOMING_COLUMNS[type].map((c) => `<th>${c}</th>`).join("")}</tr>`;

  let rows = [];
  if (type === "milestones") {
    rows = upcomingMilestones().map((r) => [escapeHtml(r.project), escapeHtml(r.milestone), formatDate(r.dueDate)]);
  } else if (type === "meetings") {
    rows = [...MEETINGS].sort((a, b) => new Date(a.date) - new Date(b.date)).map((r) => [escapeHtml(r.contact), escapeHtml(r.purpose), formatDate(r.date), r.time]);
  } else if (type === "bills") {
    rows = [...BILLS].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map((r) => [escapeHtml(r.vendor), formatMoney(r.amount), formatDate(r.dueDate), statusBadge2(r.status)]);
  } else if (type === "invoices") {
    rows = [...INVOICES].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).map((r) => [escapeHtml(r.client), formatMoney(r.amount), formatDate(r.dueDate), statusBadge2(r.status)]);
  }

  body.innerHTML = rows.length
    ? rows.map((cells) => `<tr>${cells.map((c) => `<td class="dash-table-muted">${c}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="4">${emptyState("Nothing upcoming", "New items will appear here.")}</td></tr>`;
}

function statusBadge2(status) {
  const map = { Paid: "active", Unpaid: "pending", Scheduled: "pending", Overdue: "urgent", Pending: "pending" };
  return `<span class="badge badge--${map[status] || "soon"}">${status}</span>`;
}

document.querySelector("[data-upcoming-type]")?.addEventListener("change", renderUpcoming);

function renderOverviewActiveProjects() {
  const el = document.querySelector("[data-active-projects]");
  if (!el) return;

  const items = PROJECTS.filter((p) => !["Completed", "Archived"].includes(p.status)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6);

  el.innerHTML = items.length
    ? items
        .map(
          (p) => `
            <tr data-open-project="${p.id}" style="cursor:pointer">
              <td class="dash-table-name">${escapeHtml(p.title)}</td>
              <td>${statusBadge(p.status)}</td>
              <td class="dash-table-muted">${formatDate(p.deadline)}</td>
              <td>${priorityLabel(p.priority)}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td colspan="4">${emptyState("No active projects", "Everything is completed or archived.")}</td></tr>`;

  el.querySelectorAll("[data-open-project]").forEach((row) => row.addEventListener("click", () => openProjectDetail(row.getAttribute("data-open-project"))));
}

/* Milestones are eagerly loaded for every project (see reloadProjects()),
   but comments/activity are lazy — loaded only once a project's detail
   drawer opens — so this Overview panel needs its own cross-project
   queries rather than reading project.comments off every project. */
async function todaysActions() {
  const actions = [];
  PROJECTS.forEach((p) => {
    p.milestones.forEach((m) => {
      if (m.status === "Completed") return;
      const diff = daysUntil(m.dueDate);
      if (diff !== null && diff <= 0) actions.push({ icon: "calendar", overdue: diff < 0, text: `${m.title} — ${p.title}`, meta: formatDueLabel(m.dueDate), date: m.dueDate, projectId: p.id });
    });
  });

  try {
    const pending = await loadPendingClientReplies();
    pending.forEach((c) => {
      actions.push({ icon: "bell", overdue: false, text: `Reply to ${c.author}`, meta: `${c.projectTitle} · awaiting studio reply`, date: c.createdAt, projectId: c.projectId });
    });
  } catch (err) {
    console.error("[studio] loadPendingClientReplies failed", err);
  }

  return actions.sort((a, b) => new Date(a.date) - new Date(b.date));
}

async function renderTodaysActions() {
  const el = document.querySelector("[data-today-actions]");
  if (!el) return;
  const actions = (await todaysActions()).slice(0, 7);
  el.innerHTML = actions.length
    ? actions.map((a) => `
        <div class="action-item ${a.overdue ? "is-overdue" : ""}" data-open-project="${a.projectId}" style="cursor:pointer">
          <span class="action-item-icon">${icon(a.icon)}</span>
          <div class="action-item-main"><p>${escapeHtml(a.text)}</p><span>${escapeHtml(a.meta)}</span></div>
        </div>
      `).join("")
    : emptyState("Nothing needs attention today", "Deadlines and client replies will show up here.");
  el.querySelectorAll("[data-open-project]").forEach((row) => row.addEventListener("click", () => openProjectDetail(row.getAttribute("data-open-project"))));
}

async function renderRecentActivity() {
  const el = document.querySelector("[data-recent-activity]");
  if (!el) return;
  let all = [];
  try {
    all = await loadRecentActivityAcrossProjects(6);
  } catch (err) {
    console.error("[studio] loadRecentActivityAcrossProjects failed", err);
  }
  el.innerHTML = all.length
    ? all.map((a) => `
        <div class="timeline-item">
          <span class="timeline-icon">${icon(activityIcon(a.type))}</span>
          <div class="timeline-body"><p>${escapeHtml(a.description)} <span style="color:var(--faint)">· ${escapeHtml(a.projectTitle)}</span></p><time>${relativeTime(a.createdAt)}</time></div>
        </div>
      `).join("")
    : emptyState("No recent activity", "Studio activity across all projects will appear here.");
}

async function renderOverview() {
  renderMetricCards();
  renderUpcoming();
  renderOverviewActiveProjects();
  await Promise.all([renderTodaysActions(), renderRecentActivity()]);
}

/* ---------- Ongoing Projects: filters ---------- */

const projectFilters = { search: "", status: "All", priority: "All", assignee: "All", month: "All" };

function populateFilterOptions() {
  const statusSel = document.querySelector("[data-status-filter]");
  const prioritySel = document.querySelector("[data-priority-filter]");
  const assigneeSel = document.querySelector("[data-assignee-filter]");
  const monthSel = document.querySelector("[data-month-filter]");

  if (statusSel) statusSel.innerHTML = `<option value="All">Status</option>` + PROJECT_STATUSES.map((s) => `<option value="${s}">${s}</option>`).join("");
  if (prioritySel) prioritySel.innerHTML = `<option value="All">Priority</option>` + PRIORITIES.map((p) => `<option value="${p}">${p}</option>`).join("");
  if (assigneeSel) assigneeSel.innerHTML = `<option value="All">Assignee</option>` + TEAM.map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("");

  const months = [...new Set(PROJECTS.map((p) => monthKey(p.deadline)))].sort().reverse();
  if (monthSel) monthSel.innerHTML = `<option value="All">Month</option>` + months.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("");
}

["search", "status", "priority", "assignee", "month"].forEach((key) => {
  const attr = key === "search" ? "[data-project-search]" : `[data-${key}-filter]`;
  const el = document.querySelector(attr);
  el?.addEventListener(key === "search" ? "input" : "change", (e) => {
    projectFilters[key] = e.target.value;
    renderProjectsView();
  });
});

function getFilteredProjects() {
  let items = [...PROJECTS];
  const { search, status, priority, assignee, month } = projectFilters;
  if (search) {
    const q = search.toLowerCase();
    items = items.filter((p) => p.title.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.team.some((id) => teamName(id).toLowerCase().includes(q)) || (p.description || "").toLowerCase().includes(q));
  }
  if (status !== "All") items = items.filter((p) => p.status === status);
  if (priority !== "All") items = items.filter((p) => p.priority === priority);
  if (assignee !== "All") items = items.filter((p) => p.team.includes(assignee));
  if (month !== "All") items = items.filter((p) => monthKey(p.deadline) === month);
  return items;
}

/* ---------- Ongoing Projects: state ---------- */

const expandedProjects = new Set();
const collapsedMonths = new Set();
let currentMonthKey = monthKey(todayISO());

/* Every month except the current one starts collapsed. */
[...new Set(PROJECTS.map((p) => monthKey(p.deadline)))].forEach((key) => {
  if (key !== currentMonthKey) collapsedMonths.add(key);
});
let draggingFieldId = null;
let editingCell = null; // { projectId, fieldId } — guards against double-activation

/* ---------- floating popovers (row menu, column menu, select/person pickers) ----------
   One shared, body-level popover so nothing is ever clipped by the
   table's horizontal scroll container, and so a re-render of the table
   underneath never destroys an open popover. */

let activePopover = null;

function closePopover() {
  if (!activePopover) return;
  activePopover.el.remove();
  document.removeEventListener("mousedown", activePopover.outsideHandler, true);
  document.removeEventListener("keydown", activePopover.escHandler, true);
  activePopover = null;
}

function openPopover(anchorEl, innerHtml, { width = 220, className = "" } = {}) {
  closePopover();
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = `floating-popover glass-surface ${className}`;
  el.style.width = `${width}px`;
  el.innerHTML = innerHtml;
  document.body.appendChild(el);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const elH = el.offsetHeight;
  let left = Math.min(rect.left, vw - width - 8);
  left = Math.max(8, left);
  let top = rect.bottom + 6;
  if (top + elH > vh - 8) top = Math.max(8, rect.top - elH - 6);
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;

  const outsideHandler = (e) => { if (!el.contains(e.target) && e.target !== anchorEl && !anchorEl.contains(e.target)) closePopover(); };
  const escHandler = (e) => { if (e.key === "Escape") closePopover(); };
  document.addEventListener("mousedown", outsideHandler, true);
  document.addEventListener("keydown", escHandler, true);
  activePopover = { el, outsideHandler, escHandler };
  return el;
}

/* ---------- cell rendering ---------- */

function optionBadge(option) {
  if (!option) return '<span class="cell-placeholder">Set…</span>';
  return `<span class="option-badge" style="background:${option.color}22;color:${option.color};border-color:${option.color}55;">${escapeHtml(option.label)}</span>`;
}

function personGroup(ids) {
  if (!ids || !ids.length) return '<span class="cell-placeholder">Assign…</span>';
  return `<span class="avatar-group">${ids.map((id) => avatarMarkup(teamName(id))).join("")}</span><span class="person-names">${ids.map((id) => escapeHtml(teamName(id))).join(", ")}</span>`;
}

function cellDisplayHtml(project, field) {
  const value = getCellValue(project, field);

  switch (field.type) {
    case "select":
      return optionBadge(optionFor(field, value));
    case "person":
      return personGroup(value);
    case "date":
      return value
        ? `<span class="date-cell-text">${formatDate(value)}</span><span class="date-cell-icon">${icon("calendar")}</span>`
        : `<span class="cell-placeholder">Set date…</span><span class="date-cell-icon">${icon("calendar")}</span>`;
    case "money":
      return value || value === 0 ? formatMoney(value, field.currency) : '<span class="cell-placeholder">Add…</span>';
    case "number":
      return value || value === 0 ? escapeHtml(String(value)) : '<span class="cell-placeholder">Add…</span>';
    case "checkbox":
      return `<input type="checkbox" data-checkbox-cell ${value ? "checked" : ""} />`;
    case "url":
      return value ? `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">${escapeHtml(value)}</a>` : '<span class="cell-placeholder">Add link…</span>';
    case "file":
      return value ? `${icon("file")} ${escapeHtml(value)}` : '<span class="cell-placeholder">Attach…</span>';
    case "longtext":
      return value ? `<span title="${escapeHtml(value)}">${escapeHtml(value.length > 42 ? value.slice(0, 42) + "…" : value)}</span>` : '<span class="cell-placeholder">Add notes…</span>';
    default:
      return value ? escapeHtml(value) : '<span class="cell-placeholder">Untitled project</span>';
  }
}

/* Select fields: one popover both picks a value AND manages the option
   set (add / delete / recolor) — no separate "administration" screen. */

function optionManagerHtml(field, currentValue) {
  const rows = (field.options || [])
    .map(
      (o) => `
        <div class="popover-option-row ${o.label === currentValue ? "is-selected" : ""}">
          <button type="button" class="option-color-dot" style="background:${o.color}" data-recolor-option="${escapeHtml(o.label)}" aria-label="Change color"></button>
          <span class="option-label" data-select-option="${escapeHtml(o.label)}">${escapeHtml(o.label)}</span>
          <button type="button" class="icon-remove" data-delete-option="${escapeHtml(o.label)}" aria-label="Delete option">${icon("close")}</button>
        </div>
      `
    )
    .join("");

  return `
    <div class="popover-options-list">${rows || '<p class="popover-empty">No options yet.</p>'}</div>
    <form class="popover-add-option" data-add-option-form>
      <input type="text" placeholder="Add option…" autofocus />
      <button type="submit">${icon("plus")}</button>
    </form>
  `;
}

/* Generic option-popover core: picks a value from `optionsHolder.options`
   (an array of {id,label,color}) and lets the user add/recolor/delete
   options in place. `persist` names which Supabase table the add/recolor/
   delete actually write to — see the persist* helpers built by each call
   site below (system option lists vs. a custom field's own options). */
function openOptionPopover(anchorEl, optionsHolder, currentValue, onPick, persist) {
  const el = openPopover(anchorEl, optionManagerHtml(optionsHolder, currentValue), { width: 220 });

  const rebuild = () => { el.innerHTML = optionManagerHtml(optionsHolder, currentValue); wire(); };

  function wire() {
    el.querySelectorAll("[data-select-option]").forEach((span) => {
      span.addEventListener("click", () => {
        closePopover();
        onPick(span.getAttribute("data-select-option"));
      });
    });
    el.querySelectorAll("[data-recolor-option]").forEach((dot) => {
      dot.addEventListener("click", async (e) => {
        e.stopPropagation();
        const opt = optionFor(optionsHolder, dot.getAttribute("data-recolor-option"));
        try {
          await persist.recolor(opt);
          rebuild();
          renderProjectsView();
        } catch (err) {
          console.error("[studio] recolor option failed", err);
          toastError(err, "Couldn't recolor that option — try again.");
        }
      });
    });
    el.querySelectorAll("[data-delete-option]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const opt = optionFor(optionsHolder, btn.getAttribute("data-delete-option"));
        try {
          await persist.del(opt);
          rebuild();
          renderProjectsView();
        } catch (err) {
          console.error("[studio] delete option failed", err);
          toastError(err, "Couldn't delete that option — try again.");
        }
      });
    });
    el.querySelector("[data-add-option-form]")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const input = e.currentTarget.querySelector("input");
      const label = input.value.trim();
      if (!label || optionFor(optionsHolder, label)) return;
      try {
        await persist.add(label);
        rebuild();
        renderProjectsView();
        el.querySelector("[data-add-option-form] input")?.focus();
      } catch (err) {
        console.error("[studio] add option failed", err);
        showToast("Couldn't add that option — try again.");
      }
    });
  }

  wire();
}

/* System lists (status/priority/milestone-status) share one table; a
   custom select column's options live scoped to that field instead. */
function systemOptionPersist(kind) {
  return {
    add: (label) => addSystemOption(kind, label),
    recolor: (opt) => recolorSystemOption(kind, opt),
    del: (opt) => deleteSystemOption(kind, opt)
  };
}
function fieldOptionPersist(field) {
  return {
    add: (label) => addFieldOption(field, label),
    recolor: (opt) => recolorFieldOption(field, opt),
    del: (opt) => deleteFieldOption(field, opt)
  };
}

function openSelectPopover(anchorEl, project, field) {
  const kind = field.id === "status" ? "project_status" : field.id === "priority" ? "priority" : null;
  const persist = kind ? systemOptionPersist(kind) : fieldOptionPersist(field);

  openOptionPopover(anchorEl, field, getCellValue(project, field), async (label) => {
    try {
      await setCellValue(project, field, label);
      renderProjectsView();
      renderOverview();
    } catch (err) {
      console.error("[studio] set select value failed", err);
      showToast(`Couldn't update ${field.name} — try again.`);
    }
  }, persist);
}

function openPersonPopover(anchorEl, getIds, setIds) {
  const selected = new Set(getIds());
  const html = TEAM.map(
    (m) => `
      <label class="popover-person-row">
        <input type="checkbox" value="${m.id}" ${selected.has(m.id) ? "checked" : ""} />
        ${avatarMarkup(m.name)}<span>${escapeHtml(m.name)}</span>
      </label>
    `
  ).join("");

  const el = openPopover(anchorEl, `<div class="popover-options-list">${html}</div>`, { width: 220 });

  el.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", async () => {
      const wasChecked = cb.checked;
      cb.checked ? selected.add(cb.value) : selected.delete(cb.value);
      cb.disabled = true;
      try {
        await setIds([...selected]);
        renderProjectsView();
        renderOverview();
      } catch (err) {
        console.error("[studio] set assignees failed", err);
        toastError(err, "Couldn't update assignees — try again.");
        wasChecked ? selected.delete(cb.value) : selected.add(cb.value);
        cb.checked = !wasChecked;
        cb.disabled = false;
      }
    });
  });
}

function activateCellEdit(td, project, field, anchorEl) {
  if (field.type === "checkbox") return; // always interactive, no edit mode needed

  if (field.type === "select") {
    if (!field.options) field.options = [];
    openSelectPopover(anchorEl || td, project, field);
    return;
  }

  if (field.type === "person") {
    openPersonPopover(anchorEl || td, () => getCellValue(project, field) || [], (ids) => setCellValue(project, field, ids));
    return;
  }

  if (editingCell) return;
  editingCell = { projectId: project.id, fieldId: field.id };

  const valueSpan = td.querySelector("[data-cell-display]");
  const value = getCellValue(project, field) ?? "";
  let input;

  if (field.type === "date") {
    valueSpan.innerHTML = `<input class="cell-editor" type="date" value="${value || ""}" />`;
    input = valueSpan.querySelector(".cell-editor");
    input.focus();
    if (input.showPicker) { try { input.showPicker(); } catch { /* not user-activated in some browsers — focus is enough */ } }
  } else if (field.type === "money" || field.type === "number") {
    valueSpan.innerHTML = `<input class="cell-editor" type="number" value="${value === 0 ? 0 : value || ""}" step="${field.type === "money" ? "1000" : "1"}" />`;
    input = valueSpan.querySelector(".cell-editor");
  } else if (field.type === "longtext") {
    valueSpan.innerHTML = `<textarea class="cell-editor" rows="3">${escapeHtml(value)}</textarea>`;
    input = valueSpan.querySelector(".cell-editor");
  } else {
    valueSpan.innerHTML = `<input class="cell-editor" type="text" value="${escapeHtml(value)}" />`;
    input = valueSpan.querySelector(".cell-editor");
  }

  input.focus();
  if (input.select) input.select();

  const commit = async () => {
    if (!editingCell) return;
    editingCell = null;
    let val = input.value;
    if (field.type === "money" || field.type === "number") val = val === "" ? null : Number(val);
    const previous = getCellValue(project, field);
    if (val === previous) { renderProjectsView(); return; }
    input.disabled = true;
    try {
      await setCellValue(project, field, val);
      renderProjectsView();
      renderOverview();
    } catch (err) {
      console.error("[studio] cell update failed", err);
      showToast(`Couldn't save ${field.name} — try again.`);
      renderProjectsView();
    }
  };

  const cancel = () => {
    editingCell = null;
    renderProjectsView();
  };

  input.addEventListener("blur", commit);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && field.type !== "longtext") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  });
}

/* ---------- row rendering ---------- */

function renderHeaderRow() {
  const cells = FIELDS.map(
    (field) => `
      <th draggable="true" data-field-id="${field.id}" style="${field.width ? `width:${field.width}px;` : ""}">
        <div class="th-inner">
          <span class="th-drag-handle">${icon(FIELD_TYPE_ICON[field.type] || "textLines")}</span>
          <span class="th-label" data-col-label="${field.id}">${escapeHtml(field.name.toUpperCase())}</span>
        </div>
        <span class="col-resize-handle" data-resize-col="${field.id}"></span>
      </th>
    `
  ).join("");

  return `<tr>${cells}<th class="studio-th-add"><button type="button" data-modal-open="add-column" aria-label="Add column">${icon("plus")}</button></th></tr>`;
}

function columnMenuHtml(field) {
  const deleteRow = field.id === "title" ? "" : `<button type="button" class="is-danger" data-col-delete>${icon("trash")} Delete</button>`;
  return `
    <div class="popover-menu">
      <button type="button" data-col-rename>${icon("textLines")} Rename</button>
      <button type="button" data-col-insert>${icon("plus")} Insert column</button>
      <button type="button" data-col-duplicate>${icon("archive")} Duplicate</button>
      ${deleteRow}
    </div>
  `;
}

let insertAfterFieldId = null;

function openColumnMenu(th, field) {
  const el = openPopover(th, columnMenuHtml(field), { width: 180 });

  el.querySelector("[data-col-rename]")?.addEventListener("click", () => {
    closePopover();
    const labelSpan = document.querySelector(`[data-col-label="${field.id}"]`);
    if (!labelSpan) return;
    labelSpan.innerHTML = `<input class="th-rename-input" type="text" value="${escapeHtml(field.name)}" />`;
    const input = labelSpan.querySelector("input");
    input.focus();
    input.select();
    const commit = async () => {
      const name = input.value.trim();
      if (!name || name === field.name) { renderProjectsView(); return; }
      input.disabled = true;
      try {
        await renameField(field, name);
        renderProjectsView();
      } catch (err) {
        console.error("[studio] renameField failed", err);
        toastError(err, "Couldn't rename that column — try again.");
        renderProjectsView();
      }
    };
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); commit(); }
      if (e.key === "Escape") { e.preventDefault(); renderProjectsView(); }
    });
  });

  el.querySelector("[data-col-insert]")?.addEventListener("click", () => {
    closePopover();
    insertAfterFieldId = field.id;
    openModal("add-column");
  });

  el.querySelector("[data-col-duplicate]")?.addEventListener("click", async () => {
    closePopover();
    try {
      const copy = await duplicateField(field);
      showToast(`Column “${copy.name}” added.`);
      renderProjectsView();
    } catch (err) {
      console.error("[studio] duplicateField failed", err);
      toastError(err, "Couldn't duplicate that column — try again.");
    }
  });

  el.querySelector("[data-col-delete]")?.addEventListener("click", () => {
    closePopover();
    openConfirm(`Delete column "${field.name}"?`, "This removes the column and its values from every project.", async () => {
      try {
        await deleteField(field);
        showToast(`Column “${field.name}” deleted.`);
        renderProjectsView();
      } catch (err) {
        console.error("[studio] deleteField failed", err);
        toastError(err, "Couldn't delete that column — try again.");
      }
    });
  });
}

function renderProjectRow(project) {
  const cells = FIELDS.map((field) => {
    const sticky = field.id === "title" ? " studio-cell-sticky" : "";
    const expandBtn = field.id === "title"
      ? `<button class="expand-toggle ${project.milestones.length ? "" : "is-empty"}" type="button" data-toggle-expand="${project.id}" aria-label="Expand milestones">${icon("chevronDown")}</button>`
      : "";
    const inner = field.id === "title"
      ? `<div class="cell-inner">${expandBtn}<span class="cell-value" data-cell-display>${cellDisplayHtml(project, field)}</span></div>`
      : `<span class="cell-value" data-cell-display>${cellDisplayHtml(project, field)}</span>`;
    return `<td class="cell-wrap${sticky}" data-project="${project.id}" data-field="${field.id}">${inner}</td>`;
  }).join("");

  const rowActions = project.isDraft
    ? `<td class="studio-row-actions"><button class="icon-remove" type="button" data-cancel-draft="${project.id}" aria-label="Discard">${icon("close")}</button></td>`
    : `<td class="studio-row-actions"><button class="icon-btn" type="button" data-row-menu-toggle="${project.id}" aria-label="More actions">${icon("dots")}</button></td>`;

  return `<tr class="studio-row ${project.isDraft ? "is-draft" : ""}" data-project-row="${project.id}">${cells}${rowActions}</tr>`;
}

function rowMenuHtml(project) {
  return `
    <div class="popover-menu">
      <button type="button" data-row-open="${project.id}">${icon("eye")} Open detail</button>
      <button type="button" data-row-duplicate="${project.id}">${icon("archive")} Duplicate</button>
      <button type="button" data-row-archive="${project.id}">${icon("archive")} Archive</button>
      <button type="button" class="is-danger" data-row-delete="${project.id}">${icon("trash")} Delete</button>
    </div>
  `;
}

/* Milestone sub-rows share the exact column positions as the parent
   Project row (Assignee / Start / Due / Priority / Status) — everything
   else stays blank so a milestone reads as "the same table, one level
   in", not a separate mini-component. */

function renderMilestoneRow(project, milestone) {
  const isDone = milestone.status === "Completed";
  const cells = FIELDS.map((field) => {
    const sticky = field.id === "title" ? " studio-cell-sticky" : "";
    let inner = "";

    if (field.id === "title") {
      inner = `
        <div class="cell-inner milestone-title-cell">
          <input type="checkbox" data-milestone-check="${project.id}:${milestone.id}" ${isDone ? "checked" : ""} />
          <span class="milestone-name ${isDone ? "is-complete" : ""}" data-milestone-rename="${project.id}:${milestone.id}">${escapeHtml(milestone.title)}</span>
        </div>
      `;
    } else if (field.id === "assignee") {
      inner = `<span class="cell-value" data-milestone-assignee="${project.id}:${milestone.id}">${personGroup(milestone.assignees)}</span>`;
    } else if (field.id === "deadline") {
      inner = `<span class="cell-value" data-milestone-due="${project.id}:${milestone.id}">${milestone.dueDate ? formatDueLabel(milestone.dueDate, isDone) : '<span class="cell-placeholder">Set date…</span>'}<span class="date-cell-icon">${icon("calendar")}</span></span>`;
    } else if (field.id === "priority") {
      inner = `<span class="cell-value" data-milestone-priority="${project.id}:${milestone.id}">${optionBadge(optionFor(FIELDS.find((f) => f.id === "priority"), milestone.priority))}</span>`;
    } else if (field.id === "status") {
      inner = `<span class="cell-value" data-milestone-status="${project.id}:${milestone.id}">${optionBadge(MILESTONE_STATUS_OPTIONS.find((o) => o.label === milestone.status))}</span>`;
    }

    return `<td class="cell-wrap milestone-cell${sticky}">${inner}</td>`;
  }).join("");

  return `<tr class="milestone-row" data-milestone-row="${project.id}:${milestone.id}">${cells}<td class="studio-row-actions"></td></tr>`;
}

function renderMonthGroup(key, projects) {
  const collapsed = collapsedMonths.has(key);
  return `
    <div class="month-group panel ${collapsed ? "is-collapsed" : ""}" data-month-group="${key}">
      <button class="month-group-header" type="button" data-toggle-month="${key}">
        <svg class="month-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
        <h3>${monthLabel(key)}</h3>
        <span class="month-group-count">${projects.length}</span>
      </button>
      <div class="month-group-body">
        <div class="dash-table-wrap">
          <table class="studio-table">
            <thead>${renderHeaderRow()}</thead>
            <tbody>
              ${projects
                .map((p) => renderProjectRow(p) + (expandedProjects.has(p.id) ? p.milestones.map((m) => renderMilestoneRow(p, m)).join("") : ""))
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function renderProjectsView() {
  const container = document.querySelector("[data-studio-groups]");
  if (!container) return;

  const items = getFilteredProjects();
  const groups = {};
  items.forEach((p) => {
    const key = monthKey(p.deadline) || "undated";
    (groups[key] = groups[key] || []).push(p);
  });

  const keys = Object.keys(groups).sort().reverse();

  container.innerHTML = keys.length
    ? keys.map((key) => renderMonthGroup(key, groups[key].sort((a, b) => (a.isDraft === b.isDraft ? new Date(a.deadline) - new Date(b.deadline) : a.isDraft ? 1 : -1)))).join("")
    : `<div class="panel">${emptyState("No matching projects", "Try a different search or filter.")}</div>`;

  wireProjectsView(container);
}

/* ---------- wiring: click delegation over the whole Ongoing Projects container ---------- */

function wireProjectsView(container) {
  container.querySelectorAll("[data-toggle-month]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-toggle-month");
      collapsedMonths.has(key) ? collapsedMonths.delete(key) : collapsedMonths.add(key);
      renderProjectsView();
    });
  });

  container.querySelectorAll("[data-toggle-expand]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-toggle-expand");
      expandedProjects.has(id) ? expandedProjects.delete(id) : expandedProjects.add(id);
      renderProjectsView();
    });
  });

  container.querySelectorAll("[data-cell-display]").forEach((span) => {
    span.addEventListener("click", (e) => {
      const td = span.closest("[data-project]");
      if (!td) return;
      const project = findProject(td.getAttribute("data-project"));
      const field = FIELDS.find((f) => f.id === td.getAttribute("data-field"));
      if (!project || !field) return;
      if (field.type === "checkbox") return;
      /* Date cells are click-triggered by the hover-only calendar icon
         only, not the whole (mostly empty) cell. */
      if (field.type === "date" && !e.target.closest(".date-cell-icon")) return;
      activateCellEdit(td, project, field, span);
    });
  });

  container.querySelectorAll("[data-checkbox-cell]").forEach((cb) => {
    cb.addEventListener("click", async (e) => {
      const td = cb.closest("[data-project]");
      const project = findProject(td.getAttribute("data-project"));
      const field = FIELDS.find((f) => f.id === td.getAttribute("data-field"));
      const checked = cb.checked;
      cb.disabled = true;
      try {
        await setCellValue(project, field, checked);
        renderMetricCards();
      } catch (err) {
        console.error("[studio] checkbox update failed", err);
        showToast(`Couldn't update ${field.name} — try again.`);
        cb.checked = !checked;
      } finally {
        cb.disabled = false;
      }
    });
  });

  container.querySelectorAll("[data-milestone-check]").forEach((cb) => {
    cb.addEventListener("click", async (e) => {
      const [projectId, milestoneId] = cb.getAttribute("data-milestone-check").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      const nextStatus = cb.checked ? "Completed" : "Not started";
      cb.disabled = true;
      try {
        await setMilestoneField(project, milestone, "status", nextStatus);
        renderProjectsView();
        renderMetricCards();
      } catch (err) {
        console.error("[studio] milestone check failed", err);
        showToast("Couldn't update that milestone — try again.");
        renderProjectsView();
      }
    });
  });

  container.querySelectorAll("[data-milestone-assignee]").forEach((span) => {
    span.addEventListener("click", (e) => {
      const [projectId, milestoneId] = span.getAttribute("data-milestone-assignee").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      openPersonPopover(span, () => milestone.assignees || [], (ids) => setMilestoneAssignees(milestone, ids));
    });
  });

  container.querySelectorAll("[data-milestone-priority]").forEach((span) => {
    span.addEventListener("click", (e) => {
      const [projectId, milestoneId] = span.getAttribute("data-milestone-priority").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      const priorityField = FIELDS.find((f) => f.id === "priority");
      openOptionPopover(span, priorityField, milestone.priority, async (label) => {
        try {
          await setMilestoneField(project, milestone, "priority", label);
          renderProjectsView();
        } catch (err) {
          console.error("[studio] set milestone priority failed", err);
          showToast("Couldn't update priority — try again.");
        }
      }, systemOptionPersist("priority"));
    });
  });

  container.querySelectorAll("[data-milestone-status]").forEach((span) => {
    span.addEventListener("click", (e) => {
      const [projectId, milestoneId] = span.getAttribute("data-milestone-status").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      openOptionPopover(span, { options: MILESTONE_STATUS_OPTIONS }, milestone.status, async (label) => {
        try {
          await setMilestoneField(project, milestone, "status", label);
          renderProjectsView();
          renderMetricCards();
        } catch (err) {
          console.error("[studio] set milestone status failed", err);
          showToast("Couldn't update status — try again.");
        }
      }, systemOptionPersist("milestone_status"));
    });
  });

  container.querySelectorAll("[data-milestone-due]").forEach((span) => {
    span.addEventListener("click", (e) => {
      if (!e.target.closest(".date-cell-icon")) return;
      const [projectId, milestoneId] = span.getAttribute("data-milestone-due").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      span.innerHTML = `<input class="cell-editor" type="date" value="${milestone.dueDate || ""}" />`;
      const input = span.querySelector("input");
      input.focus();
      if (input.showPicker) { try { input.showPicker(); } catch { /* ignore */ } }
      const commit = async () => {
        if (input.value === milestone.dueDate) { renderProjectsView(); return; }
        input.disabled = true;
        try {
          await setMilestoneField(project, milestone, "dueDate", input.value);
          renderProjectsView();
        } catch (err) {
          console.error("[studio] set milestone due date failed", err);
          showToast("Couldn't update the due date — try again.");
          renderProjectsView();
        }
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); commit(); } if (ev.key === "Escape") { ev.preventDefault(); renderProjectsView(); } });
    });
  });

  container.querySelectorAll("[data-milestone-rename]").forEach((span) => {
    span.addEventListener("click", () => {
      const [projectId, milestoneId] = span.getAttribute("data-milestone-rename").split(":");
      const project = findProject(projectId);
      const milestone = project.milestones.find((m) => m.id === milestoneId);
      span.innerHTML = `<input class="cell-editor" type="text" value="${escapeHtml(milestone.title)}" />`;
      const input = span.querySelector("input");
      input.focus();
      input.select();
      const commit = async () => {
        const title = input.value.trim();
        if (!title || title === milestone.title) { renderProjectsView(); return; }
        input.disabled = true;
        try {
          await setMilestoneField(project, milestone, "title", title);
          renderProjectsView();
        } catch (err) {
          console.error("[studio] rename milestone failed", err);
          showToast("Couldn't rename that milestone — try again.");
          renderProjectsView();
        }
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); commit(); } if (ev.key === "Escape") { ev.preventDefault(); renderProjectsView(); } });
    });
  });

  container.querySelectorAll("[data-project-row]").forEach((row) => {
    row.addEventListener("click", (e) => {
      if (e.target.closest("[data-cell-display]") || e.target.closest(".cell-editor") || e.target.closest(".studio-row-actions") || e.target.closest(".expand-toggle") || e.target.closest("[data-checkbox-cell]")) return;
      const id = row.getAttribute("data-project-row");
      if (findProject(id)?.isDraft) return;
      openProjectDetail(id);
    });
  });

  container.querySelectorAll("[data-row-menu-toggle]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const projectId = btn.getAttribute("data-row-menu-toggle");
      const el = openPopover(btn, rowMenuHtml(findProject(projectId)), { width: 170 });
      el.querySelector("[data-row-open]")?.addEventListener("click", () => { closePopover(); openProjectDetail(projectId); });
      el.querySelector("[data-row-duplicate]")?.addEventListener("click", async () => {
        closePopover();
        const original = findProject(projectId);
        try {
          const copy = await duplicateProject(original);
          showToast(`“${original.title}” duplicated.`);
          renderProjectsView();
          renderOverview();
          return copy;
        } catch (err) {
          console.error("[studio] duplicateProject failed", err);
          toastError(err, "Couldn't duplicate that project — try again.");
        }
      });
      el.querySelector("[data-row-archive]")?.addEventListener("click", async () => {
        closePopover();
        const project = findProject(projectId);
        try {
          await archiveProject(project);
          showToast(`“${project.title}” archived.`);
          renderProjectsView();
          renderOverview();
        } catch (err) {
          console.error("[studio] archiveProject failed", err);
          showToast("Couldn't archive that project — try again.");
        }
      });
      el.querySelector("[data-row-delete]")?.addEventListener("click", () => {
        closePopover();
        const project = findProject(projectId);
        openConfirm(`Delete "${project.title}"?`, "This removes the project from Ongoing Projects. Its history is kept, not destroyed.", async () => {
          try {
            await softDeleteProject(project);
            showToast(`“${project.title}” deleted.`);
            renderProjectsView();
            renderOverview();
          } catch (err) {
            console.error("[studio] softDeleteProject failed", err);
            showToast("Couldn't delete that project — try again.");
          }
        });
      });
    });
  });

  container.querySelectorAll("[data-cancel-draft]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute("data-cancel-draft");
      const project = findProject(id);
      try {
        await softDeleteProject(project);
        renderProjectsView();
      } catch (err) {
        console.error("[studio] discard draft failed", err);
        showToast("Couldn't discard that row — try again.");
      }
    });
  });

  /* Column header: click the label to open the menu, right-click anywhere on the header for the same menu */
  container.querySelectorAll("th[data-field-id]").forEach((th) => {
    const field = FIELDS.find((f) => f.id === th.getAttribute("data-field-id"));
    if (!field) return;
    th.querySelector(".th-label")?.addEventListener("click", (e) => { e.stopPropagation(); openColumnMenu(th, field); });
    th.addEventListener("contextmenu", (e) => { e.preventDefault(); openColumnMenu(th, field); });
  });

  /* Column resize */
  container.querySelectorAll("[data-resize-col]").forEach((handle) => {
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const fieldId = handle.getAttribute("data-resize-col");
      const field = FIELDS.find((f) => f.id === fieldId);
      const th = handle.closest("th");
      const startX = e.clientX;
      const startWidth = th.getBoundingClientRect().width;

      const onMove = (ev) => {
        const newWidth = Math.max(70, startWidth + (ev.clientX - startX));
        document.querySelectorAll(`th[data-field-id="${fieldId}"]`).forEach((t) => { t.style.width = `${newWidth}px`; });
      };
      const onUp = async (ev) => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        const width = Math.max(70, startWidth + (ev.clientX - startX));
        try {
          await resizeField(field, width);
        } catch (err) {
          console.error("[studio] resizeField failed", err);
          toastError(err, "Couldn't save that column width.");
        }
        renderProjectsView();
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  });

  /* Column drag-reorder */
  container.querySelectorAll("th[draggable='true']").forEach((th) => {
    th.addEventListener("dragstart", (e) => {
      draggingFieldId = th.getAttribute("data-field-id");
      e.dataTransfer.effectAllowed = "move";
      th.classList.add("is-dragging");
    });
    th.addEventListener("dragend", () => th.classList.remove("is-dragging"));
    th.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (th.getAttribute("data-field-id") !== draggingFieldId) th.classList.add("is-drop-target");
    });
    th.addEventListener("dragleave", () => th.classList.remove("is-drop-target"));
    th.addEventListener("drop", async (e) => {
      e.preventDefault();
      th.classList.remove("is-drop-target");
      const targetId = th.getAttribute("data-field-id");
      if (!draggingFieldId || draggingFieldId === targetId) return;
      const from = FIELDS.findIndex((f) => f.id === draggingFieldId);
      const to = FIELDS.findIndex((f) => f.id === targetId);
      const [moved] = FIELDS.splice(from, 1);
      FIELDS.splice(to, 0, moved);
      draggingFieldId = null;
      renderProjectsView();
      try {
        await reorderFields(FIELDS);
      } catch (err) {
        console.error("[studio] reorderFields failed", err);
        toastError(err, "Couldn't save the new column order.");
      }
    });
  });
}

/* ---------- Add Column ---------- */

document.getElementById("col-type")?.addEventListener("change", (e) => {
  document.querySelector("[data-col-options-field]").style.display = e.target.value === "select" ? "block" : "none";
});

document.querySelector('[data-modal="add-column"]')?.querySelectorAll("[data-modal-close]").forEach((btn) => {
  btn.addEventListener("click", () => { insertAfterFieldId = null; });
});

document.getElementById("form-add-column")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const type = data.get("type");
  const name = data.get("name") || "New field";
  const labels = type === "select"
    ? String(data.get("options") || "").split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  if (type === "select" && !labels.length) labels.push("Option 1");

  const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    await createField({ name, type, options: labels, insertAfterId: insertAfterFieldId });
    insertAfterFieldId = null;
    closeAllModals();
    event.currentTarget.reset();
    document.querySelector("[data-col-options-field]").style.display = "none";
    showToast(`Column “${name}” added.`);
    renderProjectsView();
  } catch (err) {
    console.error("[studio] createField failed", err);
    toastError(err, "Couldn't add that column — try again.");
  } finally {
    submitBtn.disabled = false;
  }
});

/* ---------- New Project (inline row) ---------- */

document.querySelector("[data-new-project]")?.addEventListener("click", async (e) => {
  switchTab("projects");
  collapsedMonths.delete(currentMonthKey);

  /* A New Project always lands in the current month's table, as the last
     row — clear any active filter that could hide the month or the row. */
  projectFilters.search = "";
  projectFilters.status = "All";
  projectFilters.priority = "All";
  projectFilters.assignee = "All";
  projectFilters.month = "All";
  const searchEl = document.querySelector("[data-project-search]");
  if (searchEl) searchEl.value = "";
  ["status", "priority", "assignee", "month"].forEach((key) => {
    const el = document.querySelector(`[data-${key}-filter]`);
    if (el) el.value = "All";
  });

  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const project = await createProject({ deadline: todayISO(), startDate: todayISO() });
    renderProjectsView();
    window.requestAnimationFrame(() => {
      const row = document.querySelector(`[data-project-row="${project.id}"]`);
      row?.querySelector("[data-cell-display]")?.click();
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  } catch (err) {
    console.error("[studio] createProject failed", err);
    showToast("Couldn't create the project — try again.");
  } finally {
    btn.disabled = false;
  }
});

/* ---------- generic confirm modal ---------- */

let confirmCallback = null;

function openConfirm(title, body, onConfirm) {
  document.querySelector("[data-confirm-title]").textContent = title;
  document.querySelector("[data-confirm-body]").textContent = body;
  confirmCallback = onConfirm;
  openModal("confirm");
}

document.querySelector("[data-confirm-action]")?.addEventListener("click", () => {
  const cb = confirmCallback;
  confirmCallback = null;
  closeAllModals();
  cb?.();
});

/* ---------- Project detail drawer ---------- */

let previewingClient = false;

function milestoneClass(status) {
  if (status === "Completed") return "is-complete";
  if (status === "In progress") return "is-progress";
  return "";
}

function buildMilestonesHtml(project) {
  if (!project.milestones.length) return emptyState("No milestones yet", "Add milestones to track this project's timeline.");
  return `
    <div class="milestone-timeline">
      ${project.milestones
        .map((m) => {
          const cls = milestoneClass(m.status);
          const marker = m.status === "Completed" ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l4 4 10-10"/></svg>' : "";
          return `
            <div class="milestone-item ${cls}">
              <span class="milestone-marker">${marker}</span>
              <div class="milestone-head">
                <strong>${escapeHtml(m.title)}</strong>
                <span class="milestone-tags">${m.clientVisible ? '<span class="badge badge--soon">Client visible</span>' : ""}${formatDueLabel(m.dueDate, m.status === "Completed")}</span>
              </div>
              <p>${escapeHtml(m.description || "")}</p>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function buildTeamHtml(project) {
  if (!project.team.length) return emptyState("No team members yet", "Add someone from the Studio team.");
  return project.team
    .map((id) => {
      const member = teamMember(id);
      return `
        <div class="detail-row">
          ${avatarMarkup(member?.name || id)}
          <div class="detail-row-main"><strong>${escapeHtml(member?.name || id)}</strong><span>${escapeHtml(member?.role || "")}</span></div>
          <button class="icon-remove" type="button" data-remove-team="${id}" aria-label="Remove">${icon("close")}</button>
        </div>
      `;
    })
    .join("");
}

const FILE_CATEGORIES = ["Brief", "References", "Working Files", "Drafts", "Client Review", "Final Deliverables"];

function buildFilesHtml(project, clientPreview) {
  const files = clientPreview ? project.files.filter((f) => f.visibility === "Client") : project.files;
  if (!files.length) return emptyState("No files yet", clientPreview ? "The studio hasn't shared any files yet." : "Upload a brief, reference, or deliverable to get started.");
  const grouped = FILE_CATEGORIES.map((cat) => ({ cat, files: files.filter((f) => f.category === cat) })).filter((g) => g.files.length);
  return grouped
    .map(
      (group) => `
        <div class="file-category-label">${group.cat}</div>
        ${group.files
          .map(
            (f) => `
              <div class="detail-row">
                <span class="file-icon">${icon("file")}</span>
                <div class="detail-row-main"><strong>${escapeHtml(f.name)}</strong><span>${f.size} · ${f.uploadedBy} · ${formatDate(f.uploadedAt)}${f.pending ? " · Not uploaded — storage not connected yet" : ""}</span></div>
                <span class="badge badge--${f.visibility === "Client" ? "active" : "soon"}">${f.visibility}</span>
              </div>
            `
          )
          .join("")}
      `
    )
    .join("");
}

function buildFeedHtml(project, clientPreview) {
  const items = [...project.activity.map((a) => ({ kind: "activity", ...a })), ...project.comments.map((c) => ({ kind: "comment", ...c }))];
  const visible = clientPreview ? items.filter((i) => i.kind === "comment" || i.visibility === "client") : items;
  visible.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (!visible.length) return emptyState("No activity yet", "Updates, files, and comments will show up here.");
  return visible
    .map((item) => {
      if (item.kind === "comment") {
        const isClient = item.authorType === "client";
        return `
          <div class="comment-item ${isClient ? "is-client" : "is-studio"}">
            ${avatarMarkup(item.author)}
            <div class="comment-body">
              <div class="comment-head"><strong>${escapeHtml(item.author)}</strong><span class="comment-tag">${isClient ? "Client" : "Studio"}</span><time>${relativeTime(item.createdAt)}</time></div>
              <p>${escapeHtml(item.content)}</p>
              ${item.context ? `<span class="comment-context">on ${escapeHtml(item.context)}</span>` : ""}
            </div>
          </div>
        `;
      }
      return `
        <div class="timeline-item">
          <span class="timeline-icon">${icon(activityIcon(item.type))}</span>
          <div class="timeline-body"><p>${escapeHtml(item.description)}</p><time>${relativeTime(item.createdAt)}</time></div>
        </div>
      `;
    })
    .join("");
}

function buildProjectDetailHtml(project, clientPreview) {
  const progress = computeProgress(project);

  return `
    <button class="icon-btn" type="button" data-detail-close aria-label="Close" style="position:absolute;top:1.25rem;right:1.25rem;">${icon("close")}</button>

    ${clientPreview ? `<div class="client-preview-banner">${icon("eye")} Client Preview — this is a mock permission view</div>` : ""}

    <div class="detail-header">
      <div>
        <div class="detail-title-row"><h2>${escapeHtml(project.title || "Untitled project")}</h2>${statusBadge(project.status)}</div>
        <div class="detail-meta">
          <span>${escapeHtml(project.client)}</span>
          ${
            clientPreview
              ? `<span>${priorityLabel(project.priority)}</span>`
              : `
                <select data-status-select>${PROJECT_STATUSES.map((s) => `<option ${s === project.status ? "selected" : ""}>${s}</option>`).join("")}</select>
                <select data-priority-select>${PRIORITIES.map((p) => `<option ${p === project.priority ? "selected" : ""}>${p}</option>`).join("")}</select>
              `
          }
          <span>${formatDueLabel(project.deadline)}</span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn" type="button" data-toggle-preview>${icon("eye")} ${clientPreview ? "Studio view" : "Preview as client"}</button>
        <button class="btn btn-primary" type="button" data-open-share>${icon("share")} Share</button>
      </div>
    </div>

    <div class="detail-progress">
      <div class="detail-progress-label"><span>Progress</span><span>${progress}%</span></div>
      <div class="progress" style="--progress:${progress}%"><span></span></div>
    </div>

    <div class="detail-section">
      <h3>Overview</h3>
      <p class="detail-description">${escapeHtml(project.description || "No description yet.")}</p>
      ${!clientPreview && project.notes ? `<p class="detail-description" style="margin-top:0.5rem;color:var(--faint);"><strong style="color:var(--muted)">Internal notes:</strong> ${escapeHtml(project.notes)}</p>` : ""}
      ${!clientPreview ? (() => {
        const client = clientRecord(project);
        return `<div class="detail-row" style="margin-top:var(--space-3);"><div class="detail-row-main"><strong>Contact</strong><span>${escapeHtml(client?.contact_name || "—")} · ${escapeHtml(client?.phone || "—")} · ${escapeHtml(client?.email || "—")}</span></div></div>`;
      })() : ""}
    </div>

    <div class="detail-section"><h3>Milestones</h3>${buildMilestonesHtml(project)}</div>

    ${
      clientPreview
        ? ""
        : `
          <div class="detail-section">
            <h3>Team</h3>
            ${buildTeamHtml(project)}
            <div style="display:flex;gap:0.5rem;margin-top:var(--space-3);">
              <select class="input select" data-add-team-select>
                <option value="">Add member…</option>
                ${TEAM.filter((m) => !project.team.includes(m.id)).map((m) => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join("")}
              </select>
            </div>
          </div>
        `
    }

    <div class="detail-section">
      <h3>Files &amp; deliverables</h3>
      ${buildFilesHtml(project, clientPreview)}
      ${clientPreview ? "" : `<label class="upload-drop">${icon("upload")} Click to stage a file (not uploaded — storage not connected yet)<input type="file" data-file-input /></label>`}
    </div>

    <div class="detail-section">
      <h3>Activity &amp; comments</h3>
      ${buildFeedHtml(project, clientPreview)}
      ${clientPreview ? "" : `<form class="note-composer" data-note-form><input class="input" type="text" placeholder="Add an internal note…" required /><button class="btn" type="submit">Post</button></form>`}
    </div>

    ${
      clientPreview
        ? ""
        : `
          <div class="detail-section" style="border-top:0.0625rem solid var(--line-soft);padding-top:var(--space-5);">
            <button class="btn" type="button" data-delete-project style="width:100%;color:var(--danger);border-color:rgba(255,90,95,0.4);">${icon("trash")} Delete Project</button>
          </div>
        `
    }
  `;
}

async function openProjectDetail(id) {
  const project = findProject(id);
  if (!project) return;
  previewingClient = false;
  openDetail(`<div style="padding:var(--space-6);text-align:center;color:var(--muted);">Loading…</div>`);
  try {
    await Promise.all([loadProjectFiles(project), loadProjectComments(project), loadProjectActivity(project)]);
  } catch (err) {
    console.error("[studio] failed to load project detail", err);
    showToast("Couldn't load this project's details — try again.");
  }
  openDetail(buildProjectDetailHtml(project, false));
  wireProjectDetail(id);
}

function wireProjectDetail(id) {
  const drawer = document.querySelector("[data-detail-drawer]");
  if (!drawer) return;
  const project = findProject(id);
  if (!project) return;

  const rerender = () => { drawer.innerHTML = buildProjectDetailHtml(project, previewingClient); wireProjectDetail(id); };

  drawer.querySelector("[data-toggle-preview]")?.addEventListener("click", () => {
    previewingClient = !previewingClient;
    rerender();
  });

  drawer.querySelector("[data-status-select]")?.addEventListener("change", async (e) => {
    const previous = project.status;
    try {
      await setCellValue(project, FIELDS.find((f) => f.id === "status"), e.target.value);
      rerender();
      renderProjectsView();
      renderOverview();
    } catch (err) {
      console.error("[studio] set status failed", err);
      showToast("Couldn't update status — try again.");
      e.target.value = previous;
    }
  });

  drawer.querySelector("[data-priority-select]")?.addEventListener("change", async (e) => {
    const previous = project.priority;
    try {
      await setCellValue(project, FIELDS.find((f) => f.id === "priority"), e.target.value);
      renderProjectsView();
      renderOverview();
    } catch (err) {
      console.error("[studio] set priority failed", err);
      showToast("Couldn't update priority — try again.");
      e.target.value = previous;
    }
  });

  drawer.querySelector("[data-open-share]")?.addEventListener("click", () => openShareModal(project));

  drawer.querySelectorAll("[data-remove-team]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const memberId = btn.getAttribute("data-remove-team");
      try {
        await setProjectAssignees(project, project.team.filter((t) => t !== memberId));
        rerender();
        renderProjectsView();
      } catch (err) {
        console.error("[studio] remove team member failed", err);
        toastError(err, "Couldn't remove that team member — try again.");
      }
    });
  });

  drawer.querySelector("[data-add-team-select]")?.addEventListener("change", async (e) => {
    if (!e.target.value) return;
    try {
      await setProjectAssignees(project, [...project.team, e.target.value]);
      rerender();
      renderProjectsView();
    } catch (err) {
      console.error("[studio] add team member failed", err);
      showToast("Couldn't add that team member — try again.");
    }
  });

  drawer.querySelector("[data-file-input]")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast("Uploading…");
    try {
      await uploadProjectFile(project, file);
      rerender();
      showToast(`“${file.name}” uploaded.`);
    } catch (err) {
      console.error("[studio] file upload failed", err);
      showToast("Couldn't upload that file — try again.");
    }
  });

  drawer.querySelector("[data-note-form]")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.currentTarget.querySelector("input");
    const content = input.value.trim();
    if (!content) return;
    const submitBtn = e.currentTarget.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await addComment(project, content);
      input.value = "";
      rerender();
    } catch (err) {
      console.error("[studio] add comment failed", err);
      showToast("Couldn't post that note — try again.");
      submitBtn.disabled = false;
    }
  });

  drawer.querySelector("[data-delete-project]")?.addEventListener("click", () => {
    openConfirm("Delete this project?", `“${project.title || "Untitled project"}” will be removed from Ongoing Projects. Its history is kept, not destroyed.`, async () => {
      try {
        await softDeleteProject(project);
        closeDetail();
        showToast("Project deleted.");
        renderProjectsView();
        renderOverview();
      } catch (err) {
        console.error("[studio] delete project failed", err);
        showToast("Couldn't delete that project — try again.");
      }
    });
  });
}

/* ---------- Share ---------- */

function openShareModal(project) {
  const body = document.querySelector("[data-share-body]");
  if (!body) return;
  const link = `https://innov8.studio/client/project/${project.id}`;

  body.innerHTML = `
    <div class="share-link-row">
      <input class="input" type="text" readonly value="${link}" data-share-link />
      <button class="btn btn-primary" type="button" data-copy-link>${icon("link")} Copy</button>
    </div>
    <p class="field-label" style="margin-bottom:0.5rem;">What the client can see</p>
    <ul class="share-visibility-list">
      <li>${icon("eye")} Overview, progress &amp; milestones</li>
      <li>${icon("eye")} Client-visible files &amp; deliverables</li>
      <li>${icon("eye")} Comments &amp; feedback</li>
      <li class="is-denied">${icon("close")} Internal notes &amp; time tracking</li>
      <li class="is-denied">${icon("close")} Team workload &amp; internal activity</li>
    </ul>
  `;

  body.querySelector("[data-copy-link]")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(link); } catch { /* clipboard unavailable — link stays visible/selectable */ }
    showToast("Client link copied.");
  });

  openModal("share");
}

/* ---------- init ---------- */

function showStudioLoading(isLoading, errorMessage) {
  const container = document.querySelector("[data-studio-groups]");
  if (!container) return;
  if (errorMessage) {
    container.innerHTML = `<div class="panel" style="padding:var(--space-6);text-align:center;">${emptyState("Couldn't load Ongoing Projects", errorMessage)}</div>`;
  } else if (isLoading) {
    container.innerHTML = `<div class="panel" style="padding:var(--space-6);text-align:center;color:var(--muted);">Loading projects…</div>`;
  }
}

(async () => {
  showStudioLoading(true);
  try {
    await window.authReady;
    await loadStudioData();
    populateFilterOptions();
    renderOverview();
    renderProjectsView();
    initCardTilt();
  } catch (err) {
    console.error("[studio] failed to load", err);
    showStudioLoading(false, err.message || "Check your connection and try reloading.");
    showToast("Couldn't load Studio data — see the console for details.");
  }
})();
