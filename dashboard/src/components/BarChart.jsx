/*
 * Innov8 Studios — small bar chart, matching LineChart.jsx's
 * conventions (self-contained SVG, same color tokens). Used by Home's
 * income hero to break the headline Budget total down by week of the
 * current month.
 */
export default function BarChart({ values, labels, height = 80, width = 320 }) {
  const max = Math.max(...values, 1);
  const count = values.length;
  const gap = width * 0.08;
  const barWidth = (width - gap * (count - 1)) / count;
  const labelHeight = labels ? 14 : 0;
  const plotHeight = height - labelHeight;

  return (
    <svg className="dash-bar-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bar-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--orange-bright)" />
          <stop offset="100%" stopColor="var(--orange)" />
        </linearGradient>
      </defs>
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
