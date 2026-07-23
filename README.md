# StraitSignal

**Explainable oil-futures intelligence from tanker movements, U.S. fuel prices, election polling, and prediction markets.**

StraitSignal is a portfolio-grade OSINT and data-science project for studying how physical oil flows, consumer-price transmission, political-risk scenarios, and market-implied probabilities can contribute to an auditable WTI forecast. It is a research system, not a trading bot.

**Live dashboard:** https://straitsignal-osint.negar-chem.chatgpt.site

## What makes it different

- A real MapLibre/OpenStreetMap world map plots provider-supplied tanker coordinates and exposes the upstream position timestamp; stale public data is never labeled live.
- A tanker-flow layer treats chokepoint throughput, congestion, AIS gaps, port calls, and estimated laden state as physical-market features.
- The energy layer pulls current EIA-derived WTI and five-region gasoline observations, then extends the 32-week history with an 8-week ridge distributed-lag pump-price forecast and regional dispersion band.
- An optional Nasdaq Data Link adapter uses exact front-month settlements; otherwise the UI explicitly says WTI spot proxy.
- The political layer combines a timestamp-validated polling adapter, two public prediction-market venues, and a clearly separated oil/conflict stress projection for the 2026 U.S. midterms.
- GDELT supplies a near-term conflict-media intensity signal whose methodology states that it is not an event count.
- The forecast lab compares regularized regression, gradient boosting, Bayesian regression, VAR/lead-lag diagnostics, conformal intervals, and Monte Carlo scenarios.
- The UI exposes source health, demo/live state, feature contribution, model disagreement, and uncertainty instead of hiding them behind a single number.

## System map

```mermaid
flowchart LR
    EIA["EIA API v2 / FRED<br/>WTI + gasoline"] --> G["Normalized gateway"]
    AIS["Tanker / AIS provider<br/>positions + port events"] --> G
    POLL["Polling feed<br/>2026 midterms"] --> G
    PM["Polymarket + Kalshi<br/>public read APIs"] --> G
    CONFLICT["GDELT DOC 2.0<br/>media intensity"] --> G
    G --> V["Validation<br/>schema + freshness + provenance"]
    V --> F["Feature store<br/>lags + flows + regimes + priors"]
    F --> M["Walk-forward ensemble<br/>ElasticNet + GBT + Bayesian"]
    M --> C["Conformal calibration<br/>scenario simulation"]
    C --> UI["OSINT workbench<br/>forecast + evidence + API health"]
```

## Quick start

Requires Node.js 22+ and pnpm.

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. With no keys, the gateway retrieves current public energy series, public prediction-market data, a conflict-media signal, and the latest-available public tanker coordinates. Licensed polling, exact futures settlements, and provider analytics remain clearly labeled demo or unavailable until configured.

```bash
pnpm run lint
pnpm run build
node --test tests/rendered-html.test.mjs
```

## API configuration

Copy `.env.example` and configure only the providers you have:

```dotenv
EIA_API_KEY=
NASDAQ_DATA_LINK_API_KEY=
TANKER_API_URL=
TANKER_API_KEY=
DATALASTIC_API_KEY=
DATALASTIC_LOCATIONS_JSON=
POLLING_API_URL=
```

The browser never receives these credentials. See [docs/API.md](docs/API.md) for normalized contracts, failure behavior, and provider-adapter guidance.

## Reproducible analysis

```bash
python -m venv .venv
python -m pip install -r requirements.txt
python analysis/train.py
python analysis/diagnostics.py
```

The default run uses deterministic synthetic data so CI can exercise the full walk-forward pipeline without pretending it is a market forecast. Provide a normalized CSV or parquet table to train on licensed data. See [docs/METHODOLOGY.md](docs/METHODOLOGY.md).

## Data sources and inspiration

- [U.S. EIA API v2](https://www.eia.gov/opendata/documentation.php) for energy data and [EIA weekly retail gasoline methodology](https://www.eia.gov/petroleum/gasdiesel/gas_proc-methods.php).
- [Polymarket public APIs](https://docs.polymarket.com/api-reference/introduction) and [Kalshi market-data APIs](https://docs.kalshi.com/getting_started/quick_start_market_data) for read-only market discovery and pricing.
- [FRED](https://fred.stlouisfed.org/) for zero-key distribution of EIA series and [Nasdaq Data Link](https://docs.data.nasdaq.com/docs/in-depth-usage) for the optional front-month settlement adapter.
- [GDELT DOC 2.0](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) for the conflict-media intensity series.
- Configurable commercial tanker/AIS adapters, including an explicit-credit opt-in for [Datalastic Location Traffic](https://docs.datalastic.com/) and a public latest-available [VesselTrack](https://www.vesseltrack.net/api-docs) fallback.
- [OpenFreeMap](https://openfreemap.org/) and [MapLibre GL JS](https://maplibre.org/maplibre-gl-js/docs/) provide the real-world map without an exposed browser token.
- The supplied 32-week WTI/PADD reference analysis informed the rolling gasoline dispersion view.
- Polling is configured as a replaceable feed because publication terms and available APIs vary; the included July 2026 values are labeled as an illustrative snapshot, not a live poll average.

## Analytical cautions

- AIS silence can be benign; destination and cargo fields can be wrong.
- Polls and prediction markets are noisy, correlated, and not causal oil-price variables.
- The election stress projection is a bounded sensitivity model, not a substitute for a poll average or a causal claim about voter behavior.
- WTI spot data is not a roll-adjusted continuous futures series; the dashboard labels it as a proxy unless the exact settlement adapter responds.
- Walk-forward performance can decay under new regimes.
- A calibrated interval is not a guarantee.
- Nothing here is financial advice or an offer to trade.

## Repository guide

| Path | Purpose |
|---|---|
| `app/page.tsx` | Interactive OSINT dashboard and scenario workbench. |
| `app/api/intel/route.ts` | Key-safe provider orchestration and labeled fallbacks. |
| `lib/intel.ts` | Normalized intelligence contract and deterministic demo snapshot. |
| `analysis/` | Feature engineering, walk-forward training, conformal calibration, and diagnostics. |
| `docs/API.md` | Adapter contracts and API-management guidance. |
| `docs/METHODOLOGY.md` | Modeling assumptions, evaluation, and limitations. |
| `PRODUCT.md` / `DESIGN.md` | Durable product and visual-system decisions. |

## License

MIT. Provider data remains subject to its own license and redistribution terms.
