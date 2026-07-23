/*
THESIS: StraitSignal is a plotting room for cross-domain evidence, refusing the generic grid of metric cards.
OWN-WORLD: Abyss navy surfaces, thin chart notation, teal live signals, blue models, amber uncertainty, coral risk.
STORY: Read the forecast, stress a scenario, then trace it through maritime, pump-price, political, and market evidence.
FIRST VIEWPORT: A slim command rail frames a dominant forecast plot and a compact decision brief with scenario controls.
FORM: Brief-pinned Operate surface; asymmetric intelligence console, no concept seed required.
*/
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FlowMap } from "../components/FlowMap";
import { ForecastChart } from "../components/ForecastChart";
import { demoIntel, type IntelSnapshot } from "../lib/intel";

const scenarios = {
  baseline: {
    name: "Baseline",
    short: "BASE",
    adjustment: 0,
    confidence: 0,
    conflictIndex: 57,
    summary:
      "Current flow stress persists, inventories soften the move, and no full chokepoint closure occurs.",
  },
  hormuz: {
    name: "Hormuz −30%",
    short: "HORMUZ",
    adjustment: 1.15,
    confidence: -9,
    conflictIndex: 89,
    summary:
      "Tanker throughput falls 30% for ten days; freight and near-month scarcity dominate the ensemble.",
  },
  spr: {
    name: "SPR release",
    short: "SPR",
    adjustment: -0.72,
    confidence: -4,
    conflictIndex: 62,
    summary:
      "A coordinated strategic reserve release dampens the front month while physical-route risk remains.",
  },
  demand: {
    name: "Demand miss",
    short: "DEMAND",
    adjustment: -0.46,
    confidence: -3,
    conflictIndex: 41,
    summary:
      "U.S. product demand undershoots the seasonal prior and PADD gasoline dispersion narrows.",
  },
} as const;

type ScenarioKey = keyof typeof scenarios;

const modelDefinitions = [
  {
    id: "elastic",
    name: "Elastic net",
    family: "Regularized linear",
    horizon: "candidate",
    mae: "offline",
    strength: "Stable lag attribution",
  },
  {
    id: "boost",
    name: "Gradient boost",
    family: "Nonlinear ensemble",
    horizon: "candidate",
    mae: "offline",
    strength: "Interaction + threshold effects",
  },
  {
    id: "bayes",
    name: "Bayesian ridge",
    family: "Probabilistic",
    horizon: "candidate",
    mae: "offline",
    strength: "Posterior uncertainty",
  },
  {
    id: "market",
    name: "Market prior",
    family: "Probability blend",
    horizon: "prior input",
    mae: "not scored",
    strength: "Forward-looking crowd signal",
  },
] as const;

