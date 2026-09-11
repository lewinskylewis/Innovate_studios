/*
 * Innov8 Studios — Insights / Business Insights tab. Three sections in
 * one page (Enquiries, Outreach, Projects) per spec — not separate
 * tabs. Enquiries + Outreach reuse data/insights.js's real aggregates;
 * Projects reuses the exact same Studio project data (and
 * computeDeliveryStatus/computeBalance) the Ongoing Projects table and
 * Home's income card already use — no second project dataset. Campaign-
 * level performance numbers have no real per-campaign tracking yet (see
 * insightsMock.js), so that one table stays mock.
 */
import { KpiCard, KpiRow, FunnelSteps, SourceBars, InsightSummary, money } from "./InsightsShared.jsx";
import { campaignPerformance, outreachInsight } from "./insightsMock.js";

function StatRow({ items }) {
  return (
    <div className="insights-delivery-row">
      {items.map((it) => (
        <div className="insights-delivery-item" key={it.label}>
          <strong>{it.value}</strong>
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function InsightsBusiness({ data }) {
  const { enquiries, outreach, projects, finance } = data;

  return (
    <>
      {/* ---------- Enquiries ---------- */}
      <h2 className="insights-major-heading">Enquiries</h2>

      <KpiRow>
        <KpiCard value={enquiries.total} label="Total Enquiries" />
        <KpiCard value={enquiries.qualified} label="Qualified" />
        <KpiCard value={enquiries.converted} label="Converted" />
        <KpiCard value={`${enquiries.conversionRate}%`} label="Conversion Rate" />
      </KpiRow>

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel insights-section-gap">
            <div className="panel-header">
              <h2>Enquiry funnel</h2>
            </div>
            <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <FunnelSteps
                steps={[
                  { value: enquiries.total, label: "Enquiries" },
                  { value: enquiries.atLeastQualified, label: "Qualified" },
                  { value: enquiries.converted, label: "Opportunities" },
                  { value: enquiries.projects, label: "Projects" }
                ]}
              />
              <p className="sub" style={{ marginTop: "0.75rem" }}>
                "Projects" is every Client with a Studio project today — there's no per-enquiry attribution yet, so it isn't a strict subset of the stages before it.
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Response performance</h2>
            </div>
            <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <StatRow
                items={[
                  { value: enquiries.medianResponseDays === null ? "—" : `${enquiries.medianResponseDays.toFixed(1)}d`, label: "Median response time" },
                  { value: enquiries.uncontacted, label: "Uncontacted enquiries" }
                ]}
              />
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Enquiry sources</h2>
            </div>
            <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              {enquiries.sources.length ? (
                <SourceBars rows={enquiries.sources} labelKey="source" valueKey="count" note={(r) => `${r.converted} converted`} />
              ) : (
                <div className="empty-state">
                  <strong>No enquiries yet</strong>
                  <span>Sources will appear once enquiries start coming in.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Outreach ---------- */}
      <h2 className="insights-major-heading">Outreach</h2>

      <KpiRow>
        <KpiCard value={outreach.contactsReached} label="Contacts Reached" />
        <KpiCard value={outreach.responses} label="Responses" />
        <KpiCard value={outreach.positiveResponses} label="Positive Responses" />
        <KpiCard value={outreach.opportunities} label="Opportunities" />
      </KpiRow>

      <div className="panel insights-section-gap">
        <div className="panel-header">
          <h2>Outreach funnel</h2>
        </div>
        <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
          <FunnelSteps
            steps={[
              { value: outreach.contactsReached, label: "Contacted" },
              { value: outreach.responses, label: "Responses" },
              { value: outreach.positiveResponses, label: "Positive" },
              { value: outreach.opportunities, label: "Opportunities" },
              { value: outreach.projectsWon, label: "Projects" }
            ]}
          />
          <p className="sub" style={{ marginTop: "0.75rem" }}>
            "Projects" is every Client with a Studio project today, the same org-wide figure shown in the Enquiry funnel above — not yet attributed to a specific outreach lead.
          </p>
        </div>
      </div>

      <div className="panel insights-section-gap">
        <div className="panel-header">
          <h2>Campaign performance</h2>
          <span className="panel-meta">Mock — no per-campaign tracking yet</span>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Campaign</th>
                <th style={{ textAlign: "right" }}>Contacted</th>
                <th style={{ textAlign: "right" }}>Responses</th>
                <th style={{ textAlign: "right" }}>Opportunities</th>
              </tr>
            </thead>
            <tbody>
              {campaignPerformance.map((row) => (
                <tr key={row.campaign}>
                  <td className="dash-table-name">{row.campaign}</td>
                  <td style={{ textAlign: "right" }}>{row.contacted}</td>
                  <td style={{ textAlign: "right" }}>{row.responses}</td>
                  <td style={{ textAlign: "right" }}>{row.opportunities}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InsightSummary>{outreachInsight}</InsightSummary>

      {/* ---------- Projects ---------- */}
      <h2 className="insights-major-heading">Projects</h2>

      <KpiRow>
        <KpiCard value={projects.total} label="Projects" />
        <KpiCard value={projects.active} label="Active" />
        <KpiCard value={projects.completed} label="Completed" />
        <KpiCard value={projects.late} label="Late" />
      </KpiRow>

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel insights-section-gap">
            <div className="panel-header">
              <h2>Project health</h2>
            </div>
            <div className="insights-health-row" style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <div className="insights-health-item">
                <strong style={{ color: "var(--success)" }}>{projects.health.healthy}</strong>
                <span>Healthy</span>
              </div>
              <div className="insights-health-item">
                <strong style={{ color: "var(--ember)" }}>{projects.health.atRisk}</strong>
                <span>At Risk</span>
              </div>
              <div className="insights-health-item">
                <strong style={{ color: "var(--danger)" }}>{projects.health.late}</strong>
                <span>Late</span>
              </div>
            </div>
          </div>

          <div className="panel insights-section-gap">
            <div className="panel-header">
              <h2>Delivery performance</h2>
            </div>
            <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <StatRow
                items={[
                  { value: projects.delivery.onTimeRate === null ? "—" : `${projects.delivery.onTimeRate}%`, label: "On-time delivery" },
                  { value: projects.delivery.avgDuration === null ? "—" : `${projects.delivery.avgDuration}d`, label: "Avg. project duration" },
                  { value: projects.delivery.avgValue === null ? "—" : money(projects.delivery.avgValue), label: "Avg. project value" }
                ]}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Project pipeline</h2>
            </div>
            <div className="insights-pipeline-row" style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <div className="insights-pipeline-item">
                <strong>{projects.pipeline.planning}</strong>
                <span>Planning</span>
              </div>
              <div className="insights-pipeline-item">
                <strong>{projects.pipeline.active}</strong>
                <span>Active</span>
              </div>
              <div className="insights-pipeline-item">
                <strong>{projects.pipeline.review}</strong>
                <span>Review</span>
              </div>
              <div className="insights-pipeline-item">
                <strong>{projects.pipeline.completed}</strong>
                <span>Completed</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Financial snapshot</h2>
            </div>
            <div className="insights-finance-row" style={{ padding: "0 var(--space-5) var(--space-5)" }}>
              <div className="insights-finance-item">
                <strong>{money(finance.totalBudget)}</strong>
                <span>Project Value</span>
              </div>
              <div className="insights-finance-item is-collected">
                <strong>{money(finance.collected)}</strong>
                <span>Collected</span>
              </div>
              <div className="insights-finance-item is-outstanding">
                <strong>{money(finance.outstanding)}</strong>
                <span>Outstanding</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
