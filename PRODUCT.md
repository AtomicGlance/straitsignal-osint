# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are energy-market analysts, OSINT researchers, data-science hiring managers, and technically curious investors who need to understand how physical oil flows, consumer fuel prices, political risk, and prediction markets interact. The first release is assumed to be a public portfolio project for the requester; this is an inferred operating assumption and can be revised.

## Product Purpose

StraitSignal is an explainable oil-futures intelligence workbench. It combines tanker movement signals, WTI and U.S. retail gasoline data, 2026 U.S. midterm polling, and prediction-market probabilities to create scenario-aware oil price forecasts. Success means a user can see what changed, which evidence moved the forecast, how models disagree, and how uncertain the output remains.

## Positioning

Most dashboards stop at price charts or vessel maps. StraitSignal treats maritime traffic, pump-price pass-through, election expectations, and crowd probabilities as distinct evidence streams, then exposes their contribution to an auditable ensemble forecast.

## Operating Context

The product is used as a desktop-first monitoring console during market research, model review, and portfolio demonstrations. Analysts bring API keys for paid AIS/tanker providers and a free EIA key; public prediction-market endpoints work without trading credentials. The interface is read-only and never places trades.

## Capabilities and Constraints

- Live-source adapters for EIA API v2, configurable tanker/AIS APIs, configurable polling feeds, and Polymarket public market data.
- Honest demo fallback when credentials or upstream services are unavailable.
- Rolling 32-week WTI and PADD gasoline comparison inspired by the supplied reference analysis.
- Forecast comparison across regularized regression, gradient boosting, Bayesian regression, lag/VAR diagnostics, and market-prior blending.
- Walk-forward backtesting, conformal uncertainty intervals, feature contribution views, and named geopolitical scenarios.
- No trading execution, financial advice, guaranteed performance, or invented live-data claims.
- Tanker cargo, ownership, and destination inference quality depends on the selected commercial data provider.

## Brand Commitments

The requester specified an impeccable, modern, professional OSINT aesthetic in dark navy blue. The product voice is precise, skeptical, operational, and clear about uncertainty. The project should feel advanced and portfolio-worthy without resembling a game or retail trading terminal.

## Evidence on Hand

- U.S. EIA API v2 documentation and weekly gasoline methodology.
- The supplied r/dataisbeautiful post comparing daily WTI with weekly PADD gasoline prices over a rolling 32-week window.
- Public documentation for Polymarket market data and commercial AIS/tanker APIs.
- No private API keys, proprietary tanker data, validated production forecast, customer claims, or investment performance evidence were supplied. Demonstration values must be labeled.

## Product Principles

- Separate observations, inferences, model outputs, and scenarios.
- Make uncertainty and model disagreement visible.
- Design API failure as a first-class state, not a hidden exception.
- Prefer walk-forward evidence over in-sample fit.
- Keep every forecast traceable to sources, transformations, and assumptions.

## Accessibility & Inclusion

Target WCAG 2.2 AA contrast, full keyboard operation, visible focus, reduced-motion support, non-color status cues, and responsive use down to a narrow mobile viewport.
