/*
 * Innov8 Studios — /insights route. An executive intelligence layer, not
 * a second analytics dashboard: it reads and aggregates the Studio,
 * Enquiries, Relationships and Outreach data those modules already own
 * (see src/data/insights.js) rather than owning any records itself.
 * Meta/Website Analytics have no backend integration yet, so those two
 * tabs render from src/pages/Insights/insightsMock.js — clearly isolated
 * so swapping in the real integrations later only touches that one file.
 *
 * Date range / Compare / Refresh are real, functional controls (they
 * drive local state and — for Refresh — a real reload of the data
 * layer above), but the range/compare values aren't wired to the
 * aggregation queries yet since there's no historical data to slice by
 * period; see loadInsightsData's own header comment.
 */
import { useEffect, useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import { useStoredTab } from "../../lib/useStoredTab.js";
import { loadInsightsData } from "../../data/insights.js";
import InsightsOverview from "./InsightsOverview.jsx";
import InsightsBusiness from "./InsightsBusiness.jsx";
import InsightsMeta from "./InsightsMeta.jsx";
import InsightsWebsite from "./InsightsWebsite.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "business", label: "Business Insights" },
  { id: "meta", label: "Meta Analytics" },
  { id: "website", label: "Website Analytics" }
];

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "custom", label: "Custom range" }
];

export default function Insights() {
  const [tab, setTab] = useStoredTab("innov8-dashboard-tab-insights", "overview");
  const [range, setRange] = useState("30d");
  const [compare, setCompare] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadInsightsData()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((err) => {
        console.error("[insights] failed to load", err);
        if (active) setError(err.message || "Check your connection and try reloading.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  return (
    <>
      <Topbar title="Insights" subtitle="Studio performance & intelligence" />

      <div className="work-toolbar-row">
        <div className="work-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={`work-tab${tab === t.id ? " is-active" : ""}`} type="button" onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="insights-toolbar">
          <select className="input dash-period-select" aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)}>
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select className="input dash-period-select" aria-label="Compare" value={compare ? "on" : "off"} onChange={(e) => setCompare(e.target.value === "on")}>
            <option value="on">Compare: Previous period</option>
            <option value="off">Compare: Off</option>
          </select>
          <button className="btn" type="button" onClick={() => setReloadKey((k) => k + 1)} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" />
              <path d="M20 4v4.5h-4.5" />
              <path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" />
              <path d="M4 20v-4.5h4.5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="panel" style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
          Loading Insights…
        </div>
      ) : error ? (
        <div className="panel" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <div className="empty-state">
            <strong>Couldn't load Insights</strong>
            <span>{error}</span>
          </div>
        </div>
      ) : tab === "overview" ? (
        <InsightsOverview data={data} />
      ) : tab === "business" ? (
        <InsightsBusiness data={data} />
      ) : tab === "meta" ? (
        <InsightsMeta />
      ) : (
        <InsightsWebsite data={data} />
      )}
    </>
  );
}
