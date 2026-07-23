import { demoIntel, type IntelSnapshot, type SourceState } from "../../../lib/intel";

export const dynamic = "force-dynamic";

const FRED_BASE = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";
const GAS_SERIES = ["GASREGECW", "GASREGMWW", "GASREGGCW", "GASREGRMW", "GASREGWCW"];

type CsvPoint = { date: string; value: number };
type EiaRow = { period?: string; value?: string | number };
type GammaMarket = {
  question?: string;
  outcomePrices?: string | string[];
  oneDayPriceChange?: number;
  volumeNum?: number;
  liquidityNum?: number;
};
type KalshiMarket = {
  ticker?: string;
  title?: string;
  subtitle?: string;
  yes_bid_dollars?: string | number;
  yes_ask_dollars?: string | number;
  last_price_dollars?: string | number;
  previous_price_dollars?: string | number;
  volume_24h_fp?: string | number;
  liquidity_dollars?: string | number;
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
type DatalasticVessel = {
  uuid?: string;
  mmsi?: string | number;
  name?: string | null;
  lat?: number;
  lon?: number;
  heading?: number | null;
  speed?: number | null;
  type?: string | null;
  type_specific?: string | null;
  last_position_UTC?: string | null;
};
type DatalasticPayload = { data?: { vessels?: DatalasticVessel[] } | DatalasticVessel[] };
type EnergyBundle = {
  timeline: IntelSnapshot["timeline"];
  forecast: IntelSnapshot["forecast"];
  provider: string;
  oilPeriod: string;
  gasPeriod: string;
  state: SourceState;
};
type GdeltPoint = { date?: string; value?: number; norm?: number };
type GdeltPayload = { timeline?: Array<{ data?: GdeltPoint[] }> };

type MarketCard = IntelSnapshot["predictionMarkets"][number] & {
  rank: number;
};

async function fetchJson<T>(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "StraitSignal/1.1",
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

async function fetchText(url: string, timeoutMs = 10_000): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/csv", "User-Agent": "StraitSignal/1.1" },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`Upstream ${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

function median(values: number[]) {
  const sorted = [...values].filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function deviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1),
  );
}

function parseFredCsv(csv: string): CsvPoint[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, raw] = line.split(",");
      const normalized = raw?.trim();
      return {
        date,
        value: normalized && normalized !== "." ? Number(normalized) : Number.NaN,
      };
    })
    .filter((point) => /^\d{4}-\d{2}-\d{2}$/.test(point.date) && Number.isFinite(point.value));
}

async function getFredSeries(id: string) {
  return parseFredCsv(await fetchText(`${FRED_BASE}${encodeURIComponent(id)}`));
}

function latestOnOrBefore(points: CsvPoint[], date: string) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].date <= date) return points[index].value;
  }
  return Number.NaN;
}

function dateAgeDays(date: string) {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 86_400_000) : Infinity;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function monthLabel(date: string, index: number, previous?: string) {
  const month = date.slice(0, 7);
  if (index === 0 || month !== previous?.slice(0, 7)) {
    return new Date(`${date}T00:00:00Z`).toLocaleString("en-US", {
      month: "short",
      timeZone: "UTC",
    });
  }
  return "";
}

function solveLinearSystem(matrix: number[][], vector: number[]) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) pivot = row;
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    const divisor = augmented[column][column];
    if (Math.abs(divisor) < 1e-9) return Array(size).fill(0);
    for (let cell = column; cell <= size; cell += 1) augmented[column][cell] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row][column];
      for (let cell = column; cell <= size; cell += 1) {
        augmented[row][cell] -= factor * augmented[column][cell];
      }
    }
  }
  return augmented.map((row) => row[size]);
}

function ridgeFit(features: number[][], target: number[], lambda = 0.2) {
  const columns = features[0]?.length ?? 0;
  if (!columns || features.length !== target.length) return Array(columns).fill(0);
  const matrix = Array.from({ length: columns }, () => Array(columns).fill(0));
  const vector = Array(columns).fill(0);
  for (let row = 0; row < features.length; row += 1) {
    for (let left = 0; left < columns; left += 1) {
      vector[left] += features[row][left] * target[row];
      for (let right = 0; right < columns; right += 1) {
        matrix[left][right] += features[row][left] * features[row][right];
      }
    }
  }
  for (let index = 1; index < columns; index += 1) matrix[index][index] += lambda;
  return solveLinearSystem(matrix, vector);
}

