/*
 * Innov8 Studios — Marketing "Overview" tab, ported from marketing.js's
 * renderKpis/renderOverviewOutreachActivity/renderUpcomingActions/
 * renderCampaignPerformanceOverview.
 */
import { MKT_KPIS, MKT_STATUS_META, MKT_UPCOMING_ACTIONS } from "./marketingMock.js";
import { daysUntil, formatDate } from "../../lib/format.js";
import { formatCompact, CAMPAIGN_STATUS_BADGE } from "./marketingFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function allTouchpoints(prospects) {
  const rows = [];
  prospects.forEach((p) => {
    p.history.forEach((h) => rows.push({ ...h, business: p.business, contact: p.contact.name, channel: p.channel, status: p.status, prospectId: p.id }));
  });
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export default function Overview({ marketing, onOpenProspect, onViewCampaign, onGotoTab }) {
  const { prospects, campaigns } = marketing;
  const touchpoints = allTouchpoints(prospects).slice(0, 7);
  const contactedThisWeek = prospects.filter((p) => p.lastContact && daysUntil(p.lastContact) >= -7).length;
  const activeCampaigns = campaigns.filter((c) => c.status === "Active").slice(0, 3);

  return (
    <>
      <section className="dash-stat-cards" aria-label="Marketing & Sales metrics">
        {MKT_KPIS.map((k) => (
          <div key={k.label} className="panel dash-stat-card">
            <div>
              <strong>{k.value}</strong>
              <span className="dash-stat-label">{k.label}</span>
              <span className={`dash-stat-trend is-${k.direction}`}>{k.meta}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Outreach activity</h2>
              <span className="panel-meta">{contactedThisWeek} prospects contacted this week</span>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Contact</th>
                    <th>Channel</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {touchpoints.length ? (
                    touchpoints.map((r, i) => (
                      <tr key={i} className="mkt-clickable-row" style={{ cursor: "pointer" }} onClick={() => onOpenProspect(r.prospectId)}>
                        <td className="dash-table-name">{r.business}</td>
                        <td className="dash-table-muted">{r.contact}</td>
                        <td>{r.channel}</td>
                        <td>
                          <span className={`badge badge--${MKT_STATUS_META[r.status]?.badge || "soon"}`}>{r.status}</span>
                        </td>
                        <td className="dash-table-muted">{formatDate(r.date)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>{emptyState("No outreach yet", "Logged touchpoints will appear here.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Next actions</h2>
              <span className="panel-meta">Today's focus</span>
            </div>
            <div>
              {MKT_UPCOMING_ACTIONS.length ? (
                MKT_UPCOMING_ACTIONS.map((a, i) => (
                  <div key={i} className="action-item">
                    <div className="action-item-main">
                      <p>{a.text}</p>
                      <span>{a.meta}</span>
                    </div>
                  </div>
                ))
              ) : (
                emptyState("Nothing on deck", "New actions will show up here.")
              )}
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Campaign performance</h2>
              <button className="panel-link" type="button" onClick={() => onGotoTab("campaigns")}>
                View all campaigns
              </button>
            </div>
            <div>
              {activeCampaigns.length ? (
                activeCampaigns.map((c) => (
                  <div key={c.id} className="mkt-perf-row">
                    <div className="mkt-perf-row-main">
                      <strong>{c.name}</strong>
                      <span className={`badge badge--${CAMPAIGN_STATUS_BADGE[c.status] || "soon"}`}>{c.status}</span>
                    </div>
                    <div className="mkt-perf-row-metrics">
                      <span>
                        <strong>{formatCompact(c.kpis.reach)}</strong> Reach
                      </span>
                      <span>
                        <strong>{formatCompact(c.kpis.engagement)}</strong> Engagement
                      </span>
                      <span>
                        <strong>{c.kpis.enquiries}</strong> Enquiries
                      </span>
                      <span>
                        <strong>{c.kpis.leads}</strong> Leads
                      </span>
                    </div>
                    <button
                      className="panel-link"
                      type="button"
                      onClick={() => {
                        onGotoTab("campaigns");
                        onViewCampaign(c.id);
                      }}
                    >
                      View Campaign
                    </button>
                  </div>
                ))
              ) : (
                emptyState("No active campaigns", "Launch a campaign to see performance here.")
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
