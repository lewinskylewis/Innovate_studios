/*
 * Innov8 Studios — Enquiries "Overview" tab: a concise operational read
 * on the intake funnel (how much is coming in, what needs action today,
 * how it's converting), not an analytics dashboard. Mirrors the shape
 * of Relationships' Overview.jsx and Marketing's Overview.jsx.
 */
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, daysUntil } from "../../lib/format.js";
import { STATUS_BADGE, needsAttention, attentionReason } from "./enquiriesFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function Funnel({ stages }) {
  const max = stages[0]?.value || 1;
  return (
    <div className="mkt-funnel">
      {stages.map((stage, i) => {
        const width = Math.max(6, (stage.value / max) * 100);
        const prev = i > 0 ? stages[i - 1].value : null;
        const conv = prev ? Math.round((stage.value / prev) * 100) : null;
        return (
          <div key={stage.stage} className="mkt-funnel-row">
            <span className="mkt-funnel-label">{stage.stage}</span>
            <div className="mkt-funnel-track">
              <div className="mkt-funnel-bar" style={{ width: `${width}%` }} />
            </div>
            <span className="mkt-funnel-value">
              {stage.value}
              {conv !== null && <em> ({conv}%)</em>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function Overview({ enquiries, onOpenRecord }) {
  const newRecent = enquiries.filter((e) => e.status === "New" && daysUntil(e.dateReceived) >= -3);
  const uncontacted = enquiries.filter((e) => e.status === "New");
  const inProgress = enquiries.filter((e) => ["Contacted", "Qualifying"].includes(e.status));
  const qualified = enquiries.filter((e) => e.status === "Qualified");
  const converted = enquiries.filter((e) => e.status === "Converted");
  const closed = enquiries.filter((e) => e.status === "Closed");

  const cards = [
    { label: "New", value: newRecent.length },
    { label: "Uncontacted", value: uncontacted.length },
    { label: "In Progress", value: inProgress.length },
    { label: "Qualified", value: qualified.length },
    { label: "Converted", value: converted.length },
    { label: "Closed / Lost", value: closed.length }
  ];

  const attention = enquiries.filter(needsAttention).slice(0, 6);
  const recent = [...enquiries].sort((a, b) => new Date(b.dateReceived) - new Date(a.dateReceived)).slice(0, 6);

  const contactedOrBeyond = enquiries.filter((e) => e.status !== "New").length;
  const qualifiedOrBeyond = enquiries.filter((e) => ["Qualified", "Converted"].includes(e.status)).length;
  const funnel = [
    { stage: "Enquiries", value: enquiries.length },
    { stage: "Contacted", value: contactedOrBeyond },
    { stage: "Qualified", value: qualifiedOrBeyond },
    { stage: "Converted", value: converted.length }
  ];

  const sourceCounts = enquiries.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const maxSource = topSources[0]?.[1] || 1;

  return (
    <>
      <section className="dash-stat-cards" aria-label="Enquiries metrics">
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
              <h2>Attention required</h2>
              <span className="panel-meta">{attention.length} enquiries</span>
            </div>
            <div>
              {attention.length ? (
                attention.map((e) => (
                  <div key={e.id} className="action-item is-overdue" style={{ cursor: "pointer" }} onClick={() => onOpenRecord(e.id)}>
                    <div className="action-item-main">
                      <p>
                        {e.personName} — {e.brandName}
                      </p>
                      <span>{attentionReason(e)}</span>
                    </div>
                  </div>
                ))
              ) : (
                emptyState("Nothing needs attention", "Overdue follow-ups and unqualified enquiries will show up here.")
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Recent enquiries</h2>
              <span className="panel-meta">Newest first</span>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Brand</th>
                    <th>Status</th>
                    <th>Received</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length ? (
                    recent.map((e) => (
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
                        <td>
                          <span className={`badge badge--${STATUS_BADGE[e.status] || "soon"}`}>{e.status}</span>
                        </td>
                        <td className="dash-table-muted">{formatDate(e.dateReceived)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>{emptyState("No enquiries yet", "New enquiries will appear here as they come in.")}</td>
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
              <h2>Conversion snapshot</h2>
              <span className="panel-meta">Enquiries → Contacted → Qualified → Converted</span>
            </div>
            <Funnel stages={funnel} />
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Where enquiries come from</h2>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topSources.length ? (
                    topSources.map(([source, count]) => (
                      <tr key={source}>
                        <td className="dash-table-name">{source}</td>
                        <td className="dash-table-muted">
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ width: `${Math.max(8, (count / maxSource) * 60)}px`, height: "0.375rem", borderRadius: "999px", background: "var(--orange)", display: "inline-block" }} />
                            {count}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2}>{emptyState("No sources yet", "Source attribution will appear here.")}</td>
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
