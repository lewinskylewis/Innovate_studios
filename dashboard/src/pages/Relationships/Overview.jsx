/*
 * Innov8 Studios — Relationships "Overview" tab: a concise read on the
 * whole relationship ecosystem (who we're dealing with, where they are,
 * who needs attention), not an analytics dashboard. Mirrors the shape
 * of Marketing's Overview.jsx and Studio's StudioOverview.jsx.
 */
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, daysUntil } from "../../lib/format.js";
import { TYPE_BADGE, followupState, lastActivityDate } from "./relationshipsFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function RecordRow({ record, meta, onOpen }) {
  return (
    <tr className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpen(record.id)}>
      <td>
        <span className="dash-table-person">
          <span className="avatar" style={{ background: colorForName(record.personName) }}>
            {initials(record.personName)}
          </span>{" "}
          <span>{record.personName}</span>
        </span>
      </td>
      <td className="dash-table-name">{record.brandName}</td>
      <td>
        <span className={`badge badge--${TYPE_BADGE[record.type] || "soon"}`}>{record.type}</span>
      </td>
      <td className="dash-table-muted">{meta}</td>
    </tr>
  );
}

export default function Overview({ relationships, onOpenRecord }) {
  const contacts = relationships.filter((r) => r.type === "Contact");
  const prospects = relationships.filter((r) => r.type === "Prospect");
  const leads = relationships.filter((r) => r.type === "Lead");
  const clients = relationships.filter((r) => r.type === "Client");
  const partners = relationships.filter((r) => r.type === "Partner");

  const activeLeads = leads.filter((r) => !["Won", "Lost"].includes(r.status));
  const activeClients = clients.filter((r) => r.relationshipHealth !== "Inactive");

  const overdue = relationships.filter((r) => followupState(r) === "overdue");
  const upcoming = relationships
    .filter((r) => followupState(r) === "week")
    .sort((a, b) => new Date(a.nextFollowUp) - new Date(b.nextFollowUp));

  const atRiskClients = clients.filter((r) => r.relationshipHealth === "At Risk");
  const needsAttention = new Set([...overdue.map((r) => r.id), ...atRiskClients.map((r) => r.id)]);

  const recentlyAdded = [...relationships].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 6);
  const recentlyActive = [...relationships]
    .map((r) => ({ r, last: lastActivityDate(r) }))
    .sort((a, b) => new Date(b.last) - new Date(a.last))
    .slice(0, 6)
    .map((x) => x.r);

  const cards = [
    { label: "Total Relationships", value: relationships.length },
    { label: "Contacts", value: contacts.length },
    { label: "Prospects", value: prospects.length },
    { label: "Active Leads", value: activeLeads.length },
    { label: "Active Clients", value: activeClients.length },
    { label: "Partners", value: partners.length },
    { label: "Needs Attention", value: needsAttention.size },
    { label: "Overdue Follow-ups", value: overdue.length }
  ];

  const followupRows = [...overdue, ...upcoming].slice(0, 8);

  const attentionList = [
    ...atRiskClients.map((r) => ({ record: r, reason: "Client health: At Risk" })),
    ...overdue.filter((r) => !atRiskClients.includes(r)).map((r) => ({ record: r, reason: r.followUpReason || "Follow-up overdue" }))
  ].slice(0, 6);

  return (
    <>
      <section className="dash-stat-cards" aria-label="Relationships metrics">
        {cards.map((c) => (
          <div key={c.label} className="panel dash-stat-card">
            <div>
              <strong>{c.value}</strong>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Follow-ups</h2>
              <span className="panel-meta">{overdue.length} overdue · {upcoming.length} due this week</span>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Brand</th>
                    <th>Reason</th>
                    <th>Due</th>
                  </tr>
                </thead>
                <tbody>
                  {followupRows.length ? (
                    followupRows.map((r) => (
                      <tr key={r.id} className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpenRecord(r.id)}>
                        <td className="dash-table-name">{r.personName}</td>
                        <td className="dash-table-muted">{r.brandName}</td>
                        <td className="dash-table-muted">{r.followUpReason || "—"}</td>
                        <td className={followupState(r) === "overdue" ? "mkt-followup-overdue" : "dash-table-muted"}>{formatDate(r.nextFollowUp)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{emptyState("No follow-ups due", "Overdue and upcoming follow-ups will appear here.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recently added</h2>
              <span className="panel-meta">Newest relationships first</span>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Brand</th>
                    <th>Type</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyAdded.length ? (
                    recentlyAdded.map((r) => <RecordRow key={r.id} record={r} meta={formatDate(r.dateAdded)} onOpen={onOpenRecord} />)
                  ) : (
                    <tr>
                      <td colSpan={4}>{emptyState("No relationships yet", "New Contacts, Prospects, Leads, Clients and Partners will appear here.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Needs attention</h2>
              <span className="panel-meta">{needsAttention.size} relationships</span>
            </div>
            <div>
              {attentionList.length ? (
                attentionList.map(({ record, reason }) => (
                  <div key={record.id} className="action-item is-overdue" style={{ cursor: "pointer" }} onClick={() => onOpenRecord(record.id)}>
                    <div className="action-item-main">
                      <p>
                        {record.personName} — {record.brandName}
                      </p>
                      <span>{reason}</span>
                    </div>
                  </div>
                ))
              ) : (
                emptyState("Nothing needs attention", "At-risk clients and overdue follow-ups will show up here.")
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recently active</h2>
              <span className="panel-meta">Most recent activity first</span>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Brand</th>
                    <th>Type</th>
                    <th>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {recentlyActive.length ? (
                    recentlyActive.map((r) => <RecordRow key={r.id} record={r} meta={formatDate(lastActivityDate(r))} onOpen={onOpenRecord} />)
                  ) : (
                    <tr>
                      <td colSpan={4}>{emptyState("No activity yet", "Interactions, notes and status changes will appear here.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
