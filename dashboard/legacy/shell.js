/*
 * Innov8 Studios — Dashboard shell behavior, shared by every page
 * (HOME, WORK, and future modules). Plain classic script, no build
 * step — mirrors the conventions already used by the marketing site's
 * script.js / motion.js (data-* hooks, matchMedia breakpoints,
 * prefers-reduced-motion awareness).
 *
 * Page-specific rendering lives in home.js / work.js, loaded after
 * this file and after that page's own mock-data file.
 */

const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  studio: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h12V8"/>',
  work: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>',
  enquiries: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 12 3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1l-2 6"/><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  relationships: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.4.4 4.2 2.4 4.5 5.8"/>',
  insights: '<rect x="4" y="12" width="3.2" height="8" rx="1"/><rect x="10.4" y="6" width="3.2" height="14" rx="1"/><rect x="16.8" y="9" width="3.2" height="11" rx="1"/>',
  messages: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a8 8 0 0 0 0-2l2-1.5-2-3.5-2.3.9a8 8 0 0 0-1.7-1L15 3H9l-.4 2.4a8 8 0 0 0-1.7 1l-2.3-.9-2 3.5L4.6 11a8 8 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9c.5.4 1.1.75 1.7 1L9 21h6l.4-2.4c.6-.25 1.2-.6 1.7-1l2.3.9 2-3.5z"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.7 12h16.6"/><path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v10"/><path d="M15 9.6c0-1.4-1.3-2.4-3-2.4s-3 .9-3 2.2c0 3 6 1.3 6 4.3 0 1.3-1.3 2.3-3 2.3s-3-1-3-2.3"/>',
  imagePlus: '<rect x="3" y="5" width="14" height="12" rx="2"/><circle cx="8" cy="10" r="1.3"/><path d="M4 15.5 7.5 12 10 14l3-3 4 4"/><path d="M18.5 3.5v4"/><path d="M16.5 5.5h4"/>',
  quote: '<path d="M7 8.2c-2 0-3.4 1.6-3.4 3.9v4h4v-4H6.1c0-1.1.8-1.9 1.9-1.9z"/><path d="M15.4 8.2c-2 0-3.4 1.6-3.4 3.9v4h4v-4h-1.5c0-1.1.8-1.9 1.9-1.9z"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  share: '<circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="5.5" r="2.4"/><circle cx="17.5" cy="18.5" r="2.4"/><path d="M8.1 10.8 15.4 7"/><path d="M8.1 13.2l7.3 3.8"/>',
  link: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 12.7 4.8a3.6 3.6 0 0 1 5 5L16 11.5"/><path d="M13 17.5 11.3 19.2a3.6 3.6 0 0 1-5-5L8 12.5"/>',
  archive: '<rect x="3.5" y="5" width="17" height="4" rx="1"/><path d="M4.5 9v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
  trash: '<path d="M5 7h14"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/>',
  calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M8 3.5v4"/><path d="M16 3.5v4"/><path d="M3.5 10.5h17"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  file: '<path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4"/>',
  upload: '<path d="M12 15.5V5.5"/><path d="M7.5 10 12 5.5 16.5 10"/><path d="M5 16.5v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  filter: '<path d="M4 6h16"/><path d="M7.5 12h9"/><path d="M10.5 18h3"/>',
  textLines: '<path d="M4 7h16"/><path d="M4 12h11"/><path d="M4 17h7"/>',
  hash: '<path d="M9 4 7 20"/><path d="M17 4 15 20"/><path d="M4 9h16"/><path d="M3 15h16"/>',
  check: '<path d="M5 12l4 4 10-10"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h1l9 4V6l-9 4H4a1 1 0 0 0-1 1z"/><path d="M19 9.5v5"/>',
  grip: '<circle cx="9" cy="6" r="1.1"/><circle cx="15" cy="6" r="1.1"/><circle cx="9" cy="12" r="1.1"/><circle cx="15" cy="12" r="1.1"/><circle cx="9" cy="18" r="1.1"/><circle cx="15" cy="18" r="1.1"/>'
};

