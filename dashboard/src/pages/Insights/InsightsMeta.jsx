/*
 * Innov8 Studios — Insights / Meta Analytics tab. No Meta Graph API
 * integration exists in this codebase yet, so this entire tab renders
 * from insightsMock.js (clearly isolated there) — swapping in the real
 * Instagram/Facebook integration later only touches that one file plus
 * this tab's data prop, nothing in the render logic below.
 */
import { useState } from "react";
import { KpiCard, KpiRow, MetricSwitcherChart, compact } from "./InsightsShared.jsx";
import { meta } from "./insightsMock.js";

const METRICS = [
  { key: "reach", label: "Reach" },
  { key: "engagement", label: "Engagement" },
  { key: "followers", label: "Followers" },
  { key: "profileActions", label: "Profile Actions" }
];

export default function InsightsMeta() {
  const [metric, setMetric] = useState("reach");

  return (
    <>
      <div className="empty-state" style={{ marginBottom: "var(--space-5)" }}>
        <strong>No Meta connection yet</strong>
        <span>Connect an Instagram/Facebook account to replace the figures below with live data.</span>
      </div>

      <KpiRow>
        <KpiCard value={compact(meta.kpis.reach)} label="Reach" trend={`+${meta.kpis.reachDelta}%`} />
        <KpiCard value={`${meta.kpis.engagementRate}%`} label="Engagement Rate" trend={`+${meta.kpis.engagementDelta}%`} />
        <KpiCard value={meta.kpis.followers.toLocaleString("en-KE")} label="Followers" trend={`+${meta.kpis.followersDelta}%`} />
        <KpiCard value={meta.kpis.profileActions.toLocaleString("en-KE")} label="Profile Actions" trend={`+${meta.kpis.profileActionsDelta}%`} />
      </KpiRow>

      <MetricSwitcherChart title="Performance" metrics={METRICS} activeMetric={metric} onChange={setMetric} series={meta.performance[metric]} kind="line" />

      <div className="panel insights-section-gap">
        <div className="panel-header">
          <h2>Top performing content</h2>
        </div>
        <div className="mkt-asset-grid" style={{ padding: "0 var(--space-5) var(--space-5)" }}>
          {meta.topContent.map((c) => (
            <div className="mkt-asset-card" key={c.id}>
              <div className="mkt-asset-thumb">
                <span>{c.type}</span>
              </div>
              <div className="mkt-asset-info">
                <strong>{c.label}</strong>
                <div className="mkt-asset-stats">
                  <span>{c.reach.toLocaleString("en-KE")} reach</span>
                  <span>{c.engagement}% engagement</span>
                  <span>{c.actions} actions</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mkt-insight-grid">
        {meta.insights.map((i) => (
          <div className="panel mkt-insight-card" key={i.label}>
            <strong>{i.label}</strong>
            <p>{i.detail}</p>
          </div>
        ))}
      </div>
    </>
  );
}
