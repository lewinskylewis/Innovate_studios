/*
 * Innov8 Studios — the main Enquiries table: summary cards + quick
 * states + filter bar + table, mirroring RelationshipList.jsx but for a
 * single record type (there's only one kind of Enquiry, so this isn't
 * generalized the way Relationships' five tabs needed to be).
 */
import { useMemo } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, PRIORITY_DOT } from "../../lib/format.js";
import { TEAM, SOURCES, SERVICES, STATUSES, PRIORITIES } from "./enquiriesMock.js";
import { STATUS_BADGE, followupState, matchesQuickState, searchMatches, formatServiceList, QUICK_STATES } from "./enquiriesFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export const DEFAULT_LIST_FILTERS = { search: "", status: "All", source: "All", owner: "All", priority: "All", service: "All", quickState: "all" };

export default function EnquiryList({ rows, filters, onFiltersChange, summaryCards, onOpenNew, onOpenRecord }) {
  const filtered = useMemo(() => {
    let items = rows.filter((e) => searchMatches(e, filters.search) && matchesQuickState(e, filters.quickState));
    if (filters.status !== "All") items = items.filter((e) => e.status === filters.status);
    if (filters.source !== "All") items = items.filter((e) => e.source === filters.source);
    if (filters.owner !== "All") items = items.filter((e) => e.owner === filters.owner);
    if (filters.priority !== "All") items = items.filter((e) => e.priority === filters.priority);
    if (filters.service !== "All") items = items.filter((e) => (e.services || []).includes(filters.service));
    return items.sort((a, b) => new Date(b.dateReceived) - new Date(a.dateReceived));
  }, [rows, filters]);

  function set(key, value) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <>
      <section className="dash-stat-cards" aria-label="Enquiries summary">
        {summaryCards.map((c) => (
          <div key={c.label} className="panel dash-stat-card">
            <div>
              <strong>{c.value}</strong>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="rel-quickbar">
        {QUICK_STATES.map((q) => (
          <button key={q.key} type="button" className={`work-tab${filters.quickState === q.key ? " is-active" : ""}`} onClick={() => set("quickState", q.key)}>
            {q.label}
          </button>
        ))}
      </div>

      <div className="work-toolbar-row">
        <div className="work-toolbar-actions">
          <div className="work-toolbar-control work-toolbar-search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input type="search" placeholder="Search person, brand, email, phone" value={filters.search} onChange={(e) => set("search", e.target.value)} />
          </div>
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="All">Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by source" value={filters.source} onChange={(e) => set("source", e.target.value)}>
            <option value="All">Source</option>
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by owner" value={filters.owner} onChange={(e) => set("owner", e.target.value)}>
            <option value="All">Owner</option>
            {TEAM.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by priority" value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
            <option value="All">Priority</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by service" value={filters.service} onChange={(e) => set("service", e.target.value)}>
            <option value="All">Service</option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="work-toolbar-control work-toolbar-new" type="button" onClick={onOpenNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Enquiry
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Brand</th>
                <th>Enquiry</th>
                <th>Source</th>
                <th>Service</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Received</th>
                <th>Next Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((e) => {
                  const fu = followupState(e);
                  return (
                    <tr key={e.id} className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpenRecord(e.id)}>
                      <td>
                        <span className="dash-table-person">
                          <span className="avatar" style={{ background: colorForName(e.personName) }}>
                            {initials(e.personName)}
                          </span>{" "}
                          <span>{e.personName}</span>
                        </span>
                      </td>
                      <td className="dash-table-name">{e.brandName}</td>
                      <td className="dash-table-muted" style={{ maxWidth: "16rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {e.message || "—"}
                      </td>
                      <td className="dash-table-muted">{e.source}</td>
                      <td className="dash-table-muted">{formatServiceList(e.services)}</td>
                      <td>
                        <span className={`badge badge--${STATUS_BADGE[e.status] || "soon"}`}>{e.status}</span>
                      </td>
                      <td className="dash-table-muted">{e.owner || "Unassigned"}</td>
                      <td className="dash-table-muted">
                        <span className={`status-dot status-dot--${PRIORITY_DOT[e.priority] || ""}`} /> {e.priority}
                      </td>
                      <td className="dash-table-muted">{formatDate(e.dateReceived)}</td>
                      <td className={fu === "overdue" ? "mkt-followup-overdue" : "dash-table-muted"}>{e.nextFollowUp ? formatDate(e.nextFollowUp) : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>{emptyState("No enquiries match", "Try clearing a filter or add a new enquiry.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
