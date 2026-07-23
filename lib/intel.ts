export type SourceState = "live" | "degraded" | "demo";

export type VesselPosition = {
  id: string;
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  heading: number | null;
  speed: number | null;
  shipType: number | null;
  updatedAt: string;
};

export type IntelSnapshot = {
  mode: "live" | "hybrid" | "demo";
  updatedAt: string;
  asOfLabel: string;
  forecast: {
    current: number;
    next: number;
    changePct: number;
    confidence: number;
    low: number;
    high: number;
    bias: "bullish" | "neutral" | "bearish";
    horizon: string;
    modelSpread: number;
  };
  sources: Array<{
    id: string;
    label: string;
    state: SourceState;
    latency: string;
    detail: string;
  }>;
  predictionMarkets: Array<{
    label: string;
    probability: number;
    change: number;
    source: string;
  }>;
  tanker: {
    vessels: number;
    flowIndex: number;
    congestion: number;
    darkActivity: number;
    provider: string;
    feedState: SourceState;
    analyticsState: SourceState;
    latestPositionUpdate: string | null;
    ageMinutes: number | null;
    positions: VesselPosition[];
    chokepoints: Array<{
      id: string;
      name: string;
      lon: number;
      lat: number;
      flow: number;
      delta: number;
      risk: "normal" | "watch" | "high";
    }>;
  };
  polls: {
    cycle: string;
    electionDate: string;
    genericBallotDem: number;
    genericBallotRep: number;
    margin: number;
    presidentialApproval: number;
    sample: number;
    source: string;
    state: SourceState;
  };
  timeline: {
    labels: string[];
    observed: number[];
    forecast: number[];
    low: number[];
    high: number[];
    gasMedian: number[];
    gasLow: number[];
    gasHigh: number[];
    gasObservedCount: number;
  };
  attribution: Array<{
    name: string;
    value: number;
    note: string;
  }>;
  alerts: Array<{
    time: string;
    severity: "info" | "watch" | "high";
    title: string;
    detail: string;
  }>;
};

const observed = [
  72.4, 73.8, 71.6, 74.1, 76.2, 78.4, 77.1, 79.7, 81.3, 80.2, 83.6, 86.8,
  84.9, 87.5, 89.1, 91.7, 93.2, 92.1, 94.8, 97.2, 96.1, 99.4, 101.2, 98.7,
  100.6, 103.2, 105.4, 104.1,
];

const projected = [105.2, 106.8, 108.1, 109.4, 108.7, 110.3, 111.6, 112.1];

const full = [...observed, ...projected];
const uncertainty = full.map((_, index) =>
  index < observed.length ? 1.2 : 2.6 + (index - observed.length) * 0.55,
);

