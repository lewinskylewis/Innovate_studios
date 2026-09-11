/*
 * Innov8 Studios — Insights / Website Analytics tab. No GA4/Search
 * Console integration exists yet, so Users/Sessions/Engagement/traffic/
 * pages all render from insightsMock.js. The Website → Business funnel's
 * "Enquiries" stage is the one real number available today (Enquiries
 * whose source = "Website", from data/insights.js) — visitors/engaged
 * stay mock until GA4 exists to actually measure them, and
 * Qualified/Projects stay mock since there's no reliable way yet to
 * trace a specific website visit through to a specific project.
 */
import { useState } from "react";
import { KpiCard, KpiRow, MetricSwitcherChart, FunnelSteps, money } from "./InsightsShared.jsx";
import { website } from "./insightsMock.js";

const METRICS = [
  { key: "users", label: "Users" },
  { key: "sessions", label: "Sessions" },
  { key: "conversions", label: "Conversions" }
];
const RANGES = ["7d", "30d", "90d"];

export default function InsightsWebsite({ data }) {
  const [metric, setMetric] = useState("users");
  const [range, setRange] = useState("30d");

  const traffic = website.traffic[range];
  const websiteEnquiries = data.enquiries.sources.find((s) => s.source === "Website")?.count;
  const funnel = { ...website.businessFunnel, enquiries: websiteEnquiries ?? website.businessFunnel.enquiries };

  return (
    <>
      <div className="empty-state" style={{ marginBottom: "var(--space-5)" }}>
        <strong>No website analytics connection yet</strong>
        <span>Connect your website analytics source (GA4 / Search Console) to replace the figures below with live data.</span>
      </div>

      <KpiRow>
        <KpiCard value={website.kpis.users.toLocaleString("en-KE")} label="Users" trend={`+${website.kpis.usersDelta}%`} />
        <KpiCard value={website.kpis.sessions.toLocaleString("en-KE")} label="Sessions" trend={`+${website.kpis.sessionsDelta}%`} />
        <KpiCard value={`${website.kpis.engagementRate}%`} label="Engagement Rate" trend={`+${website.kpis.engagementDelta}%`} />
        <KpiCard value={website.kpis.conversions} label="Conversions" sub="Enquiry / contact / consultation requests" trend={`+${website.kpis.conversionsDelta}%`} />
      </KpiRow>

      <MetricSwitcherChart
        title="Website traffic"
        metrics={METRICS}
        activeMetric={metric}
        onChange={setMetric}
        series={traffic[metric]}
        kind="bar"
        right={
          <div className="insights-metric-switch">
            {RANGES.map((r) => (
              <button key={r} type="button" className={`insights-metric-btn${range === r ? " is-active" : ""}`} onClick={() => setRange(r)}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Traffic sources</h2>
            </div>
            <div style={{ padding: "0 var(--space-5) var(--space-5)", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {website.trafficSources.map((s) => (
                <div className="mkt-funnel-row" key={s.source}>
                  <span className="mkt-funnel-label">{s.source}</span>
                  <div className="mkt-funnel-track">
                    <div className="mkt-funnel-bar" style={{ width: `${s.percent}%` }} />
                  </div>
                  <span className="mkt-funnel-value">{s.percent}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Top pages</h2>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Page</th>
                    <th style={{ textAlign: "right" }}>Views</th>
                    <th style={{ textAlign: "right" }}>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {website.topPages.map((p) => (
                    <tr key={p.page}>
                      <td className="dash-table-name">{p.page}</td>
                      <td style={{ textAlign: "right" }}>{p.views.toLocaleString("en-KE")}</td>
                      <td style={{ textAlign: "right" }}>{p.engagement}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="panel insights-section-gap">
        <div className="panel-header">
          <h2>Website → Business funnel</h2>
          <span className="panel-meta">Is the website actually contributing to business?</span>
        </div>
        <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
          <FunnelSteps
            steps={[
              { value: funnel.visitors.toLocaleString("en-KE"), label: "Website Visitors" },
              { value: funnel.engaged.toLocaleString("en-KE"), label: "Engaged Visitors" },
              { value: funnel.enquiries, label: "Enquiries" },
              { value: funnel.qualified, label: "Qualified Opportunities" },
              { value: funnel.projects, label: "Projects" }
            ]}
          />
        </div>
      </div>
    </>
  );
}
