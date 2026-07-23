"""Feature engineering for StraitSignal's oil-futures models.

The module accepts a daily normalized table and deliberately keeps observed,
inferred, and scenario variables separate. Demo generation is deterministic
and is never presented as live market data.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

REQUIRED_COLUMNS = {
    "date",
    "wti",
    "gas_median",
    "gas_low",
    "gas_high",
    "tanker_flow",
    "congestion",
    "dark_activity",
    "generic_ballot_margin",
    "house_control_prob",
    "inventory_change",
    "dxy",
}


@dataclass(frozen=True)
class FeatureSet:
    frame: pd.DataFrame
    feature_columns: list[str]
    target_column: str
    horizon: int


def load_daily_frame(path: str | Path) -> pd.DataFrame:
    source = Path(path)
    if source.suffix.lower() == ".parquet":
        frame = pd.read_parquet(source)
    else:
        frame = pd.read_csv(source)
    missing = REQUIRED_COLUMNS.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing normalized columns: {sorted(missing)}")
    frame["date"] = pd.to_datetime(frame["date"], utc=True)
    return frame.sort_values("date").drop_duplicates("date", keep="last")


def make_demo_frame(rows: int = 980, seed: int = 42) -> pd.DataFrame:
    """Create a regime-changing synthetic table for development and CI."""

    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2022-01-03", periods=rows, tz="UTC")
    regime = np.where(np.arange(rows) > rows * 0.67, 0.00022, 0.0)
    flow_shock = np.zeros(rows)
    for start, duration, magnitude in [(180, 23, -1.3), (510, 18, -1.8), (770, 30, -2.2)]:
        flow_shock[start : start + duration] = magnitude

    tanker_flow = 100 + np.cumsum(rng.normal(0, 0.28, rows)) + flow_shock * 4.8
    congestion = 52 + rng.normal(0, 5.2, rows) - flow_shock * 8
    dark_activity = 8 + rng.poisson(2.2, rows) - flow_shock * 2.5
    inventory_change = rng.normal(0, 3.1, rows)
    dxy = 102 + np.cumsum(rng.normal(0, 0.12, rows))
    poll_margin = np.clip(np.cumsum(rng.normal(0, 0.06, rows)), -8, 8)
    market_prob = np.clip(50 + poll_margin * 1.7 + rng.normal(0, 2.5, rows), 10, 90)

    returns = (
        rng.normal(0.0003 + regime, 0.014, rows)
        - flow_shock * 0.006
        - inventory_change * 0.0007
        - np.r_[0, np.diff(dxy)] * 0.002
    )
    wti = 72 * np.exp(np.cumsum(returns))
    gas_base = 2.4 + pd.Series(wti).rolling(16, min_periods=1).mean().to_numpy() * 0.016
    gas_median = gas_base + rng.normal(0, 0.035, rows)
    gas_low = gas_median - (0.27 + rng.normal(0, 0.015, rows))
    gas_high = gas_median + (0.52 + congestion * 0.002 + rng.normal(0, 0.025, rows))

    return pd.DataFrame(
        {
            "date": dates,
            "wti": wti,
            "gas_median": gas_median,
            "gas_low": gas_low,
            "gas_high": gas_high,
            "tanker_flow": tanker_flow,
            "congestion": congestion,
            "dark_activity": dark_activity,
            "generic_ballot_margin": poll_margin,
            "house_control_prob": market_prob,
            "inventory_change": inventory_change,
            "dxy": dxy,
        }
    )


def engineer_features(frame: pd.DataFrame, horizon: int = 21) -> FeatureSet:
    df = frame.copy().sort_values("date").reset_index(drop=True)
    df["wti_return_1d"] = np.log(df["wti"]).diff()
    df["target_return_21d"] = np.log(df["wti"].shift(-horizon) / df["wti"])

    for lag in (1, 3, 5, 10, 21):
        df[f"wti_return_lag_{lag}"] = df["wti_return_1d"].shift(lag)
        df[f"flow_lag_{lag}"] = df["tanker_flow"].diff().shift(lag)
        df[f"inventory_lag_{lag}"] = df["inventory_change"].shift(lag)

    for window in (5, 10, 21, 63):
        df[f"wti_momentum_{window}"] = np.log(df["wti"] / df["wti"].shift(window))
        df[f"wti_vol_{window}"] = df["wti_return_1d"].rolling(window).std()
        df[f"flow_z_{window}"] = (
            (df["tanker_flow"] - df["tanker_flow"].rolling(window).mean())
            / df["tanker_flow"].rolling(window).std()
        )

    df["gas_regional_spread"] = df["gas_high"] - df["gas_low"]
    df["gas_change"] = df["gas_median"].diff()
    df["wti_up"] = df["wti_return_1d"].clip(lower=0)
    df["wti_down"] = df["wti_return_1d"].clip(upper=0)
    df["flow_congestion_interaction"] = (
        df["flow_z_21"] * (df["congestion"] - df["congestion"].rolling(63).median())
    )
    df["ais_silence_rate"] = df["dark_activity"] / df["dark_activity"].rolling(63).mean()
    df["market_poll_gap"] = (
        (df["house_control_prob"] - 50) / 10 - df["generic_ballot_margin"]
    )
    df["political_prior"] = np.tanh(df["market_poll_gap"] / 5)
    df["dxy_change_5d"] = df["dxy"].pct_change(5)

    excluded = REQUIRED_COLUMNS | {"target_return_21d", "date"}
    feature_columns = [
        column
        for column in df.columns
        if column not in excluded and pd.api.types.is_numeric_dtype(df[column])
    ]

    model_frame = df[["date", "wti", "target_return_21d", *feature_columns]].dropna()
    return FeatureSet(
        frame=model_frame,
        feature_columns=feature_columns,
        target_column="target_return_21d",
        horizon=horizon,
    )
