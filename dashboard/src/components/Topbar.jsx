/*
 * Innov8 Studios — Dashboard topbar, the generic (page-title-less) shell
 * piece every future module page renders inside. Page-specific content
 * (e.g. Home's "Good afternoon, Lewis" greeting) stays with that page,
 * not the shared shell.
 *
 * `subtitle` (optional, additive) — every existing caller passes only
 * `title`, so this is backward-compatible; added for Insights.jsx's
 * "Studio performance & intelligence" line, the one place this module
 * shell needed a second line under the page title.
 */
import { useAuth } from "../lib/AuthContext.jsx";
import { colorForName, initials } from "../lib/avatar.js";

export default function Topbar({ title, subtitle }) {
  const { profile } = useAuth();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  const fullName = profile?.full_name || "";
  const avatarColor = profile?.avatar_color || colorForName(fullName);

  return (
    <header className="dash-content-header">
      <div className="dash-header-start">
        <div className="dash-greeting">
          <h1>{title || "Dashboard"}</h1>
          {subtitle && <p className="dash-subtitle">{subtitle}</p>}
          <time>{today}</time>
        </div>
      </div>
      <div className="dash-header-actions">
        <span className="avatar" style={{ background: avatarColor }}>
          {initials(fullName)}
        </span>
      </div>
    </header>
  );
}
