/*
 * Innov8 Studios — Studio Campaigns card grid, ported from
 * marketing.js's campaignCardHtml()/renderCampaignCards().
 */
import { formatMoney } from "../../lib/format.js";
import { formatDateRange, formatCompact, CAMPAIGN_STATUS_BADGE } from "./marketingFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default function Campaigns({ campaigns, onView }) {
  if (!campaigns.length) {
    return <div className="panel">{emptyState("No campaigns yet", "Create a campaign to start marketing the Studio.")}</div>;
  }

  return (
    <div className="mkt-campaign-grid">
      {campaigns.map((c) => (
        <div key={c.id} className="panel mkt-campaign-card">
          <div className="mkt-campaign-card-head">
            <h3>{c.name.toUpperCase()}</h3>
            <span className={`badge badge--${CAMPAIGN_STATUS_BADGE[c.status] || "soon"}`}>{c.status}</span>
          </div>
          <p className="mkt-campaign-objective">{c.objective}</p>
          <div className="mkt-campaign-meta-row">
            <span>{c.service}</span>
            <span>{formatDateRange(c.dateRange.start, c.dateRange.end)}</span>
          </div>
          <div className="mkt-platform-pills">
            {c.platforms.map((p) => (
              <span key={p} className="mkt-platform-pill">
                {p}
              </span>
            ))}
          </div>
          <div className="mkt-campaign-budget">
            Budget: <strong>{formatMoney(c.budget)}</strong>
          </div>
          <div className="mkt-campaign-stats">
            <div>
              <strong>{formatCompact(c.kpis.reach)}</strong>
              <span>Reach</span>
            </div>
            <div>
              <strong>{formatCompact(c.kpis.engagement)}</strong>
              <span>Engagement</span>
            </div>
            <div>
              <strong>{c.kpis.enquiries}</strong>
              <span>Enquiries</span>
            </div>
            <div>
              <strong>{c.kpis.leads}</strong>
              <span>Leads</span>
            </div>
          </div>
          <button className="btn btn-primary mkt-campaign-view-btn" type="button" onClick={() => onView(c.id)}>
            View Campaign
          </button>
        </div>
      ))}
    </div>
  );
}
