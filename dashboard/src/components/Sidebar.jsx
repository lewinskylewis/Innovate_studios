/*
 * Innov8 Studios — Dashboard sidebar, ported from the vanilla shell's
 * NAV_ITEMS + collapse/account-menu behaviour (shell.js) into a React
 * component. Same markup/classes as before so dashboard.css needs no
 * changes; NavLink replaces the old manual "is-active" class check and
 * page-name matching.
 */
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo white.png";
import { useAuth } from "../lib/AuthContext.jsx";
import { colorForName, initials } from "../lib/avatar.js";

const ICONS = {
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9"/>',
  studio: '<rect x="4" y="4" width="12" height="12" rx="2"/><path d="M8 20h12V8"/>',
  megaphone: '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h1l9 4V6l-9 4H4a1 1 0 0 0-1 1z"/><path d="M19 9.5v5"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.7 12h16.6"/><path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z"/>',
  enquiries: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 12 3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1l-2 6"/><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  relationships: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.4.4 4.2 2.4 4.5 5.8"/>',
  insights: '<rect x="4" y="12" width="3.2" height="8" rx="1"/><rect x="10.4" y="6" width="3.2" height="14" rx="1"/><rect x="16.8" y="9" width="3.2" height="11" rx="1"/>',
  messages: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 13a8 8 0 0 0 0-2l2-1.5-2-3.5-2.3.9a8 8 0 0 0-1.7-1L15 3H9l-.4 2.4a8 8 0 0 0-1.7 1l-2.3-.9-2 3.5L4.6 11a8 8 0 0 0 0 2l-2 1.5 2 3.5 2.3-.9c.5.4 1.1.75 1.7 1L9 21h6l.4-2.4c.6-.25 1.2-.6 1.7-1l2.3.9 2-3.5z"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  logout: '<path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9"/><path d="M10 12h11"/><path d="m17 8 4 4-4 4"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>'
};

function Icon({ name, className, style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ICONS[name] || "" }}
    />
  );
}

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "home", to: "/" },
  { id: "webos", label: "Web OS", icon: "globe", enabled: false },
  { id: "studio", label: "Studio", icon: "studio", to: "/studio" },
  { id: "marketing", label: "Marketing", icon: "megaphone", to: "/marketing" },
  { id: "enquiries", label: "Enquiries", icon: "enquiries", enabled: false },
  { id: "relationships", label: "Relationships", icon: "relationships", enabled: false },
  { id: "insights", label: "Insights", icon: "insights", enabled: false },
  { id: "messages", label: "Messages", icon: "messages", enabled: false },
  { id: "settings", label: "Settings", icon: "settings", enabled: false }
];

const SIDEBAR_KEY = "innov8-dashboard-sidebar-collapsed";

function readStoredCollapsed() {
  try {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored !== null) return stored === "true";
  } catch {
    /* localStorage unavailable — fall through to the media-query default */
  }
  return window.matchMedia("(max-width: 880px)").matches;
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);
  const [accountOpen, setAccountOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("dash-collapsed", collapsed);
    try {
      localStorage.setItem(SIDEBAR_KEY, String(collapsed));
    } catch {
      /* localStorage unavailable — toggle still works for this session */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!accountOpen) return;
    const closeMenu = () => setAccountOpen(false);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [accountOpen]);

  async function handleLogout() {
    setAccountOpen(false);
    await signOut();
    navigate("/login");
  }

  const fullName = profile?.full_name || "";
  const avatarColor = profile?.avatar_color || colorForName(fullName);
  const roleLabel = profile?.permission_role === "admin" ? "Administrator" : "Team member";

  return (
    <aside className="dash-sidebar glass-surface" aria-label="Dashboard navigation">
      <div className="dash-brand">
        <img src={logo} alt="Innov8 Studios" />
        <button
          className="icon-btn"
          type="button"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((value) => !value)}
        >
          <Icon name="menu" />
        </button>
      </div>

      <nav className="dash-nav">
        {NAV_ITEMS.map((item) =>
          item.enabled === false ? (
            <div
              key={item.id}
              className="dash-nav-item"
              aria-disabled="true"
              tabIndex={-1}
              title="Coming soon"
              role="button"
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              <span className="dash-nav-soon">Soon</span>
            </div>
          ) : (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `dash-nav-item${isActive ? " is-active" : ""}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          )
        )}
      </nav>

      <div className={`dash-account${accountOpen ? " is-open" : ""}`}>
        <div className="dash-account-menu glass-surface">
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" style={{ width: "1.125rem", height: "1.125rem" }} />
            Log out
          </button>
        </div>
        <button
          className="dash-account-trigger"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setAccountOpen((value) => !value);
          }}
        >
          <span className="avatar" style={{ background: avatarColor }}>
            {initials(fullName)}
          </span>
          <span className="dash-account-info">
            <strong>{fullName || "…"}</strong>
            <span>{roleLabel}</span>
          </span>
          <Icon name="chevronDown" className="dash-account-chevron" />
        </button>
      </div>
    </aside>
  );
}
