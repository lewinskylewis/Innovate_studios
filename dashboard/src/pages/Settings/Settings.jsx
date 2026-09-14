/*
 * Innov8 Studios — /settings route. A landing grid of 8 category cards,
 * then a two-column nav + content shell per category (collapses to a
 * back-button + single column on mobile, per spec) — internal section
 * state only, no sub-routes, matching every other module's own-tab
 * convention (Studio/Marketing/Enquiries all use local tab state, not
 * nested routes). Never persists the open section — Settings always
 * opens on the landing page, deliberately, so it never "dumps" a user
 * straight into a form.
 */
import { useEffect, useRef, useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import {
  GeneralSection,
  StudioSection,
  TeamSection,
  NotificationsSection,
  IntegrationsSection,
  AppearanceSection,
  SecuritySection,
  SystemSection
} from "./SettingsSections.jsx";

const SECTIONS = [
  {
    id: "general",
    label: "General",
    description: "Studio identity and business defaults",
    icon: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />,
    Component: GeneralSection
  },
  {
    id: "studio",
    label: "Studio",
    description: "Projects, workflows and client portal",
    icon: (
      <>
        <rect x="4" y="4" width="12" height="12" rx="2" />
        <path d="M8 20h12V8" />
      </>
    ),
    Component: StudioSection
  },
  {
    id: "team",
    label: "Team & Access",
    description: "Members, roles and permissions",
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M15.5 14.2c2.4.4 4.2 2.4 4.5 5.8" />
      </>
    ),
    Component: TeamSection
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and communication preferences",
    icon: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
    Component: NotificationsSection
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Connected services and data sources",
    icon: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8 8l8 8" />
      </>
    ),
    Component: IntegrationsSection
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and dashboard environment",
    icon: <circle cx="12" cy="12" r="8.5" />,
    iconExtra: <path d="M12 3.5a8.5 8.5 0 0 0 0 17z" fill="currentColor" stroke="none" />,
    Component: AppearanceSection
  },
  {
    id: "security",
    label: "Data & Security",
    description: "Account, privacy, backups and data",
    icon: <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />,
    Component: SecuritySection
  },
  {
    id: "system",
    label: "System",
    description: "System status and activity",
    icon: (
      <>
        <rect x="4" y="12" width="3.2" height="8" rx="1" />
        <rect x="10.4" y="6" width="3.2" height="14" rx="1" />
        <rect x="16.8" y="9" width="3.2" height="11" rx="1" />
      </>
    ),
    Component: SystemSection
  }
];

function SectionIcon({ children, extra }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
      {extra}
    </svg>
  );
}

export default function Settings() {
  const [activeId, setActiveId] = useState(null);
  const active = SECTIONS.find((s) => s.id === activeId);
  const panelRef = useRef(null);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [activeId]);

  if (!active) {
    return (
      <>
        <Topbar title="Settings" subtitle="Control how Innovate works." />
        <div className="settings-landing-grid">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className="panel settings-nav-card" onClick={() => setActiveId(s.id)}>
              <span className="settings-nav-card-icon">
                <SectionIcon extra={s.iconExtra}>{s.icon}</SectionIcon>
              </span>
              <span className="settings-nav-card-main">
                <strong>{s.label}</strong>
                <span>{s.description}</span>
              </span>
              <span className="settings-nav-card-chevron">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="settings-frame">
      <Topbar title="Settings" subtitle="Control how Innovate works." />

      <div className="settings-shell">
        <nav className="settings-side-nav">
          {SECTIONS.map((s) => (
            <button key={s.id} type="button" className={`settings-side-nav-item${s.id === activeId ? " is-active" : ""}`} onClick={() => setActiveId(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        <div className="settings-content-col">
          <button className="settings-back" type="button" onClick={() => setActiveId(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
            Settings
          </button>

          <div className="panel settings-panel-scroll" ref={panelRef}>
            <div className="settings-content-header">
              <h2>{active.label}</h2>
              <p>{active.description}</p>
            </div>
            <div className="settings-panel-body">
              <active.Component />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
