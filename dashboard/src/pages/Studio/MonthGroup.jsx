/*
 * Innov8 Studios — a month grouping band above one slice of the
 * Ongoing Projects table. Purely a view-layer grouping (derived from
 * each project's due date every render) — it is not a table column and
 * never creates or touches a project record. Only the chevron button
 * collapses/expands the group; clicking the month name, the count, or
 * any other part of the header must do nothing, per the overhaul spec.
 */
export default function MonthGroup({ monthKey, label, count, collapsed, onToggle, children }) {
  return (
    <div className={`month-group${collapsed ? " is-collapsed" : ""}`}>
      <div className="month-group-header">
        <button
          type="button"
          className="month-group-chevron-btn"
          onClick={onToggle}
          aria-label={collapsed ? `Expand ${label}` : `Collapse ${label}`}
          aria-expanded={!collapsed}
        >
          <svg className="month-group-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <h3>{label}</h3>
        <span className="month-group-count">{count} project{count === 1 ? "" : "s"}</span>
      </div>
      {!collapsed && <div className="month-group-body">{children}</div>}
    </div>
  );
}
