/*
 * Innov8 Studios — small building blocks shared by every Insights tab,
 * so KPI cards / metric-switcher charts / stepped funnels / severity
 * list items / horizontal source bars only exist once. Reuses
 * BarChart/LineChart (src/components/) and the existing .mkt-funnel*
 * bar-breakdown CSS (Marketing/CampaignDetail.jsx) rather than building
 * new chart or bar primitives.
 */
import BarChart from "../../components/BarChart.jsx";
import LineChart from "../../components/LineChart.jsx";

export function KpiCard({ value, label, sub, trend }) {
  return (
    <div className="panel insights-kpi-card">
      <strong>{value}</strong>
      <span className="insights-kpi-label">{label}</span>
      {trend !== undefined && <span className={`dash-stat-trend is-${String(trend).startsWith("-") ? "down" : "up"}`}>{trend ?? "—"}</span>}
      {sub && <span className="insights-kpi-sub">{sub}</span>}
    </div>
  );
}

export function KpiRow({ children }) {
  return <div className="insights-kpi-row">{children}</div>;
}

export function MetricSwitcherChart({ title, metrics, activeMetric, onChange, series, kind = "line", labels, formatValue, right }) {
  return (
    <div className="panel insights-section-gap">
      <div className="panel-header">
        <h2>{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          {right}
          <div className="insights-metric-switch">
            {metrics.map((m) => (
              <button key={m.key} type="button" className={`insights-metric-btn${activeMetric === m.key ? " is-active" : ""}`} onClick={() => onChange(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "0 var(--space-5) var(--space-5)" }}>
        {kind === "bar" ? (
          <BarChart values={series} labels={labels} height={220} width={860} gridLines formatValue={formatValue} />
        ) : (
          <LineChart series={series} height={220} width={860} gridLines />
        )}
      </div>
    </div>
  );
}

export function FunnelSteps({ steps }) {
  const items = [];
  steps.forEach((s, i) => {
    items.push(
      <div className="insights-funnel-step" key={`step-${i}`}>
        <strong>{s.value}</strong>
        <span>{s.label}</span>
      </div>
    );
    if (i < steps.length - 1) {
      items.push(
        <div className="insights-funnel-arrow" key={`arrow-${i}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </div>
      );
    }
  });
  return <div className="insights-funnel-steps">{items}</div>;
}

export function SourceBars({ rows, labelKey = "label", valueKey = "value", note }) {
  const max = Math.max(...rows.map((r) => r[valueKey]), 1);
  return (
    <div className="mkt-funnel">
      {rows.map((r) => (
        <div className="mkt-funnel-row" key={r[labelKey]}>
          <span className="mkt-funnel-label">{r[labelKey]}</span>
          <div className="mkt-funnel-track">
            <div className="mkt-funnel-bar" style={{ width: `${Math.round((r[valueKey] / max) * 100)}%` }} />
          </div>
          <span className="mkt-funnel-value">
            {r[valueKey]}
            {note && <em> {note(r)}</em>}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AttentionItem({ severity = "warning", text, onClick }) {
  if (onClick) {
    return (
      <button type="button" className="insights-attention-item" onClick={onClick}>
        <span className={`insights-attention-dot is-${severity}`} />
        <span>{text}</span>
      </button>
    );
  }
  return (
    <div className="insights-attention-item">
      <span className={`insights-attention-dot is-${severity}`} />
      <span>{text}</span>
    </div>
  );
}

export function InsightSummary({ children }) {
  return (
    <div className="panel mkt-insight-summary insights-section-gap">
      <span className="mkt-insight-summary-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v3" />
          <path d="M12 18v3" />
          <circle cx="12" cy="12" r="6.5" />
          <path d="M12 9v3l2 2" />
        </svg>
      </span>
      <p>{children}</p>
    </div>
  );
}

export function money(value, currency = "KES") {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1000) return `${currency} ${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K`;
  return `${currency} ${Math.round(value).toLocaleString("en-KE")}`;
}

export function compact(value) {
  if (value === null || value === undefined) return "—";
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
