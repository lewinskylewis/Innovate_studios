/*
 * Innov8 Studios — Marketing "Outreach" tab: summary cards + prospect
 * table + filters. Ported from marketing.js's renderOutreachSummary/
 * getFilteredProspects/renderProspectTable.
 */
import { useMemo } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate } from "../../lib/format.js";
import { MKT_STATUS_META } from "./marketingMock.js";
import { followupState } from "./marketingFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default function Outreach({ marketing, filters, onOpenProspect }) {
  const { prospects } = marketing;

  const summary = useMemo(() => {
    const total = prospects.length;
    const contacted = prospects.filter((p) => p.status !== "New").length;
    const responses = prospects.filter((p) => ["Replied", "Meeting Scheduled"].includes(p.status)).length;
    const followupsDue = prospects.filter((p) => ["overdue", "week"].includes(followupState(p))).length;
    return [
      { label: "Total Prospects", value: total },
      { label: "Contacted", value: contacted },
      { label: "Responses", value: responses },
      { label: "Follow-ups Due", value: followupsDue }
    ];
  }, [prospects]);

  const filtered = useMemo(() => {
    let items = [...prospects];
    const { search, industry, status, channel, serviceInterest, followup } = filters;
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
  }, [prospects, filters]);

  return (
    <>
      <section className="dash-stat-cards" aria-label="Outreach summary">
        {summary.map((c) => (
          <div key={c.label} className="panel dash-stat-card">
            <div>
              <strong>{c.value}</strong>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="panel">
        <div className="dash-table-wrap">
          <table className="dash-table mkt-prospect-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Contact</th>
                <th>Industry</th>
                <th>Service Interest</th>
                <th>Channel</th>
                <th>Status</th>
                <th>Last Contact</th>
                <th>Next Follow-up</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length ? (
                filtered.map((p) => {
                  const fu = followupState(p);
                  return (
                    <tr key={p.id} className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpenProspect(p.id)}>
                      <td className="dash-table-name">{p.business}</td>
                      <td>
                        <span className="dash-table-person">
                          <span className="avatar" style={{ background: colorForName(p.contact.name) }}>
                            {initials(p.contact.name)}
                          </span>{" "}
                          <span>{p.contact.name}</span>
                        </span>
                      </td>
                      <td className="dash-table-muted">{p.industry}</td>
                      <td className="dash-table-muted">{p.serviceInterest}</td>
                      <td className="dash-table-muted">{p.channel}</td>
                      <td>
                        <span className={`badge badge--${MKT_STATUS_META[p.status]?.badge || "soon"}`}>{p.status}</span>
                      </td>
                      <td className="dash-table-muted">{formatDate(p.lastContact)}</td>
                      <td className={fu === "overdue" ? "mkt-followup-overdue" : "dash-table-muted"}>{p.nextFollowUp ? formatDate(p.nextFollowUp) : "—"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8}>{emptyState("No prospects match", "Try clearing a filter or add a new prospect.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function OutreachFilterBar({ marketing, filters, onFiltersChange, onOpenNewProspect, onOpenLogActivity }) {
  const { prospects } = marketing;
  const filterOptions = useMemo(
    () => ({
      industry: [...new Set(prospects.map((p) => p.industry))].sort(),
      channel: [...new Set(prospects.map((p) => p.channel))].sort(),
      serviceInterest: [...new Set(prospects.map((p) => p.serviceInterest))].sort()
    }),
    [prospects]
  );

  function set(key, value) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="work-toolbar-actions">
      <div className="work-toolbar-control work-toolbar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.8-3.8" />
        </svg>
        <input type="search" placeholder="Search" value={filters.search} onChange={(e) => set("search", e.target.value)} />
      </div>
      <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by industry" value={filters.industry} onChange={(e) => set("industry", e.target.value)}>
        <option value="All">Industry</option>
        {filterOptions.industry.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
        <option value="All">Status</option>
        {Object.keys(MKT_STATUS_META).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by channel" value={filters.channel} onChange={(e) => set("channel", e.target.value)}>
        <option value="All">Channel</option>
        {filterOptions.channel.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by service" value={filters.serviceInterest} onChange={(e) => set("serviceInterest", e.target.value)}>
        <option value="All">Service</option>
        {filterOptions.serviceInterest.map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
      <select className="work-toolbar-control work-toolbar-select" aria-label="Filter by follow-up" value={filters.followup} onChange={(e) => set("followup", e.target.value)}>
        <option value="All">Follow-up</option>
        <option value="overdue">Overdue</option>
        <option value="week">Due this week</option>
        <option value="none">No follow-up set</option>
      </select>
      <button className="work-toolbar-control btn btn-ghost" type="button" onClick={onOpenLogActivity}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Outreach Activity
      </button>
      <button className="work-toolbar-control work-toolbar-new" type="button" onClick={onOpenNewProspect}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
        Add Prospect
      </button>
    </div>
  );
}