export const demoIntel: IntelSnapshot = {
  mode: "demo",
  updatedAt: "2026-07-23T12:00:00.000Z",
  asOfLabel: "Illustrative demo · connect APIs for live values",
  forecast: {
    current: 104.1,
    next: 112.1,
    changePct: 7.7,
    confidence: 71,
    low: 103.2,
    high: 121.0,
    bias: "bullish",
    horizon: "21 trading days",
    modelSpread: 6.4,
  },
  sources: [
    {
      id: "ais",
      label: "Tanker / AIS",
      state: "demo",
      latency: "—",
      detail: "Add TANKER_API_URL and TANKER_API_KEY",
    },
    {
      id: "eia",
      label: "EIA energy",
      state: "demo",
      latency: "—",
      detail: "Add a free EIA_API_KEY",
    },
    {
      id: "polls",
      label: "2026 polls",
      state: "demo",
      latency: "snapshot",
      detail: "Configurable JSON or CSV adapter",
    },
    {
      id: "markets",
      label: "Prediction markets",
      state: "demo",
      latency: "public",
      detail: "Polymarket public market-data adapter",
    },
  ],
  predictionMarkets: [
    {
      label: "Democratic House control",
      probability: 63,
      change: 4.2,
      source: "Demo market prior",
    },
    {
      label: "Republican Senate control",
      probability: 68,
      change: -1.8,
      source: "Demo market prior",
    },
    {
      label: "WTI above $110 in Q4",
      probability: 57,
      change: 6.1,
      source: "Demo energy contract",
    },
  ],
  tanker: {
    vessels: 0,
    flowIndex: 86,
    congestion: 74,
    darkActivity: 19,
    provider: "No AIS provider connected",
    feedState: "demo",
    analyticsState: "demo",
    latestPositionUpdate: null,
    ageMinutes: null,
    positions: [],
    chokepoints: [
      {
        id: "hormuz",
        name: "Strait of Hormuz",
        lon: 56.25,
        lat: 26.55,
        flow: 82,
        delta: -12.4,
        risk: "high",
      },
      {
        id: "malacca",
        name: "Strait of Malacca",
        lon: 103.5,
        lat: 1.8,
        flow: 91,
        delta: 3.8,
        risk: "normal",
      },
      {
        id: "suez",
        name: "Suez / SUMED",
        lon: 32.55,
        lat: 30.6,
        flow: 69,
        delta: -5.2,
        risk: "watch",
      },
      {
        id: "bab",
        name: "Bab el-Mandeb",
        lon: 43.3,
        lat: 12.6,
        flow: 61,
        delta: -8.7,
        risk: "high",
      },
      {
        id: "panama",
        name: "Panama Canal",
        lon: -79.6,
        lat: 9.1,
        flow: 77,
        delta: 1.4,
        risk: "normal",
      },
    ],
  },
  polls: {
    cycle: "2026 U.S. midterms",
    electionDate: "2026-11-03",
    genericBallotDem: 47.3,
    genericBallotRep: 40.3,
    margin: 7.0,
    presidentialApproval: 39.4,
    sample: 18,
    source: "Illustrative snapshot based on public July 2026 aggregations",
    state: "demo",
  },
  timeline: {
    labels: [
      "Nov",
      "",
      "",
      "",
      "Dec",
      "",
      "",
      "",
      "Jan",
      "",
      "",
      "",
      "Feb",
      "",
      "",
      "",
      "Mar",
      "",
      "",
      "",
      "Apr",
      "",
      "",
      "",
      "May",
      "",
      "",
      "",
      "Now",
      "",
      "",
      "",
      "Aug",
      "",
      "",
      "Sep",
    ],
    observed,
    forecast: full,
    low: full.map((value, index) => Number((value - uncertainty[index]).toFixed(1))),
    high: full.map((value, index) => Number((value + uncertainty[index]).toFixed(1))),
    gasMedian: full.map((value, index) =>
      Number((2.72 + (value - 70) * 0.016 + Math.sin(index / 2.3) * 0.05).toFixed(2)),
    ),
    gasLow: full.map((value, index) =>
      Number((2.39 + (value - 70) * 0.014 + Math.sin(index / 2.3) * 0.04).toFixed(2)),
    ),
    gasHigh: full.map((value, index) =>
      Number((3.18 + (value - 70) * 0.021 + Math.sin(index / 2.1) * 0.08).toFixed(2)),
    ),
    gasObservedCount: observed.length,
  },
  attribution: [
    {
      name: "Chokepoint flow shock",
      value: 4.8,
      note: "Hormuz and Bab el-Mandeb throughput",
    },
    {
      name: "Futures momentum",
      value: 2.6,
      note: "5/20-day slope and term structure",
    },
    {
      name: "Pump-price pass-through",
      value: 1.1,
      note: "PADD median with asymmetric lag",
    },
    {
      name: "Inventory / macro",
      value: -1.7,
      note: "Stocks, USD and demand proxy",
    },
    {
      name: "Market + election prior",
      value: 0.9,
      note: "Scenario weight, not direct causality",
    },
  ],
  alerts: [
    {
      time: "11:42Z",
      severity: "high",
      title: "Hormuz flow anomaly",
      detail: "Estimated crude-carrier throughput is 12.4% below its trailing baseline.",
    },
    {
      time: "10:18Z",
      severity: "watch",
      title: "Model spread widening",
      detail: "Tree and Bayesian forecasts diverged beyond the 30-day median spread.",
    },
    {
      time: "08:06Z",
      severity: "info",
      title: "PADD 5 lag detected",
      detail: "Retail gasoline response remains elevated versus the national median.",
    },
  ],
};
