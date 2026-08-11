import PropTypes from "prop-types";

const LineChart = ({ data, valueKey, label, color = "#0b9aa7", unit = "" }) => {
  if (!data?.length) return <div className="chart-empty">Datos no disponibles.</div>;

  const values = data.map((item) => Number(item[valueKey]) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 92 - ((value - min) / range) * 78;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <figure className="result-chart">
      <figcaption>{label}</figcaption>
      <div className="chart-scale"><span>{max.toFixed(1)} {unit}</span><span>{min.toFixed(1)} {unit}</span></div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`fill-${valueKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill={`url(#fill-${valueKey})`} />
        <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </figure>
  );
};

LineChart.propTypes = {
  data: PropTypes.array,
  valueKey: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  color: PropTypes.string,
  unit: PropTypes.string,
};

export default LineChart;
