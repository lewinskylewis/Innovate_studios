/*
 * Innov8 Studios — small sparkline-style line chart, ported from
 * legacy/home.js's lineChartSVG(). Pure presentation; used by Home's
 * income hero and Website Analytics panels.
 */
let chartIdCounter = 0;

export default function LineChart({ series, height = 80, width = 320, gridLines = false }) {
  chartIdCounter += 1;
  const gradientId = `chart-fill-${chartIdCounter}`;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const range = max - min || 1;
  const stepX = width / (series.length - 1);
  const points = series.map((value, i) => {
    const x = i * stepX;
    const y = height - ((value - min) / range) * (height * 0.75) - height * 0.12;
    return [x, y];
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const fillPath = `${linePath} L${width},${height} L0,${height} Z`;
  const [lastX, lastY] = points[points.length - 1];

  return (
    <svg className="dash-line-chart" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--orange)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--orange)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridLines &&
        [0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" y1={(height * f).toFixed(1)} x2={width} y2={(height * f).toFixed(1)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 4" />
        ))}
      <path className="chart-fill" d={fillPath} fill={`url(#${gradientId})`} stroke="none" />
      <path className="chart-line" d={linePath} fill="none" stroke="var(--orange-bright)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="chart-dot" cx={lastX} cy={lastY} r="4" fill="var(--orange-bright)" />
    </svg>
  );
}