async function getEiaLatest() {
  const key = process.env.EIA_API_KEY;
  if (!key) return null;
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
  if (!Number.isFinite(value) || !row?.period) throw new Error("No WTI value returned");
  return { value, period: row.period };
}

async function getNasdaqFutures() {
  const key = process.env.NASDAQ_DATA_LINK_API_KEY;
  if (!key) return null;
  const url = new URL("https://data.nasdaq.com/api/v3/datasets/CHRIS/CME_CL1.json");
  url.searchParams.set("api_key", key);
  url.searchParams.set("rows", "80");
  url.searchParams.set("order", "desc");
  const payload = await fetchJson<{
    dataset?: { column_names?: string[]; data?: Array<Array<string | number | null>> };
  }>(url.toString());
  const columns = payload.dataset?.column_names ?? [];
  const dateIndex = columns.indexOf("Date");
  const settleIndex = columns.indexOf("Settle");
  if (dateIndex < 0 || settleIndex < 0) throw new Error("Futures columns unavailable");
  const points = (payload.dataset?.data ?? [])
    .map((row) => ({ date: String(row[dateIndex]), value: Number(row[settleIndex]) }))
    .filter((point) => Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) throw new Error("No futures settlements returned");
  return points;
}

async function getEnergyBundle(): Promise<EnergyBundle> {
  const [wtiSpot, ...gasSeries] = await Promise.all([
    getFredSeries("DCOILWTICO"),
    ...GAS_SERIES.map(getFredSeries),
  ]);
  if (wtiSpot.length < 32 || gasSeries.some((series) => series.length < 32)) {
    throw new Error("Insufficient public energy history");
  }

  const gasMaps = gasSeries.map((series) => new Map(series.map((point) => [point.date, point.value])));
  const gasDates = gasSeries[0]
    .map((point) => point.date)
    .filter((date) => gasMaps.every((map) => map.has(date)))
    .slice(-32);
  if (gasDates.length < 24) throw new Error("Regional gasoline dates do not align");

  const optional = await Promise.allSettled([getEiaLatest(), getNasdaqFutures()]);
  const eiaLatest = optional[0].status === "fulfilled" ? optional[0].value : null;
  const futures = optional[1].status === "fulfilled" ? optional[1].value : null;
  const oilSeries = futures?.length ? futures : wtiSpot;
  const instrument = futures?.length ? "NYMEX WTI front-month settlement" : "WTI spot proxy";
  const observationKind = futures?.length ? "futures" : "spot-proxy";

  const observedOil = gasDates.map((date) => latestOnOrBefore(oilSeries, date));
  const validOil = observedOil.every(Number.isFinite);
  if (!validOil) throw new Error("Oil and gasoline dates do not align");
  const gasRows = gasDates.map((date) => gasMaps.map((map) => Number(map.get(date))));
  const gasMedian = gasRows.map((values) => Number(median(values).toFixed(3)));
  const gasLow = gasRows.map((values) => Number(Math.min(...values).toFixed(3)));
  const gasHigh = gasRows.map((values) => Number(Math.max(...values).toFixed(3)));

  const oilReturns = observedOil.slice(1).map((value, index) => Math.log(value / observedOil[index]));
  const drift = clamp(median(oilReturns.slice(-12)), -0.025, 0.025);
  const volatility = clamp(deviation(oilReturns.slice(-16)), 0.012, 0.08);
  const newestOilPoint = oilSeries.at(-1)!;
  const currentPoint =
    eiaLatest && eiaLatest.period >= newestOilPoint.date
      ? { date: eiaLatest.period, value: eiaLatest.value }
      : newestOilPoint;

  const oilForecast: number[] = [];
  for (let step = 1; step <= 8; step += 1) {
    oilForecast.push(Number((currentPoint.value * Math.exp(drift * step)).toFixed(2)));
  }
  const fullOil = [...observedOil, ...oilForecast];
  const oilLow = fullOil.map((value, index) => {
    if (index < observedOil.length) return Number((value * 0.99).toFixed(2));
    const step = index - observedOil.length + 1;
    return Number((value * Math.exp(-1.28 * volatility * Math.sqrt(step))).toFixed(2));
  });
  const oilHigh = fullOil.map((value, index) => {
    if (index < observedOil.length) return Number((value * 1.01).toFixed(2));
    const step = index - observedOil.length + 1;
    return Number((value * Math.exp(1.28 * volatility * Math.sqrt(step))).toFixed(2));
  });

  const oilChanges = observedOil.slice(1).map((value, index) => value - observedOil[index]);
  const gasChanges = gasMedian.slice(1).map((value, index) => value - gasMedian[index]);
  const lagCount = 4;
  const x: number[][] = [];
  const y: number[] = [];
  for (let index = lagCount; index < gasChanges.length; index += 1) {
    x.push([1, ...Array.from({ length: lagCount }, (_, lag) => oilChanges[index - lag])]);
    y.push(gasChanges[index]);
  }
  const coefficients = ridgeFit(x, y, 0.8);
  const allOil = [...observedOil, ...oilForecast];
  const allOilChanges = allOil.slice(1).map((value, index) => value - allOil[index]);
  const projectedGas: number[] = [];
  let gasLevel = gasMedian.at(-1)!;
  for (let step = 0; step < 8; step += 1) {
    const changeIndex = oilChanges.length + step;
    const features = [
      1,
      ...Array.from({ length: lagCount }, (_, lag) => allOilChanges[changeIndex - lag] ?? 0),
    ];
    const predictedChange = clamp(
      features.reduce((sum, value, index) => sum + value * (coefficients[index] ?? 0), 0),
      -0.22,
      0.22,
    );
    gasLevel = clamp(gasLevel + predictedChange, 1.5, 8);
    projectedGas.push(Number(gasLevel.toFixed(3)));
  }

  const latestSpreadLow = gasMedian.at(-1)! - gasLow.at(-1)!;
  const latestSpreadHigh = gasHigh.at(-1)! - gasMedian.at(-1)!;
  const projectedGasLow = projectedGas.map((value, index) =>
    Number((value - latestSpreadLow - index * 0.015).toFixed(3)),
  );
  const projectedGasHigh = projectedGas.map((value, index) =>
    Number((value + latestSpreadHigh + index * 0.02).toFixed(3)),
  );
  const futureDates = Array.from({ length: 8 }, (_, index) => addDays(gasDates.at(-1)!, 7 * (index + 1)));
  const dates = [...gasDates, ...futureDates];
  const labels = dates.map((date, index) => monthLabel(date, index, dates[index - 1]));
  labels[gasDates.length - 1] = "Now";

  const next = oilForecast.at(-1)!;
  const changePct = ((next / currentPoint.value) - 1) * 100;
  const age = Math.max(dateAgeDays(currentPoint.date), dateAgeDays(gasDates.at(-1)!));
  const state: SourceState = age <= 10 ? "live" : "degraded";

  return {
    timeline: {
      labels,
      observed: observedOil,
      forecast: fullOil,
      low: oilLow,
      high: oilHigh,
      gasMedian: [...gasMedian, ...projectedGas],
      gasLow: [...gasLow, ...projectedGasLow],
      gasHigh: [...gasHigh, ...projectedGasHigh],
      gasObservedCount: gasMedian.length,
    },
    forecast: {
      ...demoIntel.forecast,
      instrument,
      observationKind,
      current: Number(currentPoint.value.toFixed(2)),
      next,
      changePct: Number(changePct.toFixed(1)),
      confidence: Math.round(clamp(84 - volatility * 420, 48, 82)),
      low: oilLow.at(-1)!,
      high: oilHigh.at(-1)!,
      bias: changePct > 1 ? "bullish" : changePct < -1 ? "bearish" : "neutral",
      horizon: "8 weeks",
      modelSpread: Number(((oilHigh.at(-1)! - oilLow.at(-1)!) / 2).toFixed(1)),
    },
    provider: futures?.length
      ? "Nasdaq Data Link CHRIS/CME_CL1 + EIA regional gasoline via FRED"
      : "EIA WTI and regional gasoline via FRED",
    oilPeriod: currentPoint.date,
    gasPeriod: gasDates.at(-1)!,
    state,
  };
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

const MARKET_PATTERN = /(midterm|house|senate|u\.?s\.? election|united states|oil|wti|crude)/i;

async function getPolymarket(): Promise<MarketCard[]> {
  const markets = await fetchJson<GammaMarket[]>(
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=500",
  );
  return markets
    .filter((market) => MARKET_PATTERN.test(market.question ?? ""))
    .map((market) => ({
      label: market.question ?? "Prediction market",
      probability: parseYesPrice(market.outcomePrices),
      change: Number(((market.oneDayPriceChange ?? 0) * 100).toFixed(1)),
      source: "Polymarket Gamma API",
      rank: Number(market.volumeNum ?? 0) + Number(market.liquidityNum ?? 0) * 2,
    }))
    .filter((market): market is typeof market & { probability: number } => market.probability !== null);
}

async function getKalshi(): Promise<MarketCard[]> {
  const payload = await fetchJson<{ markets?: KalshiMarket[] }>(
    "https://external-api.kalshi.com/trade-api/v2/markets?status=open&limit=1000",
  );
  return (payload.markets ?? [])
    .filter((market) => MARKET_PATTERN.test(`${market.title ?? ""} ${market.subtitle ?? ""}`))
    .map((market) => {
      const bid = Number(market.yes_bid_dollars);
      const ask = Number(market.yes_ask_dollars);
      const last = Number(market.last_price_dollars);
      const previous = Number(market.previous_price_dollars);
      const probability = Number.isFinite(bid) && Number.isFinite(ask)
        ? ((bid + ask) / 2) * 100
        : last * 100;
      return {
        label: [market.title, market.subtitle].filter(Boolean).join(" — ") || market.ticker || "Kalshi market",
        probability: Math.round(probability),
        change: Number((Number.isFinite(previous) ? (last - previous) * 100 : 0).toFixed(1)),
        source: "Kalshi public market API",
        rank: Number(market.volume_24h_fp ?? 0) + Number(market.liquidity_dollars ?? 0) * 2,
      };
    })
    .filter((market) => Number.isFinite(market.probability));
}

async function getPredictionMarkets() {
  const venues = await Promise.allSettled([getPolymarket(), getKalshi()]);
  const cards = venues.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const deduped = new Map<string, MarketCard>();
  for (const card of cards.sort((a, b) => b.rank - a.rank)) {
    const key = card.label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!deduped.has(key)) deduped.set(key, card);
  }
  const result = [...deduped.values()].slice(0, 6).map((card) => ({
    label: card.label,
    probability: card.probability,
    change: card.change,
    source: card.source,
  }));
  if (!result.length) throw new Error("No matching open markets");
  return {
    cards: result,
    venues: venues.map((item, index) => ({
      name: index === 0 ? "Polymarket" : "Kalshi",
      state: item.status === "fulfilled" ? "live" : "degraded",
    })),
  };
}

