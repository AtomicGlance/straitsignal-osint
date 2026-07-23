"""Lead/lag diagnostics for WTI, retail gasoline, and tanker-flow features."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from statsmodels.tsa.api import VAR
from statsmodels.tsa.stattools import grangercausalitytests

from features import load_daily_frame, make_demo_frame


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path, default=Path("analysis/artifacts/diagnostics.json"))
    parser.add_argument("--max-lag", type=int, default=21)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    frame = load_daily_frame(args.input) if args.input else make_demo_frame()
    daily = (
        frame.set_index("date")[["wti", "gas_median", "tanker_flow"]]
        .pct_change()
        .replace([np.inf, -np.inf], np.nan)
        .dropna()
    )
    fitted = VAR(daily).fit(maxlags=min(args.max_lag, 10), ic="aic")
    granger = grangercausalitytests(
        daily[["wti", "tanker_flow"]], maxlag=min(args.max_lag, 10), verbose=False
    )
    result = {
        "selected_var_lag": int(fitted.k_ar),
        "wti_from_flow_p_values": {
            str(lag): float(values[0]["ssr_ftest"][1]) for lag, values in granger.items()
        },
        "warning": (
            "Granger precedence is a predictive lead/lag diagnostic, not evidence of "
            "structural or political causality."
        ),
        "data_mode": "user-supplied" if args.input else "synthetic-demo",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