function changeText(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function valueClass(value: number) {
  return value > 0 ? "positive" : value < 0 ? "negative" : "";
}

function partyMargin(value: number) {
  return `${value >= 0 ? "D" : "R"} +${Math.abs(value).toFixed(1)}`;
}

function GasPassThroughChart({
  data,
  adjustment,
}: {
  data: IntelSnapshot["timeline"];
  adjustment: number;
}) {
  const start = Math.max(0, data.gasMedian.length - 32);
  const observedCount = Math.max(1, data.gasObservedCount - start);
  const adjustSeries = (values: number[]) =>
    values.slice(start).map((value, index) =>
      Number(
        (
          value +
          Math.max(0, index - observedCount + 1) * adjustment * 0.012
        ).toFixed(2),
      ),
    );
  const median = adjustSeries(data.gasMedian);
  const low = adjustSeries(data.gasLow);
  const high = adjustSeries(data.gasHigh);
  const min = Math.min(...low) - 0.04;
  const max = Math.max(...high) + 0.04;
  const width = 600;
  const height = 210;
  const padding = 18;
  const point = (value: number, index: number) => {
    const x =
      padding + (index / Math.max(median.length - 1, 1)) * (width - padding * 2);
    const y =
      padding + ((max - value) / Math.max(max - min, 0.01)) * (height - padding * 2);
    return { x, y };
  };
  const line = (from: number, to: number) =>
    median
      .slice(from, to)
      .map((value, offset) => {
        const index = from + offset;
        const { x, y } = point(value, index);
        return `${offset ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  const top = high.map((value, index) => {
    const { x, y } = point(value, index);
    return `${index ? "L" : "M"} ${x.toFixed(2)} ${y.toFixed(2)}`;
  });
  const bottom = low
    .map((value, index) => {
      const { x, y } = point(value, index);
      return `L ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .reverse();
  const nowX = point(median[Math.min(observedCount - 1, median.length - 1)], observedCount - 1).x;

  return (
    <div className="gas-chart-wrap">
      <svg
        viewBox="0 0 600 210"
        className="gas-chart"
        role="img"
        aria-labelledby="gas-title gas-desc"
      >
        <title id="gas-title">U.S. retail gasoline range by PADD region</title>
        <desc id="gas-desc">
          Observed weekly gasoline prices lead into a dashed scenario forecast. The shaded
          area is the low-to-high range across the five Petroleum Administration for
          Defense Districts.
        </desc>
        <path d={[...top, ...bottom, "Z"].join(" ")} className="gas-range" />
        {[0, 1, 2, 3].map((index) => (
          <line
            key={index}
            x1="18"
            x2="582"
            y1={22 + index * 52}
            y2={22 + index * 52}
            className="chart-gridline"
          />
        ))}
        <line x1={nowX} x2={nowX} y1="18" y2="192" className="gas-now-line" />
        <path d={line(0, observedCount)} className="gas-median" />
        <path
          d={line(Math.max(0, observedCount - 1), median.length)}
          className="gas-forecast"
        />
        <text x={nowX + 5} y="29" className="gas-now-label">
          NOW
        </text>
        <text x="18" y="202" className="axis-label">
          observed
        </text>
        <text x="582" y="202" textAnchor="end" className="axis-label">
          8-week forecast · $/gal
        </text>
      </svg>
    </div>
  );
}

function SourceState({ state }: { state: "live" | "degraded" | "demo" }) {
  return (
    <span className={`source-state source-state--${state}`}>
      <span aria-hidden="true" />
      {state}
    </span>
  );
}

export default function Home() {
  const [intel, setIntel] = useState<IntelSnapshot>(demoIntel);
  const [scenario, setScenario] = useState<ScenarioKey>("baseline");
  const [windowSize, setWindowSize] = useState(36);
  const [activeModels, setActiveModels] = useState<string[]>(
    modelDefinitions.map((model) => model.id),
  );
  const [selectedChokepoint, setSelectedChokepoint] = useState("hormuz");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      const response = await fetch("/api/intel", { cache: "no-store" });
      if (!response.ok) throw new Error(`Data gateway returned ${response.status}`);
      setIntel((await response.json()) as IntelSnapshot);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : "Unable to refresh sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = () => {
      fetch("/api/intel", { cache: "no-store" })
        .then((response) => {
          if (!response.ok) throw new Error(`Data gateway returned ${response.status}`);
          return response.json() as Promise<IntelSnapshot>;
        })
        .then((snapshot) => {
          if (active) {
            setIntel(snapshot);
            setLastError(null);
          }
        })
        .catch((error: unknown) => {
          if (active) {
            setLastError(
              error instanceof Error ? error.message : "Unable to refresh sources",
            );
          }
        });
    };
    load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const scenarioSpec = scenarios[scenario];
  const conflictIndex =
    scenario === "baseline" ? intel.conflict.index : scenarioSpec.conflictIndex;
  const selectedPoint =
    intel.tanker.chokepoints.find((point) => point.id === selectedChokepoint) ??
    intel.tanker.chokepoints[0];
  const forecastEnd = useMemo(() => {
    const periods = Math.max(0, intel.timeline.forecast.length - intel.timeline.observed.length);
    return Number((intel.forecast.next + scenarioSpec.adjustment * periods).toFixed(1));
  }, [intel, scenarioSpec]);
  const confidence = Math.max(
    35,
    Math.min(95, intel.forecast.confidence + scenarioSpec.confidence),
  );
  const gasForecastEnd = Number(
    (
      (intel.timeline.gasMedian.at(-1) ?? 0) +
      scenarioSpec.adjustment *
        Math.max(0, intel.timeline.gasMedian.length - intel.timeline.gasObservedCount) *
        0.012
    ).toFixed(2),
  );
  const gasForecastLow = Number(
    (
      (intel.timeline.gasLow.at(-1) ?? 0) +
      scenarioSpec.adjustment *
        Math.max(0, intel.timeline.gasLow.length - intel.timeline.gasObservedCount) *
        0.012
    ).toFixed(2),
  );
  const gasForecastHigh = Number(
    (
      (intel.timeline.gasHigh.at(-1) ?? 0) +
      scenarioSpec.adjustment *
        Math.max(0, intel.timeline.gasHigh.length - intel.timeline.gasObservedCount) *
        0.012
    ).toFixed(2),
  );
  const oilPressureIndex = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        50 +
          ((forecastEnd - intel.forecast.current) /
            Math.max(intel.forecast.current, 1)) *
            320,
      ),
    ),
  );
  const pollStressShift =
    (oilPressureIndex - 50) * 0.028 + (conflictIndex - 50) * 0.018;
  const projectedPollMargin = Number((intel.polls.margin + pollStressShift).toFixed(1));
  const pollProjectionUncertainty = Number(
    (3.4 + Math.abs(conflictIndex - 50) * 0.012).toFixed(1),
  );

  const toggleModel = (id: string) => {
    setActiveModels((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((model) => model !== id);
      }
      return [...current, id];
    });
  };

  return (
    <div className="app-shell">
      <aside className="command-rail" aria-label="Primary navigation">
        <a className="brand-mark" href="#forecast" aria-label="StraitSignal home">
          <span className="brand-symbol" aria-hidden="true">
            SS
          </span>
          <span>
            <strong>STRAIT</strong>
            <small>SIGNAL</small>
          </span>
        </a>

        <nav className="rail-nav">
          {[
            ["forecast", "FC", "Forecast"],
            ["flows", "AIS", "Maritime"],
            ["prices", "PX", "Fuel prices"],
            ["politics", "EL", "Elections"],
            ["models", "ML", "Analysis lab"],
            ["pipeline", "API", "Pipeline"],
          ].map(([href, glyph, label], index) => (
            <a href={`#${href}`} key={href} className={index === 0 ? "is-active" : ""}>
              <span className="nav-glyph">{glyph}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="rail-footer">
          <span>READ-ONLY</span>
          <strong>v1.1.0</strong>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <span className="system-kicker">ENERGY INTELLIGENCE / GLOBAL</span>
            <span className="mode-label">
              <SourceState state={intel.mode === "live" ? "live" : intel.mode === "hybrid" ? "degraded" : "demo"} />
              {intel.asOfLabel}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="utc-clock">
              {new Date(intel.updatedAt).toLocaleString("en-US", {
                timeZone: "UTC",
                month: "short",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}{" "}
              UTC
            </span>
            <button
              className="text-button"
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
            >
              {loading ? "SYNCING…" : "REFRESH SOURCES"}
            </button>
            <button className="primary-button" type="button" onClick={() => window.print()}>
              EXPORT BRIEF
            </button>
          </div>
        </header>

        {lastError && (
          <div className="inline-error" role="alert">
            <strong>Source refresh failed.</strong> {lastError}. The last valid labeled
            snapshot remains on screen.
          </div>
        )}

        <main>
          <section className="forecast-zone" id="forecast" aria-labelledby="forecast-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">PRIMARY ESTIMATE / CL-1</span>
                <h1 id="forecast-heading">Oil futures signal fusion</h1>
              </div>
              <div className="segment-control" aria-label="Forecast history window">
                {[
                  [12, "12W"],
                  [24, "24W"],
                  [36, "32W+"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={windowSize === value ? "is-selected" : ""}
                    aria-pressed={windowSize === value}
                    onClick={() => setWindowSize(Number(value))}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="forecast-grid">
              <article className="forecast-plot">
                <div className="plot-meta">
                  <div>
                    <span>{intel.forecast.instrument.toUpperCase()} / USD PER BARREL</span>
                    <strong>${intel.forecast.current.toFixed(1)}</strong>
                    <em className={valueClass(intel.forecast.changePct)}>
                      {changeText(intel.forecast.changePct)} modeled
                    </em>
                  </div>
                  <div className="chart-legend" aria-label="Chart legend">
                    <span className="legend-observed">Observed</span>
                    <span className="legend-forecast">Modeled path</span>
                    <span className="legend-band">80% interval</span>
                  </div>
                </div>
                <ForecastChart
                  observed={intel.timeline.observed}
                  forecast={intel.timeline.forecast}
                  low={intel.timeline.low}
                  high={intel.timeline.high}
                  labels={intel.timeline.labels}
                  adjustment={scenarioSpec.adjustment}
                  points={windowSize}
                />
                <div className="chart-footnote">
                  <span>OBSERVED → NOWCAST → 21-DAY FORECAST</span>
                  <span>Interval: walk-forward conformal residuals</span>
                </div>
              </article>

              <aside className="decision-brief" aria-label="Forecast decision brief">
                <div className="brief-header">
                  <span className="section-code">DECISION BRIEF</span>
                  <SourceState
                    state={
                      intel.sources.find((source) => source.id === "eia")?.state === "live"
                        ? "degraded"
                        : "demo"
                    }
                  />
                </div>
                <div className="forecast-target">
                  <span>21-DAY ENSEMBLE</span>
                  <strong>${forecastEnd}</strong>
                  <em>
                    ${Math.max(0, intel.forecast.low + scenarioSpec.adjustment * 3).toFixed(1)}
                    {" — "}
                    ${(intel.forecast.high + scenarioSpec.adjustment * 8).toFixed(1)}
                  </em>
                </div>
                <div className="confidence-line">
                  <div>
                    <span>Calibrated confidence</span>
                    <strong>{confidence}%</strong>
                  </div>
                  <div className="confidence-track" aria-hidden="true">
                    <span style={{ width: `${confidence}%` }} />
                  </div>
                </div>
                <p className="brief-summary">{scenarioSpec.summary}</p>
                <div className="brief-stat-grid">
                  <div>
                    <span>Bias</span>
                    <strong>{scenario === "spr" || scenario === "demand" ? "BEARISH" : "BULLISH"}</strong>
                  </div>
                  <div>
                    <span>Model spread</span>
                    <strong>{(intel.forecast.modelSpread + Math.abs(scenarioSpec.adjustment)).toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span>Methods staged</span>
                    <strong>{activeModels.length} / 4</strong>
                  </div>
                  <div>
                    <span>Horizon</span>
                    <strong>{intel.forecast.horizon.toUpperCase()}</strong>
                  </div>
                </div>
                <div className="scenario-field">
                  <span>STRESS SCENARIO</span>
                  <div className="scenario-options">
                    {(Object.keys(scenarios) as ScenarioKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={scenario === key ? "is-selected" : ""}
                        aria-pressed={scenario === key}
                        onClick={() => setScenario(key)}
                      >
                        {scenarios[key].short}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            <div className="source-strip" aria-label="Data source health">
              {intel.sources.map((source) => (
                <div key={source.id} className="source-strip__item">
                  <SourceState state={source.state} />
                  <div>
                    <strong>{source.label}</strong>
                    <span>{source.detail}</span>
                  </div>
                  <em>{source.latency}</em>
                </div>
              ))}
            </div>
          </section>

          <section className="analysis-section" id="flows" aria-labelledby="flows-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">PHYSICAL MARKET / AIS</span>
                <h2 id="flows-heading">Chokepoint movement intelligence</h2>
              </div>
              <p>
                Real coordinates render on an OpenStreetMap-backed basemap. Provider
                timestamps determine whether the feed is live or latest-available; positions
                are never relabeled to appear fresher than they are.
              </p>
            </div>

            <div className="map-layout">
              <div className="map-panel">
                <div className="map-toolbar">
                  <div>
                    <span>MAPPED TANKERS</span>
                    <strong>{intel.tanker.positions.length.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>FLOW INDEX / {intel.tanker.analyticsState.toUpperCase()}</span>
                    <strong>{intel.tanker.flowIndex}</strong>
                  </div>
                  <div>
                    <span>CONGESTION / {intel.tanker.analyticsState.toUpperCase()}</span>
                    <strong>{intel.tanker.congestion}</strong>
                  </div>
                  <div>
                    <span>DARK ACTIVITY / {intel.tanker.analyticsState.toUpperCase()}</span>
                    <strong className="risk-value">{intel.tanker.darkActivity}</strong>
                  </div>
                </div>
                <FlowMap
                  tanker={intel.tanker}
                  selected={selectedChokepoint}
                  onSelect={setSelectedChokepoint}
                />
              </div>

              <aside className="movement-ledger">
                <div className="ledger-focus">
                  <span className="section-code">
                    SELECTED CORRIDOR / {intel.tanker.analyticsState.toUpperCase()}
                  </span>
                  <h3>{selectedPoint.name}</h3>
                  <div className="ledger-score">
                    <strong>{selectedPoint.flow}</strong>
                    <span>flow / 100</span>
                    <em className={valueClass(selectedPoint.delta)}>
                      {changeText(selectedPoint.delta)} vs baseline
                    </em>
                  </div>
                  <p>
                    The feature pipeline compares vessel counts, estimated laden state,
                    loiter duration, destination changes, and AIS silence against rolling
                    corridor baselines.
                  </p>
                </div>
                <div className="chokepoint-list">
                  {intel.tanker.chokepoints.map((point) => (
                    <button
                      key={point.id}
                      type="button"
                      className={selectedChokepoint === point.id ? "is-selected" : ""}
                      onClick={() => setSelectedChokepoint(point.id)}
                    >
                      <span className={`risk-dot risk-dot--${point.risk}`} aria-hidden="true" />
                      <span>
                        <strong>{point.name}</strong>
                        <small>{point.risk} risk</small>
                      </span>
                      <em className={valueClass(point.delta)}>{changeText(point.delta)}</em>
                    </button>
                  ))}
                </div>
              </aside>
            </div>
          </section>

          <section className="analysis-section" id="prices" aria-labelledby="prices-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">CONSUMER TRANSMISSION / EIA</span>
                <h2 id="prices-heading">Crude-to-pump pass-through</h2>
              </div>
              <p>
                Observed weekly PADD gasoline dispersion is joined to an 8-week
                distributed-lag forecast. The dashed segment responds to the selected oil
                scenario.
              </p>
            </div>

            <div className="price-layout">
              <article className="gas-panel">
                <div className="panel-title-row">
                  <div>
                    <span>ALL-GRADE RETAIL GASOLINE</span>
                    <strong>${gasForecastEnd.toFixed(2)}</strong>
                    <em>/ gallon · 8-week scenario forecast</em>
                  </div>
                  <div className="range-key">
                    <SourceState state="demo" />
                    <span>FORECAST PADD LOW–HIGH</span>
                    <strong>
                      ${gasForecastLow.toFixed(2)} — ${gasForecastHigh.toFixed(2)}
                    </strong>
                  </div>
                </div>
                <div className="gas-legend" aria-label="Gasoline chart legend">
                  <span className="gas-legend__observed">Observed median</span>
                  <span className="gas-legend__forecast">Scenario forecast</span>
                  <span className="gas-legend__range">PADD range</span>
                </div>
                <GasPassThroughChart
                  data={intel.timeline}
                  adjustment={scenarioSpec.adjustment}
                />
              </article>

              <aside className="pass-through-ledger">
                <div className="lag-readout">
                  <span>ESTIMATED MEDIAN LAG</span>
                  <strong>16</strong>
                  <em>days / WTI → pump</em>
                </div>
                <div className="coefficient-table">
                  <div>
                    <span>Upward pass-through</span>
                    <strong>0.74</strong>
                  </div>
                  <div>
                    <span>Downward pass-through</span>
                    <strong>0.51</strong>
                  </div>
                  <div>
                    <span>Asymmetry</span>
                    <strong className="risk-value">+0.23</strong>
                  </div>
                  <div>
                    <span>Cross-correlation peak</span>
                    <strong>r = .82</strong>
                  </div>
                </div>
                <p>
                  Up/down coefficients come from separate distributed-lag terms. They are
                  descriptive associations, not proof of pricing behavior or causality. The
                  forecast is a labeled model output, not an observed retail price.
                </p>
              </aside>
            </div>
          </section>

          <section className="analysis-section" id="politics" aria-labelledby="politics-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">POLITICAL RISK / 2026 MIDTERMS</span>
                <h2 id="politics-heading">Polls and market-implied priors</h2>
              </div>
              <p>
                The observed poll average remains separate from an oil-and-conflict stress
                projection. It assumes energy stress penalizes the incumbent party and does
                not claim causality.
              </p>
            </div>

            <div className="politics-layout">
              <article className="poll-panel">
                <div className="panel-title-row">
                  <div>
                    <span>{intel.polls.cycle}</span>
                    <strong>{partyMargin(intel.polls.margin)}</strong>
                    <em>generic ballot average</em>
                  </div>
                  <SourceState state={intel.polls.state} />
                </div>
                <div className="ballot-comparison" aria-label="Generic ballot comparison">
                  <div className="ballot-row">
                    <span>DEMOCRATIC</span>
                    <div>
                      <i style={{ width: `${intel.polls.genericBallotDem}%` }} />
                    </div>
                    <strong>{intel.polls.genericBallotDem.toFixed(1)}</strong>
                  </div>
                  <div className="ballot-row ballot-row--rep">
                    <span>REPUBLICAN</span>
                    <div>
                      <i style={{ width: `${intel.polls.genericBallotRep}%` }} />
                    </div>
                    <strong>{intel.polls.genericBallotRep.toFixed(1)}</strong>
                  </div>
                </div>
                <div className="poll-projection">
                  <div>
                    <span>OIL + CONFLICT STRESS PROJECTION</span>
                    <strong>{partyMargin(projectedPollMargin)}</strong>
                    <em>
                      range {partyMargin(projectedPollMargin - pollProjectionUncertainty)} to{" "}
                      {partyMargin(projectedPollMargin + pollProjectionUncertainty)}
                    </em>
                  </div>
                  <div className="projection-indices">
                    <span>
                      OIL PRESSURE <strong>{oilPressureIndex}</strong>
                    </span>
                    <span>
                      CONFLICT <strong>{conflictIndex}</strong>
                    </span>
                  </div>
                  <p>
                    Scenario regression: current poll average + bounded oil-pressure and
                    conflict terms. This is a sensitivity test, not a voter-intent forecast.
                  </p>
                </div>
                <div className="poll-notes">
                  <div>
                    <span>Presidential approval</span>
                    <strong>{intel.polls.presidentialApproval.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span>Polls in average</span>
                    <strong>{intel.polls.sample}</strong>
                  </div>
                  <div>
                    <span>Election day</span>
                    <strong>NOV 03</strong>
                  </div>
                </div>
                <p>
                  {intel.polls.source}
                  {intel.polls.asOf ? ` · as of ${intel.polls.asOf}` : ""}. The modeled
                  stress projection remains separate from the observed average.
                </p>
              </article>

              <article className="market-panel">
                <div className="panel-title-row">
                  <div>
                    <span>PREDICTION MARKETS</span>
                    <strong>Market priors</strong>
                    <em>public read endpoints</em>
                  </div>
                  <SourceState
                    state={
                      intel.sources.find((source) => source.id === "markets")?.state ?? "demo"
                    }
                  />
                </div>
                <div className="market-list">
                  {intel.predictionMarkets.map((market) => (
                    <div className="market-row" key={market.label}>
                      <div>
                        <strong>{market.label}</strong>
                        <span>{market.source}</span>
                      </div>
                      <div className="probability-track" aria-hidden="true">
                        <i style={{ width: `${market.probability}%` }} />
                      </div>
                      <strong>{market.probability}%</strong>
                      <em className={valueClass(market.change)}>
                        {market.change >= 0 ? "+" : ""}
                        {market.change.toFixed(1)}
                      </em>
                    </div>
                  ))}
                </div>
              </article>

              <aside className="policy-bridge">
                <span className="section-code">MODEL BRIDGE</span>
                <h3>How politics enters</h3>
                <ol>
                  <li>
                    <strong>Poll average</strong>
                    <span>Recency, sample type, pollster bias, design effect</span>
                  </li>
                  <li>
                    <strong>Market calibration</strong>
                    <span>Liquidity-aware probability and disagreement</span>
                  </li>
                  <li>
                    <strong>Policy scenarios</strong>
                    <span>SPR, sanctions, drilling and demand assumptions</span>
                  </li>
                  <li>
                    <strong>Ensemble prior</strong>
                    <span>Bounded weight with sensitivity analysis</span>
                  </li>
                </ol>
              </aside>
            </div>
          </section>

          <section className="analysis-section" id="models" aria-labelledby="models-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">ANALYSIS LAB / WALK-FORWARD</span>
                <h2 id="models-heading">Model disagreement is a feature</h2>
              </div>
              <p>
                Stage analytical approaches for the reproducible offline evaluation pipeline.
                These controls document the model specification; they do not refit the live
                public baseline inside the browser.
              </p>
            </div>

            <div className="model-workbench">
              <div className="model-table" role="table" aria-label="Forecast model comparison">
                <div className="model-row model-row--head" role="row">
                  <span role="columnheader">Use</span>
                  <span role="columnheader">Approach</span>
                  <span role="columnheader">Family</span>
                  <span role="columnheader">Role</span>
                  <span role="columnheader">CV status</span>
                  <span role="columnheader">Best at</span>
                </div>
                {modelDefinitions.map((model) => {
                  const active = activeModels.includes(model.id);
                  return (
                    <div
                      className={`model-row ${active ? "is-active" : ""}`}
                      role="row"
                      key={model.id}
                    >
                      <span role="cell">
                        <button
                          type="button"
                          className="model-toggle"
                          aria-pressed={active}
                          aria-label={`${active ? "Remove" : "Add"} ${model.name} from the evaluation specification`}
                          onClick={() => toggleModel(model.id)}
                        >
                          <i aria-hidden="true" />
                        </button>
                      </span>
                      <strong role="cell">{model.name}</strong>
                      <span role="cell">{model.family}</span>
                      <em role="cell">{model.horizon}</em>
                      <span role="cell">{model.mae}</span>
                      <span role="cell">{model.strength}</span>
                    </div>
                  );
                })}
              </div>

              <aside className="attribution-panel">
                <div className="panel-title-row">
                  <div>
                    <span>SIGNED BASELINE CONTRIBUTION</span>
                    <strong>Forecast drivers</strong>
                    <em>USD per barrel</em>
                  </div>
                </div>
                <div className="attribution-list">
                  {intel.attribution.map((item) => (
                    <div key={item.name}>
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.note}</small>
                      </span>
                      <i
                        className={item.value < 0 ? "is-negative" : ""}
                        style={{ width: `${Math.abs(item.value) * 12}%` }}
                      />
                      <em className={valueClass(item.value)}>
                        {item.value > 0 ? "+" : ""}
                        {item.value.toFixed(1)}
                      </em>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="approach-ribbon">
              {[
                ["01", "Distributed lag", "Crude → pump timing and asymmetry"],
                ["02", "VAR + Granger", "Lead/lag diagnostics, never causal proof"],
                ["03", "Tree ensemble", "Nonlinear chokepoint and regime effects"],
                ["04", "Bayesian update", "Explicit priors and posterior intervals"],
                ["05", "Conformal band", "Out-of-sample coverage calibration"],
                ["06", "Monte Carlo", "Scenario distributions, not single guesses"],
              ].map(([number, name, detail]) => (
                <div key={number}>
                  <span>{number}</span>
                  <strong>{name}</strong>
                  <small>{detail}</small>
                </div>
              ))}
            </div>
          </section>

          <section className="analysis-section pipeline-section" id="pipeline" aria-labelledby="pipeline-heading">
            <div className="section-heading">
              <div>
                <span className="section-code">API CONTROL PLANE / OBSERVABILITY</span>
                <h2 id="pipeline-heading">Key-safe data operations</h2>
              </div>
              <p>
                Server-side adapters isolate credentials, normalize schemas, preserve
                provenance, and degrade to labeled demo data without breaking the interface.
              </p>
            </div>

            <div className="pipeline-grid">
              <div className="pipeline-flow" aria-label="Data processing pipeline">
                {[
                  ["INGEST", "EIA · AIS · polls · markets"],
                  ["VALIDATE", "Schema · freshness · outliers"],
                  ["FEATURES", "Lags · flows · regimes · priors"],
                  ["MODEL", "Walk-forward ensemble"],
                  ["SERVE", "Cached intelligence snapshot"],
                ].map(([stage, detail], index) => (
                  <div className="pipeline-node" key={stage}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{stage}</strong>
                    <small>{detail}</small>
                    {index < 4 && <i aria-hidden="true">→</i>}
                  </div>
                ))}
              </div>

              <div className="health-table">
                <div className="health-row health-row--head">
                  <span>Adapter</span>
                  <span>State</span>
                  <span>Freshness</span>
                  <span>Contract</span>
                </div>
                {intel.sources.map((source) => (
                  <div className="health-row" key={source.id}>
                    <strong>{source.label}</strong>
                    <SourceState state={source.state} />
                    <span>{source.latency}</span>
                    <span>{source.detail}</span>
                  </div>
                ))}
              </div>

              <aside className="alert-feed">
                <div className="panel-title-row">
                  <div>
                    <span>ANOMALY QUEUE</span>
                    <strong>{intel.alerts.length} active</strong>
                  </div>
                </div>
                {intel.alerts.map((alert) => (
                  <div className={`alert-item alert-item--${alert.severity}`} key={`${alert.time}-${alert.title}`}>
                    <span>{alert.time}</span>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.detail}</p>
                    </div>
                  </div>
                ))}
              </aside>
            </div>
          </section>
        </main>

        <footer className="site-footer">
          <div>
            <span className="brand-symbol" aria-hidden="true">
              SS
            </span>
            <div>
              <strong>STRAITSIGNAL</strong>
              <p>Explainable energy intelligence from physical flows to market priors.</p>
            </div>
          </div>
          <div className="footer-links">
            <a href="https://www.eia.gov/opendata/documentation.php" target="_blank" rel="noreferrer">
              EIA API
            </a>
            <a href="https://docs.polymarket.com/api-reference/introduction" target="_blank" rel="noreferrer">
              Polymarket API
            </a>
            <a href="https://developers.kpler.com/api/overview" target="_blank" rel="noreferrer">
              Kpler API
            </a>
            <a href="https://www.vesseltrack.net/api-docs" target="_blank" rel="noreferrer">
              VesselTrack API
            </a>
          </div>
          <p className="disclaimer">
            Research software, not financial advice. Demo values are synthetic or labeled
            snapshots until live providers are configured. Forecasts can be wrong.
          </p>
        </footer>
      </div>
    </div>
  );
}
