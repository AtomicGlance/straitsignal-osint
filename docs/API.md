# API contracts

StraitSignal keeps secrets server-side in `app/api/intel/route.ts`. The browser calls only `/api/intel`; it never receives provider credentials.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `EIA_API_KEY` | Recommended | Free EIA API v2 key for the latest daily WTI observation. |
| `TANKER_API_URL` | Optional | Provider adapter or gateway returning the normalized tanker contract below. Without it, the map requests a timestamped public latest-available feed. |
| `TANKER_API_KEY` | Optional | Sent as both Bearer and `X-API-Key` by the generic adapter. Tailor this for the selected provider. |
| `POLLING_API_URL` | Optional | JSON endpoint returning any subset of the normalized polls contract. |

Polymarket discovery uses its public Gamma API and does not need trading credentials. StraitSignal does not place orders.

## Tanker contract

```json
{
  "vessels": 1,
  "flowIndex": 86,
  "congestion": 74,
  "darkActivity": 19,
  "provider": "Your AIS provider",
  "feedState": "live",
  "latestPositionUpdate": "2026-07-23T12:08:00.000Z",
  "ageMinutes": 4,
  "positions": [
    {
      "id": "123456789",
      "mmsi": "123456789",
      "name": "Example tanker",
      "lat": 25.9,
      "lon": 56.4,
      "heading": 287,
      "speed": 11.8,
      "shipType": 80,
      "updatedAt": "2026-07-23T12:08:00.000Z"
    }
  ],
  "chokepoints": [
    {
      "id": "hormuz",
      "name": "Strait of Hormuz",
      "lon": 56.25,
      "lat": 26.55,
      "flow": 82,
      "delta": -12.4,
      "risk": "high"
    }
  ]
}
```

`positions` must contain real WGS84 longitude/latitude coordinates. The gateway computes age from `latestPositionUpdate`; only positions no older than 30 minutes receive the `live` state. Older provider responses remain usable but render as `degraded` / “latest available.” No AIS coordinate is synthesized by the demo fallback.

The built-in public adapter requests AIS ship-type codes 80–89. It is intended as a zero-key demonstration and may be delayed, incomplete, or rate-limited. Use a licensed provider with explicit redistribution rights for production.

## Polling contract

```json
{
  "cycle": "2026 U.S. midterms",
  "electionDate": "2026-11-03",
  "genericBallotDem": 47.3,
  "genericBallotRep": 40.3,
  "margin": 7.0,
  "presidentialApproval": 39.4,
  "sample": 18,
  "source": "Your aggregation methodology and timestamp"
}
```

## Failure behavior

Every adapter is requested independently. A failed provider cannot take down the snapshot:

1. The gateway keeps the last deterministic demo shape.
2. Successful adapters replace only their own fields.
3. Each source receives `live`, `degraded`, or `demo` state.
4. The response declares `live`, `hybrid`, or `demo` mode.
5. Cache headers allow a 60-second snapshot with five-minute stale serving.

For production, place retry budgets, circuit breakers, schema validation, rate-limit telemetry, and durable last-known-good snapshots in front of the normalized route.
