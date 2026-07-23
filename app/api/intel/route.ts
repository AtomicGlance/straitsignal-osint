import { demoIntel, type IntelSnapshot, type SourceState } from "../../../lib/intel";

export const dynamic = "force-dynamic";

type EiaRow = { period?: string; value?: string | number };
type GammaMarket = {
  question?: string;
  outcomePrices?: string | string[];
  oneDayPriceChange?: number;
};
type PublicVessel = {
  mmsi?: string | number;
  lat?: number;
  lon?: number;
  heading?: number | null;
  ship_type?: number | null;
  sog?: number | null;
  name?: string | null;
  last_position_update?: string | null;
};
type PublicVesselPayload = {
  freshness?: { latestPositionUpdate?: string | null };
  vessels?: PublicVessel[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "StraitSignal/1.0",
        ...init?.headers,
      },
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

async function getEiaLatest() {
  const key = process.env.EIA_API_KEY;
  if (!key) throw new Error("EIA_API_KEY missing");
  const url = new URL("https://api.eia.gov/v2/petroleum/pri/spt/data/");
  url.searchParams.set("api_key", key);
  url.searchParams.set("frequency", "daily");
  url.searchParams.append("data[]", "value");
  url.searchParams.append("facets[series][]", "RWTC");
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("length", "1");
  const payload = await fetchJson<{ response?: { data?: EiaRow[] } }>(url.toString());
  const row = payload.response?.data?.[0];
  const value = Number(row?.value);
  if (!Number.isFinite(value)) throw new Error("No WTI value returned");
  return { value, period: row?.period ?? "latest" };
}

function parseYesPrice(value: GammaMarket["outcomePrices"]): number | null {
  try {
    const prices = Array.isArray(value) ? value : JSON.parse(value ?? "[]");
    const price = Number(prices[0]);
    return Number.isFinite(price) ? Math.round(price * 100) : null;
  } catch {
    return null;
  }
}

async function getPredictionMarkets() {
  const markets = await fetchJson<GammaMarket[]>(
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100",
  );
  const relevant = markets
    .filter((market) =>
      /(midterm|house control|senate control|u\.?s\.? election|united states|oil|wti)/i.test(
        market.question ?? "",
      ),
    )
    .map((market) => ({
      label: market.question ?? "Prediction market",
      probability: parseYesPrice(market.outcomePrices),
      change: Number(((market.oneDayPriceChange ?? 0) * 100).toFixed(1)),
      source: "Polymarket public API",
    }))
    .filter(
      (market): market is typeof market & { probability: number } =>
        market.probability !== null,
    )
    .slice(0, 3);
  if (!relevant.length) throw new Error("No matching open markets");
  return relevant;
}

function freshness(latestPositionUpdate: string | null) {
  const latest = latestPositionUpdate ? Date.parse(latestPositionUpdate) : Number.NaN;
  const ageMinutes = Number.isFinite(latest)
    ? Math.max(0, (Date.now() - latest) / 60_000)
    : null;
  return {
    ageMinutes,
    feedState:
      ageMinutes !== null && ageMinutes <= 30
        ? ("live" as const)
        : ("degraded" as const),
  };
}

async function getTankerSummary(): Promise<Partial<IntelSnapshot["tanker"]>> {
  const url = process.env.TANKER_API_URL;
  if (url) {
    const key = process.env.TANKER_API_KEY;
    const payload = await fetchJson<Partial<IntelSnapshot["tanker"]>>(url, {
      headers: key ? { Authorization: `Bearer ${key}`, "X-API-Key": key } : undefined,
    });
    const latestPositionUpdate = payload.latestPositionUpdate ?? null;
    return {
      ...payload,
      vessels: payload.positions?.length ?? payload.vessels ?? 0,
      provider: payload.provider ?? "Configured tanker provider",
      latestPositionUpdate,
      ...freshness(latestPositionUpdate),
      analyticsState:
        payload.analyticsState ??
        (payload.flowIndex !== undefined ? freshness(latestPositionUpdate).feedState : "demo"),
    };
  }

  const publicUrl = new URL("https://www.vesseltrack.net/api/vessels/map");
  publicUrl.searchParams.set("ship_type", "80,81,82,83,84,85,86,87,88,89");
  publicUrl.searchParams.set("limit", "2500");
  const payload = await fetchJson<PublicVesselPayload>(publicUrl.toString());
  const positions = (payload.vessels ?? [])
    .filter(
      (vessel) =>
        Number.isFinite(vessel.lat) &&
        Number.isFinite(vessel.lon) &&
        Math.abs(Number(vessel.lat)) <= 90 &&
        Math.abs(Number(vessel.lon)) <= 180,
    )
    .map((vessel, index) => ({
      id: String(vessel.mmsi ?? `public-${index}`),
      mmsi: String(vessel.mmsi ?? "unknown"),
      name: vessel.name?.trim() || "Unnamed tanker",
      lat: Number(vessel.lat),
      lon: Number(vessel.lon),
      heading: Number.isFinite(vessel.heading) ? Number(vessel.heading) : null,
      speed: Number.isFinite(vessel.sog) ? Number(vessel.sog) : null,
      shipType: Number.isFinite(vessel.ship_type) ? Number(vessel.ship_type) : null,
      updatedAt: vessel.last_position_update ?? "timestamp unavailable",
    }));
  if (!positions.length) throw new Error("Public tanker feed returned no coordinates");

  const latestPositionUpdate =
    payload.freshness?.latestPositionUpdate ??
    positions
      .map((position) => position.updatedAt)
      .filter((value) => Number.isFinite(Date.parse(value)))
      .sort()
      .at(-1) ??
    null;

  return {
    vessels: positions.length,
    positions,
    provider: "VesselTrack public AIS",
    latestPositionUpdate,
    analyticsState: "demo",
    ...freshness(latestPositionUpdate),
  };
}

async function getPolling() {
  const url = process.env.POLLING_API_URL;
  if (!url) throw new Error("POLLING_API_URL missing");
  return fetchJson<Partial<IntelSnapshot["polls"]>>(url);
}

function source(
  id: string,
  label: string,
  state: SourceState,
  detail: string,
  latency = state === "live" ? "<15m" : "—",
) {
  return { id, label, state, detail, latency };
}

function ageDetail(provider: string | undefined, ageMinutes: number | null | undefined) {
  const providerLabel = provider ?? "Tanker provider";
  if (ageMinutes === null || ageMinutes === undefined) {
    return `${providerLabel} · timestamp unavailable`;
  }
  if (ageMinutes < 60) return `${providerLabel} · ${Math.round(ageMinutes)}m old`;
  if (ageMinutes < 1440) return `${providerLabel} · ${Math.round(ageMinutes / 60)}h old`;
  return `${providerLabel} · ${Math.round(ageMinutes / 1440)}d old`;
}

export async function GET() {
  const started = Date.now();
  const [eia, markets, tanker, polls] = await Promise.allSettled([
    getEiaLatest(),
    getPredictionMarkets(),
    getTankerSummary(),
    getPolling(),
  ]);

  const respondingCount = [eia, markets, tanker, polls].filter(
    (result) => result.status === "fulfilled",
  ).length;
  const tankerState =
    tanker.status === "fulfilled" ? tanker.value.feedState ?? "degraded" : "demo";

  const snapshot: IntelSnapshot = {
    ...demoIntel,
    mode:
      respondingCount === 4 && tankerState === "live"
        ? "live"
        : respondingCount > 0
          ? "hybrid"
          : "demo",
    updatedAt: new Date().toISOString(),
    asOfLabel:
      respondingCount > 0
        ? `Source-aware snapshot · ${respondingCount}/4 adapters responding`
        : demoIntel.asOfLabel,
    forecast:
      eia.status === "fulfilled"
        ? {
            ...demoIntel.forecast,
            current: eia.value.value,
            next: Number(
              (eia.value.value * (1 + demoIntel.forecast.changePct / 100)).toFixed(1),
            ),
            low: Number((eia.value.value * 0.991).toFixed(1)),
            high: Number((eia.value.value * 1.162).toFixed(1)),
          }
        : demoIntel.forecast,
    predictionMarkets:
      markets.status === "fulfilled" ? markets.value : demoIntel.predictionMarkets,
    tanker:
      tanker.status === "fulfilled"
        ? { ...demoIntel.tanker, ...tanker.value }
        : demoIntel.tanker,
    polls:
      polls.status === "fulfilled"
        ? { ...demoIntel.polls, ...polls.value, state: "live" }
        : demoIntel.polls,
    sources: [
      source(
        "ais",
        "Tanker / AIS",
        tankerState,
        tanker.status === "fulfilled"
          ? ageDetail(tanker.value.provider, tanker.value.ageMinutes)
          : "Public feed unavailable; add TANKER_API_URL for a licensed feed",
        tanker.status === "fulfilled" && tanker.value.ageMinutes !== null
          ? tanker.value.ageMinutes !== undefined && tanker.value.ageMinutes < 60
            ? `${Math.round(tanker.value.ageMinutes)}m`
            : `${Math.round((tanker.value.ageMinutes ?? 0) / 60)}h`
          : "—",
      ),
      source(
        "eia",
        "EIA energy",
        eia.status === "fulfilled" ? "live" : "demo",
        eia.status === "fulfilled" ? `WTI ${eia.value.period}` : "Add a free EIA_API_KEY",
      ),
      source(
        "polls",
        "2026 polls",
        polls.status === "fulfilled" ? "live" : "demo",
        polls.status === "fulfilled"
          ? "Configured polling feed responding"
          : "Add POLLING_API_URL or keep the labeled snapshot",
      ),
      source(
        "markets",
        "Prediction markets",
        markets.status === "fulfilled" ? "live" : "degraded",
        markets.status === "fulfilled"
          ? "Polymarket public market data"
          : "Public feed unavailable; showing demo priors",
        markets.status === "fulfilled" ? `${Date.now() - started}ms` : "—",
      ),
    ],
  };

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
