/*
 * Innov8 Studios — Studio Campaigns detail view (Overview / Insights /
 * Assets tabs), ported from marketing.js's campaignDetailTabsHtml()/
 * renderCampaignDetail()/wireCampaignDetail().
 */
import { useState } from "react";
import LineChart from "../../components/LineChart.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { formatDate, formatMoney } from "../../lib/format.js";
import { formatDateRange, formatCompact, CAMPAIGN_STATUS_BADGE } from "./marketingFormat.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

function KpiGrid({ k }) {
  const rows = [
    ["Reach", formatCompact(k.reach)],
    ["Impressions", formatCompact(k.impressions)],
    ["Engagement", formatCompact(k.engagement)],
    ["Profile Visits", formatCompact(k.profileVisits)],
    ["Link Clicks", k.linkClicks],
    ["Enquiries", k.enquiries],
    ["Leads", k.leads],
    ["Opportunities", k.opportunities],
    ["Revenue", formatMoney(k.revenue)]
  ];
  return (
    <div className="mkt-kpi-grid">
      {rows.map(([label, value]) => (
        <div key={label} className="mkt-kpi-cell">
          <strong>{value}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function PlatformComparison({ platforms }) {
  if (!platforms.length || platforms.every((p) => !p.reach)) {
    return emptyState("No platform data yet", "Performance breaks down by platform once the campaign is live.");
  }
  const metrics = [
    { key: "reach", label: "Reach", format: formatCompact },
    { key: "engagement", label: "Engagement", format: formatCompact },
    { key: "clicks", label: "Clicks", format: (v) => v },
    { key: "leads", label: "Leads", format: (v) => v },
    { key: "costPerEnquiry", label: "Cost per enquiry", format: (v) => (v ? formatMoney(v) : "—") }
  ];
  const colors = ["#ff8a3d", "#4f8cff", "#3ddc84", "#a855f7"];

  return (
    <div className="mkt-platform-compare">
      <div className="mkt-platform-compare-legend">
        {platforms.map((p, i) => (
          <span key={p.platform}>
            <i style={{ background: colors[i % colors.length] }} />
            {p.platform}
          </span>
        ))}
      </div>
      {metrics.map((m) => {
        const max = Math.max(...platforms.map((p) => p[m.key] || 0), 1);
        return (
          <div key={m.key} className="mkt-compare-row">
            <span className="mkt-compare-label">{m.label}</span>
            <div className="mkt-compare-bars">
              {platforms.map((p, i) => (
                <div key={p.platform} className="mkt-compare-bar-track">
                  <div className="mkt-compare-bar" style={{ width: `${Math.max(4, ((p[m.key] || 0) / max) * 100)}%`, background: colors[i % colors.length] }} />
                  <span>{m.format(p[m.key] || 0)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Funnel({ funnel }) {
  const max = funnel[0]?.value || 1;
  return (
    <div className="mkt-funnel">
      {funnel.map((stage, i) => {
        const width = Math.max(6, (stage.value / max) * 100);
        const prev = i > 0 ? funnel[i - 1].value : null;
        const conv = prev ? Math.round((stage.value / prev) * 100) : null;
        return (
          <div key={stage.stage} className="mkt-funnel-row">
            <span className="mkt-funnel-label">{stage.stage}</span>
            <div className="mkt-funnel-track">
              <div className="mkt-funnel-bar" style={{ width: `${width}%` }} />
            </div>
            <span className="mkt-funnel-value">
              {stage.value.toLocaleString()}
              {conv !== null && <em> ({conv}%)</em>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function assetColor(seedStr) {
  const palette = ["#ff8a3d", "#4f8cff", "#3ddc84", "#a855f7", "#22c1c3", "#e5484d", "#f2b705"];
  let hash = 0;
  for (let i = 0; i < seedStr.length; i += 1) hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function AssetGrid({ assets }) {
  if (!assets.length) return emptyState("No assets yet", "Creative assets will appear here once they're produced.");
  return (
    <div className="mkt-asset-grid">
      {assets.map((a) => (
        <div key={a.name} className="mkt-asset-card">
          <div className="mkt-asset-thumb" style={{ background: `linear-gradient(155deg, ${assetColor(a.name)}55, ${assetColor(a.name)}11)` }}>
            <span>{a.format}</span>
          </div>
          <div className="mkt-asset-info">
            <strong>{a.name}</strong>
            <span className="mkt-asset-platform">
              {a.platform} · {a.format}
            </span>
            <div className="mkt-asset-stats">
              <span>{a.views.toLocaleString()} views</span>
              <span>{a.engagements.toLocaleString()} engagements</span>
              <span>{a.enquiries} enquiries</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Timeline({ timeline }) {
  if (!timeline.length) return emptyState("No activity yet", "Campaign activity will appear here once it launches.");
  return (
    <div className="timeline">
      {timeline.map((t, i) => (
        <div key={i} className="timeline-item">
          <span className="timeline-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
              <path d="M8 3.5v4" />
              <path d="M16 3.5v4" />
              <path d="M3.5 10.5h17" />
            </svg>
          </span>
          <div className="timeline-body">
            <p>{t.label}</p>
            <time>{formatDate(t.date)}</time>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CampaignDetail({ campaign, marketing, onBack }) {
  const { show } = useToast();
  const [tab, setTab] = useState("overview");

  function handleTogglePause() {
    const next = marketing.toggleCampaignPause(campaign.id);
    show(`"${campaign.name}" ${next === "Paused" ? "paused" : "resumed"}.`);
  }

  return (
    <div>
      <div className="mkt-campaign-detail-head">
        <button className="btn btn-ghost" type="button" onClick={onBack}>
          All campaigns
        </button>
        <div className="mkt-campaign-detail-title">
          <h2>{campaign.name}</h2>
          <span className={`badge badge--${CAMPAIGN_STATUS_BADGE[campaign.status] || "soon"}`}>{campaign.status}</span>
        </div>
        <div className="detail-actions">
          <button className="btn" type="button" onClick={() => show("Campaign editing is coming soon — this is a visual prototype.")}>
            Edit Campaign
          </button>
          <button className="btn" type="button" onClick={handleTogglePause}>
            {campaign.status === "Paused" ? "Resume Campaign" : "Pause Campaign"}
          </button>
        </div>
      </div>

      <div className="panel mkt-campaign-info">
        <div>
          <span className="field-label">Objective</span>
          <p>{campaign.objective}</p>
        </div>
        <div>
          <span className="field-label">Service</span>
          <p>{campaign.service}</p>
        </div>
        <div>
          <span className="field-label">Target Audience</span>
          <p>{campaign.targetAudience}</p>
        </div>
        <div>
          <span className="field-label">Platforms</span>
          <p>{campaign.platforms.join(" · ")}</p>
        </div>
        <div>
          <span className="field-label">Campaign Period</span>
          <p>{formatDateRange(campaign.dateRange.start, campaign.dateRange.end)}</p>
        </div>
        <div>
          <span className="field-label">Budget</span>
          <p>{formatMoney(campaign.budget)}</p>
        </div>
      </div>

      <div className="work-tabs mkt-campaign-tabs">
        <button className={`work-tab${tab === "overview" ? " is-active" : ""}`} type="button" onClick={() => setTab("overview")}>
          Overview
        </button>
        <button className={`work-tab${tab === "insights" ? " is-active" : ""}`} type="button" onClick={() => setTab("insights")}>
          Insights
        </button>
        <button className={`work-tab${tab === "assets" ? " is-active" : ""}`} type="button" onClick={() => setTab("assets")}>
          Assets
        </button>
      </div>

      {tab === "overview" && (
        <>
          <KpiGrid k={campaign.kpis} />
          <div className="dash-grid">
            <div className="dash-column">
              <div className="panel">
                <div className="panel-header">
                  <h2>Platform performance</h2>
                </div>
                <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
                  <PlatformComparison platforms={campaign.platformBreakdown} />
                </div>
              </div>
            </div>
            <div className="dash-column">
              <div className="panel">
                <div className="panel-header">
                  <h2>Campaign timeline</h2>
                </div>
                <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
                  <Timeline timeline={campaign.timeline} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "insights" &&
        (campaign.insights.length ? (
          <>
            <div className="panel mkt-insight-summary">
              <p>{campaign.insightsSummary}</p>
            </div>
            <div className="mkt-insight-grid">
              {campaign.insights.map((i) => (
                <div key={i.title} className="panel mkt-insight-card">
                  <strong>{i.title}</strong>
                  <p>{i.body}</p>
                </div>
              ))}
            </div>
            <div className="dash-grid">
              <div className="dash-column">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Conversion funnel</h2>
                  </div>
                  <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
                    <Funnel funnel={campaign.funnel} />
                  </div>
                </div>
              </div>
              <div className="dash-column">
                <div className="panel">
                  <div className="panel-header">
                    <h2>Performance over time</h2>
                  </div>
                  <div style={{ padding: "var(--space-2) var(--space-5) var(--space-5)" }}>
                    {campaign.performanceSeries.length ? (
                      <LineChart series={campaign.performanceSeries} height={110} width={340} />
                    ) : (
                      <div className="mkt-chart-empty">No data yet</div>
                    )}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-header">
                    <h2>Platform comparison</h2>
                  </div>
                  <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
                    <PlatformComparison platforms={campaign.platformBreakdown} />
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="panel" style={{ padding: "var(--space-6)", textAlign: "center" }}>
            {emptyState("No insights yet", campaign.insightsSummary)}
          </div>
        ))}

      {tab === "assets" && (
        <div className="panel" style={{ padding: "var(--space-5)" }}>
          <AssetGrid assets={campaign.assets} />
        </div>
      )}
    </div>
  );
}
