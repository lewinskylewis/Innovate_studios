/*
 * Innov8 Studios — Insights / Overview tab. "How is Innovate performing
 * right now?" — every KPI/list here answers one of the module's guiding
 * questions (growing? opportunities coming in? converting? projects
 * healthy? outreach working?) using data/insights.js's real aggregates;
 * only the Performance trend chart and Meaningful Reach fall back to
 * insightsMock.js (no historical snapshots / no Meta integration yet
 * respectively — see that file's own comments).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KpiCard, KpiRow, MetricSwitcherChart, AttentionItem, SourceBars, InsightSummary, money, compact } from "./InsightsShared.jsx";
import { meta, overviewTrend } from "./insightsMock.js";

const TREND_METRICS = [
  { key: "enquiries", label: "Enquiries" },
  { key: "projects", label: "Projects" },
  { key: "revenue", label: "Revenue" }
];

export default function InsightsOverview({ data }) {
  const navigate = useNavigate();
  const [metric, setMetric] = useState("enquiries");
  const { finance, projects, enquiries, outreach } = data;

  const attention = [];
  if (projects.late > 0) attention.push({ severity: "critical", text: `${projects.late} project${projects.late === 1 ? " is" : "s are"} overdue`, to: "/studio" });
  if (enquiries.uncontacted > 0) attention.push({ severity: "warning", text: `${enquiries.uncontacted} enquir${enquiries.uncontacted === 1 ? "y hasn't" : "ies haven't"} been contacted`, to: "/enquiries" });
  if (projects.approachingDeadline.length > 0)
    attention.push({ severity: "warning", text: `${projects.approachingDeadline.length} project${projects.approachingDeadline.length === 1 ? " is" : "s are"} approaching ${projects.approachingDeadline.length === 1 ? "its" : "their"} deadline`, to: "/studio" });
  if (enquiries.needingAttention > 0) attention.push({ severity: "neutral", text: `${enquiries.needingAttention} enquir${enquiries.needingAttention === 1 ? "y needs" : "ies need"} attention`, to: "/enquiries" });

  const whatChanged = `There ${enquiries.open === 1 ? "is" : "are"} ${enquiries.open} open enquir${enquiries.open === 1 ? "y" : "ies"} and ${projects.active} active project${projects.active === 1 ? "" : "s"} right now. Enquiry-to-project conversion sits at ${enquiries.conversionRate}% — ${
    enquiries.uncontacted > 0
      ? `${enquiries.uncontacted} enquir${enquiries.uncontacted === 1 ? "y" : "ies"} still ${enquiries.uncontacted === 1 ? "hasn't" : "haven't"} been contacted, the fastest lever to improve it.`
      : "every enquiry has at least been contacted, so qualification is the next lever to watch."
  }`;

  return (
    <>
      <KpiRow>
        <KpiCard value={money(finance.totalBudget)} label="Project Value" sub="This period" trend="—" />
        <KpiCard value={outreach.activeOpportunities} label="Active Opportunities" trend="—" />
        <KpiCard value={projects.total} label="Projects" sub={`${projects.active} Active · ${projects.completed} Completed · ${projects.late} Late`} />
        <KpiCard value={enquiries.total} label="Enquiries" trend="—" />
        <KpiCard value={compact(meta.kpis.reach)} label="Meaningful Reach" trend={`+${meta.kpis.reachDelta}%`} />
      </KpiRow>

      <MetricSwitcherChart
        title="Performance"
        metrics={TREND_METRICS}
        activeMetric={metric}
        onChange={setMetric}
        series={overviewTrend[metric]}
        kind={metric === "revenue" ? "bar" : "line"}
        formatValue={metric === "revenue" ? (v) => money(v) : undefined}
      />

      <div className="dash-grid">
        <div className="dash-column">
          <div className="panel insights-section-gap">
            <div className="panel-header">
              <h2>Needs attention</h2>
            </div>
            <div className="insights-attention-list" style={{ padding: "0 var(--space-3) var(--space-4)" }}>
              {attention.length ? (
                attention.map((item) => <AttentionItem key={item.text} severity={item.severity} text={item.text} onClick={() => navigate(item.to)} />)
              ) : (
                <div className="empty-state">
                  <strong>Nothing needs attention</strong>
                  <span>Projects and enquiries are all on track right now.</span>
                </div>
              )}
            </div>
          </div>

          <InsightSummary>{whatChanged}</InsightSummary>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Where business is coming from</h2>
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
    </>
  );
}