const icon = (name, extraClass) =>
  `<svg class="${extraClass || ""}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "home", enabled: true, page: "index.html" },
  { id: "webos", label: "Web OS", icon: "globe", enabled: false },
  { id: "studio", label: "Studio", icon: "studio", enabled: true, page: "studio.html" },
  { id: "marketing", label: "Marketing", icon: "megaphone", enabled: true, page: "marketing.html" },
  { id: "enquiries", label: "Enquiries", icon: "enquiries", enabled: false },
  { id: "relationships", label: "Relationships", icon: "relationships", enabled: false },
  { id: "insights", label: "Insights", icon: "insights", enabled: false },
  { id: "messages", label: "Messages", icon: "messages", enabled: false },
  { id: "settings", label: "Settings", icon: "settings", enabled: false }
];

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const currentPage = (location.pathname.split("/").pop() || "index.html");

/* Sidebar nav rendering */

function navItemMarkup(item) {
  const isActive = item.enabled && item.page === currentPage;

  if (!item.enabled) {
    return `
      <div class="dash-nav-item" data-nav-id="${item.id}" aria-disabled="true" tabindex="-1" title="Coming soon" role="button">
        ${icon(item.icon)}
        <span>${item.label}</span>
        <span class="dash-nav-soon">Soon</span>
      </div>
    `;
  }

  return `
    <a class="dash-nav-item ${isActive ? "is-active" : ""}" data-nav-id="${item.id}" href="${item.page}">
      ${icon(item.icon)}
      <span>${item.label}</span>
    </a>
  `;
}

document.getElementById("dash-sidebar-nav").innerHTML = NAV_ITEMS.map(navItemMarkup).join("");

/* Docked sidebar — the hamburger inside it collapses it to an icon-only
   rail or expands it back; the main content margin follows in lockstep
   (see --sidebar-w / .dash-main in dashboard.css). Persisted, defaults
   to expanded on a visitor's first load (collapsed on narrow screens). */

const SIDEBAR_KEY = "innov8-dashboard-sidebar-collapsed";
const hamburger = document.querySelector("[data-hamburger]");

function setSidebarCollapsed(isCollapsed) {
  document.documentElement.classList.toggle("dash-collapsed", isCollapsed);
  hamburger?.setAttribute("aria-expanded", String(!isCollapsed));
  try {
    localStorage.setItem(SIDEBAR_KEY, String(isCollapsed));
  } catch {
    /* localStorage unavailable — toggle still works for this session */
  }
}

let storedSidebarState = null;
try {
  storedSidebarState = localStorage.getItem(SIDEBAR_KEY);
} catch {
  /* ignore */
}
const defaultCollapsed = window.matchMedia("(max-width: 880px)").matches;
setSidebarCollapsed(storedSidebarState === null ? defaultCollapsed : storedSidebarState === "true");

hamburger?.addEventListener("click", () => {
  setSidebarCollapsed(!document.documentElement.classList.contains("dash-collapsed"));
});

/* Account menu */

const accountArea = document.querySelector("[data-account]");
const accountTrigger = document.querySelector("[data-account-trigger]");

accountTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  accountArea?.classList.toggle("is-open");
});

document.addEventListener("click", () => accountArea?.classList.remove("is-open"));

document.querySelector("[data-logout]")?.addEventListener("click", () => {
  accountArea?.classList.remove("is-open");
  // Actual sign-out is handled by js/auth/session.js's own [data-logout]
  // listener, which calls supabase.auth.signOut() and redirects.
});

/* Deterministic colour per person, so the same name always gets the
   same avatar colour across every list it appears in. */

const AVATAR_PALETTE = ["#3ddc84", "#4f8cff", "#a855f7", "#ff6a1a", "#22c1c3", "#e5484d", "#f2b705"];

function colorForName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarMarkup(name) {
  return `<span class="avatar" style="background: ${colorForName(name)}">${initials(name)}</span>`;
}

/* Command palette */

const palette = document.querySelector("[data-palette]");
const paletteScrim = document.querySelector("[data-palette-scrim]");
const paletteInput = document.querySelector("[data-palette-input]");
const paletteList = document.querySelector("[data-palette-list]");
const paletteTriggers = document.querySelectorAll("[data-palette-open]");

let paletteHighlight = 0;
let lastFocusedBeforePalette = null;

function paletteItemMarkup(item, index) {
  const disabledAttrs = item.enabled ? "" : 'aria-disabled="true"';
  const highlightClass = index === paletteHighlight ? "is-highlighted" : "";

  return `
    <div class="dash-palette-item ${highlightClass}" data-palette-item data-nav-id="${item.id}" data-page="${item.page || ""}" data-index="${index}" ${disabledAttrs}>
      ${icon(item.icon)}
      <span>${item.label}</span>
      ${item.enabled ? "" : '<span class="badge badge--soon">Soon</span>'}
    </div>
  `;
}

function renderPaletteList(query) {
  const filtered = NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));
  paletteHighlight = 0;

  if (!paletteList) return;

  paletteList.innerHTML = filtered.length
    ? filtered.map(paletteItemMarkup).join("")
    : '<p class="dash-palette-empty">No matches.</p>';
}

function openPalette() {
  if (!palette) return;
  lastFocusedBeforePalette = document.activeElement;
  palette.classList.add("is-open");
  paletteScrim?.classList.add("is-open");
  if (paletteInput) paletteInput.value = "";
  renderPaletteList("");
  window.requestAnimationFrame(() => paletteInput?.focus());
}

function closePalette() {
  if (!palette) return;
  palette.classList.remove("is-open");
  paletteScrim?.classList.remove("is-open");
  if (lastFocusedBeforePalette instanceof HTMLElement) lastFocusedBeforePalette.focus();
}

function activatePaletteHighlight() {
  const items = paletteList?.querySelectorAll("[data-palette-item]") ?? [];
  const target = items[paletteHighlight];
  if (!target || target.getAttribute("aria-disabled") === "true") return;
  const page = target.getAttribute("data-page");
  closePalette();
  if (page) window.location.href = page;
}

function moveHighlight(delta) {
  const items = paletteList?.querySelectorAll("[data-palette-item]") ?? [];
  if (!items.length) return;
  paletteHighlight = (paletteHighlight + delta + items.length) % items.length;
  items.forEach((el, i) => el.classList.toggle("is-highlighted", i === paletteHighlight));
}

paletteTriggers.forEach((trigger) => trigger.addEventListener("click", openPalette));
paletteScrim?.addEventListener("click", closePalette);
paletteInput?.addEventListener("input", (event) => renderPaletteList(event.target.value));

paletteInput?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    moveHighlight(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    moveHighlight(-1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    activatePaletteHighlight();
  } else if (event.key === "Escape") {
    closePalette();
  }
});

paletteList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-palette-item]");
  if (!item || item.getAttribute("aria-disabled") === "true") return;
  const page = item.getAttribute("data-page");
  closePalette();
  if (page) window.location.href = page;
});

/* Modals — generic open/close by [data-modal="id"] / [data-modal-open="id"],
   shared by every page (HOME's portfolio/testimonial modals, WORK's
   New Work / New Prospect / Share modals, etc). */

function openModal(id) {
  document.querySelector(`[data-modal="${id}"]`)?.classList.add("is-open");
  document.querySelector("[data-modal-scrim]")?.classList.add("is-open");
}

function closeAllModals() {
  document.querySelectorAll("[data-modal]").forEach((modal) => modal.classList.remove("is-open"));
  document.querySelector("[data-modal-scrim]")?.classList.remove("is-open");
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-modal-open]");
  if (trigger) openModal(trigger.getAttribute("data-modal-open"));
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-modal-close]")) closeAllModals();
});

document.querySelector("[data-modal-scrim]")?.addEventListener("click", closeAllModals);

/* Detail drawer — generic slide-over used by WORK for both Work items
   and Outreach prospects (one implementation, two content templates). */

function openDetail(html) {
  const drawer = document.querySelector("[data-detail-drawer]");
  const scrim = document.querySelector("[data-detail-scrim]");
  if (!drawer) return;
  drawer.innerHTML = html;
  drawer.classList.add("is-open");
  scrim?.classList.add("is-open");
}

function closeDetail() {
  document.querySelector("[data-detail-drawer]")?.classList.remove("is-open");
  document.querySelector("[data-detail-scrim]")?.classList.remove("is-open");
}

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-detail-close]")) closeDetail();
});

document.querySelector("[data-detail-scrim]")?.addEventListener("click", closeDetail);

/* Global keyboard: Ctrl/Cmd+K for the palette, Escape closes whichever
   overlay is topmost — palette, then a modal, then the detail drawer. */

document.addEventListener("keydown", (event) => {
  const isCommandK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
  if (isCommandK) {
    event.preventDefault();
    palette?.classList.contains("is-open") ? closePalette() : openPalette();
    return;
  }

  if (event.key === "Escape") {
    if (palette?.classList.contains("is-open")) {
      closePalette();
    } else if (document.querySelector("[data-modal].is-open")) {
      closeAllModals();
    } else if (document.querySelector("[data-detail-drawer].is-open")) {
      closeDetail();
    }
  }
});

/* Generic "coming soon" affordance — any element with data-toast-msg
   shows that message as a toast on click, instead of wiring a one-off
   handler per button. */

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-toast-msg]");
  if (trigger) showToast(trigger.getAttribute("data-toast-msg"));
});

/* Toasts */

function showToast(message) {
  const stack = document.querySelector("[data-toast-stack]");
  if (!stack) return;

  const toast = document.createElement("div");
  toast.className = "toast glass-surface";
  toast.textContent = message;
  stack.appendChild(toast);

  window.requestAnimationFrame(() => toast.classList.add("is-visible"));

  window.setTimeout(() => {
    toast.classList.remove("is-visible");
    window.setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* Card hover is a pure CSS scale (see .panel:hover in dashboard.css) —
   no cursor-tracked rotation. initCardTilt is kept as a no-op so page
   scripts that still call it after injecting new panels don't need to
   change. */

function initCardTilt() {}
