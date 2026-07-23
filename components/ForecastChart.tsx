"use client";

type ForecastChartProps = {
  observed: number[];
  forecast: number[];
  low: number[];
  high: number[];
  labels: string[];
  adjustment?: number;
  points?: number;
};

const W = 900;
const H = 360;
const PAD = { top: 20, right: 28, bottom: 42, left: 50 };

function pathFor(values: number[], min: number, max: number) {
  const width = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom;
  return values
    .map((value, index) => {
      const x = PAD.left + (index / Math.max(values.length - 1, 1)) * width;
      const y = PAD.top + ((max - value) / Math.max(max - min, 1)) * height;
      return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function areaFor(low: number[], high: number[], min: number, max: number) {
  const width = W - PAD.left - PAD.right;
  const height = H - PAD.top - PAD.bottom;
  const top = high.map((value, index) => {
    const x = PAD.left + (index / Math.max(high.length - 1, 1)) * width;
    const y = PAD.top + ((max - value) / Math.max(max - min, 1)) * height;
    return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  const bottom = low
    .map((value, index) => {
      const x = PAD.left + (index / Math.max(low.length - 1, 1)) * width;
      const y = PAD.top + ((max - value) / Math.max(max - min, 1)) * height;
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .reverse();
  return [...top, ...bottom, "Z"].join(" ");
}

export function ForecastChart({
  observed,
  forecast,
  low,
  high,
  labels,
  adjustment = 0,
  points = 36,
}: ForecastChartProps) {
  const start = Math.max(0, forecast.length - points);
  const visibleObserved = observed.slice(Math.min(start, observed.length));
  const visibleForecast = forecast.slice(start).map((value, index) => {
    const projectionIndex = start + index - observed.length + 1;
    return projectionIndex > 0 ? value + adjustment * projectionIndex : value;
  });
  const visibleLow = low.slice(start).map((value, index) => {
    const projectionIndex = start + index - observed.length + 1;
    return projectionIndex > 0 ? value + adjustment * projectionIndex : value;
  });
  const visibleHigh = high.slice(start).map((value, index) => {
    const projectionIndex = start + index - observed.length + 1;
    return projectionIndex > 0 ? value + adjustment * projectionIndex : value;
  });
  const visibleLabels = labels.slice(start);
  const all = [...visibleLow, ...visibleHigh, ...visibleObserved];
  const min = Math.floor(Math.min(...all) / 5) * 5 - 2;
  const max = Math.ceil(Math.max(...all) / 5) * 5 + 2;
  const forecastStart = Math.max(0, visibleObserved.length - 1);
  const projectedOnly = visibleForecast.slice(forecastStart);
  const gridValues = Array.from({ length: 5 }, (_, index) =>
    Math.round(max - ((max - min) / 4) * index),
  );

  return (
    <div className="chart-shell">
      <svg
        className="forecast-chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="forecast-title forecast-desc"
      >
        <title id="forecast-title">WTI crude oil forecast with uncertainty range</title>
        <desc id="forecast-desc">
          Observed WTI prices transition into an ensemble forecast. A shaded band
          represents the calibrated prediction interval.
        </desc>
        <defs>
          <linearGradient id="forecast-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#59a8ff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#59a8ff" stopOpacity="0.03" />
          </linearGradient>
          <filter id="line-shadow" x="-10%" y="-20%" width="120%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#020814" floodOpacity=".55" />
          </filter>
        </defs>

        {gridValues.map((value, index) => {
          const y = PAD.top + (index / 4) * (H - PAD.top - PAD.bottom);
          return (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                className="chart-gridline"
              />
              <text x={PAD.left - 12} y={y + 4} textAnchor="end" className="axis-label">
                ${value}
              </text>
            </g>
          );
        })}

        <path
          d={areaFor(visibleLow, visibleHigh, min, max)}
          fill="url(#forecast-band)"
          className="forecast-band"
        />
        <path
          d={pathFor(visibleForecast, min, max)}
          className="series-line series-line--forecast"
          filter="url(#line-shadow)"
        />
        <path
          d={pathFor(visibleObserved, min, max)}
          className="series-line series-line--observed"
        />

        {forecastStart > 0 && (
          <line
            x1={PAD.left + (forecastStart / Math.max(visibleForecast.length - 1, 1)) * (W - PAD.left - PAD.right)}
            x2={PAD.left + (forecastStart / Math.max(visibleForecast.length - 1, 1)) * (W - PAD.left - PAD.right)}
            y1={PAD.top}
            y2={H - PAD.bottom}
            className="now-marker"
          />
        )}

        {visibleLabels.map((label, index) =>
          label ? (
            <text
              key={`${label}-${index}`}
              x={PAD.left + (index / Math.max(visibleLabels.length - 1, 1)) * (W - PAD.left - PAD.right)}
              y={H - 14}
              textAnchor="middle"
              className="axis-label"
            >
              {label}
            </text>
          ) : null,
        )}

        <circle
          cx={W - PAD.right}
          cy={
            PAD.top +
            ((max - projectedOnly[projectedOnly.length - 1]) / Math.max(max - min, 1)) *
              (H - PAD.top - PAD.bottom)
          }
          r="5"
          className="forecast-endpoint"
        />
      </svg>
    </div>
  );
}
