/*
 * Innov8 Studios — generic Relationships list view: summary cards +
 * filter bar + table, shared by the Contacts / Prospects / Leads /
 * Clients / Partners tabs (Relationships.jsx). Each tab passes a small
 * config object describing its columns and its one type-specific filter
 * instead of five near-duplicate table files — the columns genuinely
 * differ per type, but the surrounding chrome (search, quick states,
 * owner/source/tag filters, empty state) does not.
 */
import { useMemo } from "react";
import { formatDate } from "../../lib/format.js";
import { TEAM, SOURCES, TAGS } from "./relationshipsMock.js";
import { followupState, matchesQuickState, searchMatches, QUICK_STATES } from "./relationshipsFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export const DEFAULT_LIST_FILTERS = { search: "", owner: "All", source: "All", tag: "All", quickState: "all" };

export default function RelationshipList({ rows, filters, onFiltersChange, columns, extraFilters = [], summaryCards, emptyTitle, emptyBody, newLabel, onOpenNew, onOpenRecord }) {
  const filtered = useMemo(() => {
    let items = rows.filter((r) => searchMatches(r, filters.search) && matchesQuickState(r, filters.quickState));
    if (filters.owner !== "All") items = items.filter((r) => r.owner === filters.owner);
    if (filters.source !== "All") items = items.filter((r) => r.source === filters.source);
    if (filters.tag !== "All") items = items.filter((r) => (r.tags || []).includes(filters.tag));
    extraFilters.forEach((ef) => {
      const value = filters[ef.stateKey];
      if (value && value !== "All") items = items.filter((r) => ef.match(r, value));
    });
    return items;
  }, [rows, filters, extraFilters]);

  function set(key, value) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <>
      <section className="dash-stat-cards" aria-label="Summary">
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
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by owner" value={filters.owner} onChange={(e) => set("owner", e.target.value)}>
            <option value="All">Owner</option>
            {TEAM.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
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
          <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by tag" value={filters.tag} onChange={(e) => set("tag", e.target.value)}>
            <option value="All">Tag</option>
            {TAGS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {extraFilters.map((ef) => (
            <select key={ef.stateKey} className="work-toolbar-control work-toolbar-select" aria-label={ef.label} value={filters[ef.stateKey] || "All"} onChange={(e) => set(ef.stateKey, e.target.value)}>
              <option value="All">{ef.label}</option>
              {ef.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ))}
          <button className="work-toolbar-control work-toolbar-new" type="button" onClick={onOpenNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            {newLabel}
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key}>{c.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((r) => (
                  <tr key={r.id} className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpenRecord(r.id)}>
                    {columns.map((c) => (
                      <td key={c.key} className={c.className}>
                        {c.cell(r)}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length}>{emptyState(emptyTitle, emptyBody)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function followUpCell(record) {
  const fu = followupState(record);
  return <span className={fu === "overdue" ? "mkt-followup-overdue" : "dash-table-muted"}>{record.nextFollowUp ? formatDate(record.nextFollowUp) : "—"}</span>;
}
