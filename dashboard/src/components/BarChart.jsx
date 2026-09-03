/*
 * Innov8 Studios — small bar chart, matching LineChart.jsx's
 * conventions (self-contained SVG, same color tokens, same dashed
 * `gridLines` treatment). Used by Home's income hero to break the
 * headline Budget total down by week of the current month.
 *
 * `gridLines` additionally draws right-aligned axis value labels (off
 * by default, opt-in via `formatValue`) — purely a presentation layer
 * over the same `values` the bars already plot; it introduces no new
 * data or computation.
 */
export default function BarChart({ values, labels, height = 80, width = 320, gridLines = false, formatValue }) {
  const max = Math.max(...values, 1);
  const count = values.length;
  const labelHeight = labels ? 14 : 0;
  const axisWidth = gridLines && formatValue ? width * 0.24 : 0;
  const plotWidth = width - axisWidth;
  const gap = plotWidth * 0.08;
  const barWidth = (plotWidth - gap * (count - 1)) / count;
  const plotHeight = height - labelHeight;
  const gridSteps = [0, 1 / 3, 2 / 3, 1];

  return (
    <svg className="dash-bar-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bar-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--orange-bright)" />
          <stop offset="100%" stopColor="var(--orange)" />
        </linearGradient>
      </defs>
      {gridLines &&
        gridSteps.map((f) => {
          const y = (plotHeight * (1 - f)).toFixed(1);
          return <line key={f} x1="0" y1={y} x2={plotWidth} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />;
        })}
      {gridLines &&
        formatValue &&
        gridSteps.map((f) => (
          <text key={f} x={width} y={(plotHeight * (1 - f) + 3).toFixed(1)} textAnchor="end" fontSize="9" fill="var(--faint)">
            {formatValue(max * f)}
          </text>
        ))}
      {values.map((value, i) => {
        const barHeight = Math.max(2, (value / max) * (plotHeight * 0.85));
        const x = i * (barWidth + gap);
        const y = plotHeight - barHeight;
        return <rect key={i} x={x.toFixed(1)} y={y.toFixed(1)} width={barWidth.toFixed(1)} height={barHeight.toFixed(1)} rx="3" fill="url(#bar-chart-fill)" />;
      })}
      {labels &&
        labels.map((label, i) => {
          const x = i * (barWidth + gap) + barWidth / 2;
          return (
            <text key={label} x={x.toFixed(1)} y={height - 2} textAnchor="middle" fontSize="9" fill="var(--faint)">
              {label}
            </text>
          );
        })}
    </svg>
  );
}
