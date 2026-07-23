# Methodology

## Forecast target

The reference implementation predicts the log return of front-month WTI over 21 trading days, then transforms it back into dollars per barrel. Roll-adjusted continuous futures should replace spot WTI when a production data license is available.

## Feature families

- **Market state:** WTI returns, 5/10/21/63-day momentum, realized volatility, inventory changes, and the U.S. dollar proxy.
- **Physical flow:** tanker throughput relative to corridor baselines, congestion, estimated laden state, port-call sequences, draught changes, and AIS-silence rate.
- **Consumer transmission:** gasoline median, PADD low/high spread, and separate positive/negative distributed-lag terms.
- **Political context:** recency-weighted generic-ballot margin, presidential approval, election timing, and an explicitly non-causal oil/conflict sensitivity scenario.
- **Prediction markets:** liquidity-aware probabilities, one-day movement, and disagreement between polls and market-implied outcomes.

Political and prediction-market variables are deliberately bounded. They adjust policy-scenario priors; they are not labeled as direct causes of WTI.

## Analytical approaches

1. **Elastic net** establishes a stable, sparse lag baseline and readable coefficient path.
2. **Bayesian ridge** produces a regularized posterior baseline and model-level uncertainty.
3. **Histogram gradient boosting** captures nonlinear thresholds and interactions among flow stress, volatility, and inventory regimes.
4. **Distributed-lag regression** estimates the timing and asymmetry of WTI-to-pump transmission.
5. **VAR and Granger diagnostics** identify predictive precedence across WTI, gasoline, and tanker flow. They do not establish structural causality.
6. **Inverse-error ensemble** weights models by walk-forward MAE rather than in-sample fit.
7. **Conformal calibration** converts held-out absolute residuals into an empirical prediction band.
8. **Monte Carlo scenarios** should draw duration, throughput loss, inventory response, and policy response instead of applying one deterministic shock.

## Gasoline forecast

The interface separates observed weekly PADD prices from an 8-week dashed forecast segment. The baseline uses asymmetric distributed-lag transmission from WTI to the national median, while the PADD low/high envelope preserves regional dispersion. Stress-scenario adjustments are applied only after the final observed point.

## Election stress projection

The displayed projection starts from the observed generic-ballot margin and adds bounded terms for a 0–100 oil-pressure index and a 0–100 conflict index. The sign convention assumes higher household energy and conflict stress penalizes the incumbent party. The wide interval is intentionally separate from polling uncertainty. This is a scenario sensitivity test—not a structural causal model and not a claim that oil prices determine votes.

## Evaluation

- Expanding walk-forward splits with a 21-day gap prevent label overlap.
- Primary metrics: MAE in log-return space, dollar MAE after transformation, directional accuracy, interval coverage, and interval width.
- Compare against persistence, seasonal naive, and futures-curve baselines.
- Report performance by volatility regime and geopolitical-event window.
- Freeze provider schemas and backfill rules inside every model version.

## Poll aggregation

A production poll average should weight recency, sample type (A/RV/LV), pollster house effects, mode, sample size, and repeated releases from the same organization. Preserve raw poll-level records and publish the exact average timestamp. Historical election error should widen the final political prior.

## Tanker limitations

AIS coverage is uneven, destinations are self-reported, and “dark” behavior has benign explanations. Cargo type, ownership, ship-to-ship transfer, sanctions exposure, and laden state should be treated as probabilistic inferences with confidence and provenance.

## Required production upgrades

- Licensed continuous-futures history with roll methodology.
- A validated AIS/tanker provider contract and historical backfill.
- A documented, reproducible polling source.
- Transaction-cost-aware decision evaluation if the project is ever extended beyond research.
- Drift, coverage, schema, freshness, and rate-limit monitoring.