function freshness(latestPositionUpdate: string | null) {
  const latest = latestPositionUpdate ? Date.parse(latestPositionUpdate) : Number.NaN;
  const ageMinutes = Number.isFinite(latest) ? Math.max(0, (Date.now() - latest) / 60_000) : null;
  return {
    ageMinutes,
    feedState: ageMinutes !== null && ageMinutes <= 30 ? ("live" as const) : ("degraded" as const),
  };
}

function englishVesselName(value: string | null | undefined) {
  const name = value?.trim();
  return name && /^[\x20-\x7E]+$/.test(name) ? name : "Unnamed tanker";
}

function normalizeDatalastic(vessels: DatalasticVessel[]) {
  return vessels
    .filter((vessel) => Number.isFinite(vessel.lat) && Number.isFinite(vessel.lon))
    .map((vessel, index) => ({
      id: String(vessel.uuid ?? vessel.mmsi ?? `datalastic-${index}`),
      mmsi: String(vessel.mmsi ?? "unknown"),
      name: englishVesselName(vessel.name),
      lat: Number(vessel.lat),
      lon: Number(vessel.lon),
      heading: Number.isFinite(vessel.heading) ? Number(vessel.heading) : null,
      speed: Number.isFinite(vessel.speed) ? Number(vessel.speed) : null,
      shipType: null,
      updatedAt: vessel.last_position_UTC ?? "timestamp unavailable",
    }));
}

async function getDatalasticSummary(): Promise<Partial<IntelSnapshot["tanker"]>> {
  const key = process.env.DATALASTIC_API_KEY;
  const areasRaw = process.env.DATALASTIC_LOCATIONS_JSON;
  if (!key || !areasRaw) throw new Error("Datalastic opt-in not configured");
  const areas = JSON.parse(areasRaw) as Array<{ lat: number; lon: number; radius?: number }>;
  if (!Array.isArray(areas) || !areas.length || areas.length > 5) {
    throw new Error("DATALASTIC_LOCATIONS_JSON must contain 1-5 areas");
  }
  const responses = await Promise.all(
    areas.map(async (area) => {
      const url = new URL("https://api.datalastic.com/api/v0/vessel_inradius");
      url.searchParams.set("lat", String(area.lat));
      url.searchParams.set("lon", String(area.lon));
      url.searchParams.set("radius", String(clamp(area.radius ?? 25, 1, 50)));
      url.searchParams.set("type", "tanker");
      return fetchJson<DatalasticPayload>(url.toString(), { headers: { "x-api-key": key } }, 15_000);
    }),
  );
  const vessels = responses.flatMap((payload) => {
    const data = payload.data;
    return Array.isArray(data) ? data : data?.vessels ?? [];
  });
  const positions = normalizeDatalastic(vessels);
  if (!positions.length) throw new Error("Datalastic returned no tanker coordinates");
  const latestPositionUpdate = positions
    .map((position) => position.updatedAt)
    .filter((value) => Number.isFinite(Date.parse(value)))
    .sort()
    .at(-1) ?? null;
  return {
    vessels: positions.length,
    positions,
    provider: "Datalastic live AIS",
    latestPositionUpdate,
    analyticsState: "demo",
    ...freshness(latestPositionUpdate),
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
    const positions = (payload.positions ?? []).map((position) => ({
      ...position,
      name: englishVesselName(position.name),
    }));
    return {
      ...payload,
      positions,
      vessels: positions.length || payload.vessels || 0,
      provider: payload.provider ?? "Configured tanker provider",
      latestPositionUpdate,
      ...freshness(latestPositionUpdate),
      analyticsState:
        payload.analyticsState ??
        (payload.flowIndex !== undefined ? freshness(latestPositionUpdate).feedState : "demo"),
    };
  }

  if (process.env.DATALASTIC_API_KEY && process.env.DATALASTIC_LOCATIONS_JSON) {
    return getDatalasticSummary();
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
      name: englishVesselName(vessel.name),
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

function parseGdeltDate(value: string | undefined) {
  if (!value) return null;
  if (/^\d{14}$/.test(value)) {
    return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}Z`;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

async function getConflictSignal(): Promise<IntelSnapshot["conflict"]> {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  url.searchParams.set(
    "query",
    '("oil tanker" OR "oil shipping" OR "energy infrastructure" OR "crude oil") (attack OR missile OR blockade OR sanctions OR conflict)',
  );
  url.searchParams.set("mode", "TimelineVolRaw");
  url.searchParams.set("format", "json");
  url.searchParams.set("timespan", "7d");
  const payload = await fetchJson<GdeltPayload>(url.toString(), undefined, 15_000);
  const points = payload.timeline?.flatMap((series) => series.data ?? []) ?? [];
  if (points.length < 4) throw new Error("Conflict timeline unavailable");
  const intensities = points.map((point) => {
    const value = Number(point.value ?? 0);
    const norm = Number(point.norm ?? 0);
    return norm > 0 ? (value / norm) * 100 : value;
  });
  const center = median(intensities);
  const mad = median(intensities.map((value) => Math.abs(value - center))) || 0.01;
  const latest = intensities.at(-1)!;
  const robustZ = (latest - center) / (1.4826 * mad);
  const latestPoint = points.at(-1)!;
  const latestSeen = parseGdeltDate(latestPoint.date);
  const ageHours = latestSeen ? (Date.now() - Date.parse(latestSeen)) / 3_600_000 : Infinity;
  return {
    index: Math.round(clamp(50 + robustZ * 12, 5, 95)),
    articleCount: Math.round(Number(latestPoint.value ?? 0)),
    latestSeen,
    source: "GDELT DOC 2.0",
    state: ageHours <= 6 ? "live" : "degraded",
    method: "7-day robust z-score of matched media intensity; not an event count",
  };
}

async function getPolling(): Promise<Partial<IntelSnapshot["polls"]>> {
  const url = process.env.POLLING_API_URL;
  if (!url) throw new Error("POLLING_API_URL missing");
  const payload = await fetchJson<Partial<IntelSnapshot["polls"]>>(url);
  const asOf = payload.asOf ?? null;
  const ageDays = asOf && Number.isFinite(Date.parse(asOf))
    ? Math.max(0, (Date.now() - Date.parse(asOf)) / 86_400_000)
    : Infinity;
  return { ...payload, asOf, state: ageDays <= 14 ? "live" : "degraded" };
}

function source(
  id: string,
  label: string,
  state: SourceState,
  detail: string,
  latency = state === "live" ? "current" : "—",
) {
  return { id, label, state, detail, latency };
}

function ageDetail(provider: string | undefined, ageMinutes: number | null | undefined) {
  const providerLabel = provider ?? "Tanker provider";
  if (ageMinutes === null || ageMinutes === undefined) return `${providerLabel} · timestamp unavailable`;
  if (ageMinutes < 60) return `${providerLabel} · ${Math.round(ageMinutes)}m old`;
  if (ageMinutes < 1440) return `${providerLabel} · ${Math.round(ageMinutes / 60)}h old`;
  return `${providerLabel} · ${Math.round(ageMinutes / 1440)}d old`;
}

function marketDetail(venues: Array<{ name: string; state: string }> | undefined) {
  if (!venues) return "Public venue feeds unavailable; showing demo priors";
  return venues.map((venue) => `${venue.name} ${venue.state}`).join(" · ");
}

export async function GET() {
  const started = Date.now();
  const [energy, markets, tanker, polls, conflict] = await Promise.allSettled([
    getEnergyBundle(),
    getPredictionMarkets(),
    getTankerSummary(),
    getPolling(),
    getConflictSignal(),
  ]);
  const results = [energy, markets, tanker, polls, conflict];
  const respondingCount = results.filter((result) => result.status === "fulfilled").length;
  const tankerState = tanker.status === "fulfilled" ? tanker.value.feedState ?? "degraded" : "demo";
  const conflictValue = conflict.status === "fulfilled" ? conflict.value : demoIntel.conflict;
  const pollingValue = polls.status === "fulfilled"
    ? { ...demoIntel.polls, ...polls.value }
    : demoIntel.polls;
  const liveAlerts: IntelSnapshot["alerts"] = [];
  if (energy.status === "fulfilled") {
    liveAlerts.push({
      time: energy.value.oilPeriod,
      severity: "info",
      title: "Energy observations refreshed",
      detail: `${energy.value.forecast.instrument}; regional gasoline through ${energy.value.gasPeriod}.`,
    });
  }
  liveAlerts.push({
    time: tanker.status === "fulfilled" ? tanker.value.latestPositionUpdate ?? "unknown" : "unavailable",
    severity: tankerState === "live" ? "info" : "watch",
    title: tankerState === "live" ? "AIS positions current" : "AIS is latest-available",
    detail:
      tanker.status === "fulfilled"
        ? ageDetail(tanker.value.provider, tanker.value.ageMinutes)
        : "No vessel coordinates could be retrieved during this refresh.",
  });
  if (conflict.status === "fulfilled") {
    liveAlerts.push({
      time: conflict.value.latestSeen ?? "latest",
      severity: conflict.value.index >= 80 ? "watch" : "info",
      title: "Conflict-media indicator refreshed",
      detail: `Index ${conflict.value.index}/100. ${conflict.value.method}.`,
    });
  }
  if (polls.status !== "fulfilled") {
    liveAlerts.push({
      time: "snapshot",
      severity: "info",
      title: "Polling adapter not configured",
      detail: "Observed polling remains an explicitly labeled illustrative snapshot.",
    });
  }
  const baselineMove =
    energy.status === "fulfilled"
      ? Number((energy.value.forecast.next - energy.value.forecast.current).toFixed(1))
      : 0;

  const snapshot: IntelSnapshot = {
    ...demoIntel,
    mode:
      respondingCount === results.length && tankerState === "live"
        ? "live"
        : respondingCount > 0
          ? "hybrid"
          : "demo",
    updatedAt: new Date().toISOString(),
    asOfLabel:
      respondingCount > 0
        ? `Source-aware snapshot · ${respondingCount}/${results.length} adapters responding`
        : demoIntel.asOfLabel,
    forecast: energy.status === "fulfilled" ? energy.value.forecast : demoIntel.forecast,
    timeline: energy.status === "fulfilled" ? energy.value.timeline : demoIntel.timeline,
    predictionMarkets: markets.status === "fulfilled" ? markets.value.cards : demoIntel.predictionMarkets,
    tanker:
      tanker.status === "fulfilled"
        ? { ...demoIntel.tanker, ...tanker.value }
        : demoIntel.tanker,
    polls: pollingValue,
    conflict: conflictValue,
    attribution:
      energy.status === "fulfilled"
        ? [
            {
              name: "Robust trend baseline",
              value: baselineMove,
              note: "Median of recent weekly log returns, bounded against regime jumps",
            },
            {
              name: "Volatility interval",
              value: 0,
              note: `Recent weekly volatility; terminal half-width ${energy.value.forecast.modelSpread.toFixed(1)}`,
            },
            {
              name: "Conflict sensitivity",
              value: 0,
              note: "Shown separately in scenarios and the political stress bridge",
            },
            {
              name: "AIS flow sensitivity",
              value: 0,
              note: "Excluded until a live normalized flow index is available",
            },
          ]
        : demoIntel.attribution,
    alerts: liveAlerts.length ? liveAlerts : demoIntel.alerts,
    sources: [
      source(
        "ais",
        "Tanker / AIS",
        tankerState,
        tanker.status === "fulfilled"
          ? ageDetail(tanker.value.provider, tanker.value.ageMinutes)
          : "Public feed unavailable; configure a licensed AIS adapter",
        tanker.status === "fulfilled" && tanker.value.ageMinutes !== null
          ? tanker.value.ageMinutes !== undefined && tanker.value.ageMinutes < 60
            ? `${Math.round(tanker.value.ageMinutes)}m`
            : `${Math.round((tanker.value.ageMinutes ?? 0) / 60)}h`
          : "—",
      ),
      source(
        "energy",
        "Oil + U.S. gasoline",
        energy.status === "fulfilled" ? energy.value.state : "demo",
        energy.status === "fulfilled"
          ? `${energy.value.provider} · oil ${energy.value.oilPeriod} · gas ${energy.value.gasPeriod}`
          : "Public energy series unavailable; showing demo path",
        energy.status === "fulfilled" ? "daily / weekly" : "—",
      ),
      source(
        "polls",
        "2026 polls",
        pollingValue.state,
        polls.status === "fulfilled"
          ? `Configured feed · as of ${pollingValue.asOf ?? "timestamp unavailable"}`
          : "No licensed polling feed configured; snapshot stays labeled demo",
        polls.status === "fulfilled" ? "≤14d" : "snapshot",
      ),
      source(
        "markets",
        "Prediction markets",
        markets.status === "fulfilled" ? "live" : "degraded",
        markets.status === "fulfilled" ? marketDetail(markets.value.venues) : marketDetail(undefined),
        markets.status === "fulfilled" ? `${Date.now() - started}ms` : "—",
      ),
      source(
        "conflict",
        "Conflict intensity",
        conflictValue.state,
        `${conflictValue.source} · ${conflictValue.method}`,
        conflictValue.latestSeen ? conflictValue.latestSeen.slice(11, 16) + "Z" : "scenario",
      ),
    ],
  };

  return Response.json(snapshot, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
