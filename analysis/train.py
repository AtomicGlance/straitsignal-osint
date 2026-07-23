"""Walk-forward model training, ensemble weighting, and conformal calibration."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict, dataclass
from pathlib import Path

import joblib
import numpy as np
from sklearn.base import clone
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import BayesianRidge, ElasticNet
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from features import engineer_features, load_daily_frame, make_demo_frame


@dataclass
class ModelScore:
    model: str
    mae: float
    rmse: float
    directional_accuracy: float
    folds: int


def models() -> dict[str, Pipeline]:
    common = [("impute", SimpleImputer(strategy="median"))]
    return {
        "elastic_net": Pipeline(
            [
                *common,
                ("scale", StandardScaler()),
                ("model", ElasticNet(alpha=0.002, l1_ratio=0.25, max_iter=20_000)),
            ]
        ),
        "bayesian_ridge": Pipeline(
            [*common, ("scale", StandardScaler()), ("model", BayesianRidge())]
        ),
        "gradient_boost": Pipeline(
            [
                *common,
                (
                    "model",
                    HistGradientBoostingRegressor(
                        learning_rate=0.045,
                        max_iter=350,
                        max_leaf_nodes=18,
                        l2_regularization=0.8,
                        random_state=42,
                    ),
                ),
            ]
        ),
    }


def walk_forward(feature_set, splits: int = 6):
    frame = feature_set.frame
    X = frame[feature_set.feature_columns]
    y = frame[feature_set.target_column]
    splitter = TimeSeriesSplit(n_splits=splits, gap=feature_set.horizon)
    predictions: dict[str, np.ndarray] = {
        name: np.full(len(frame), np.nan) for name in models()
    }
    scores: list[ModelScore] = []

    for name, estimator in models().items():
        fold_count = 0
        for train_index, test_index in splitter.split(X):
            fitted = clone(estimator).fit(X.iloc[train_index], y.iloc[train_index])
            predictions[name][test_index] = fitted.predict(X.iloc[test_index])
            fold_count += 1

        mask = np.isfinite(predictions[name])
        actual = y.to_numpy()[mask]
        predicted = predictions[name][mask]
        scores.append(
            ModelScore(
                model=name,
                mae=float(mean_absolute_error(actual, predicted)),
                rmse=float(mean_squared_error(actual, predicted) ** 0.5),
                directional_accuracy=float(np.mean(np.sign(actual) == np.sign(predicted))),
                folds=fold_count,
            )
        )

    return predictions, scores


def fit_ensemble(feature_set, predictions, scores, data_mode: str):
    frame = feature_set.frame
    y = frame[feature_set.target_column].to_numpy()
    valid = np.logical_and.reduce([np.isfinite(values) for values in predictions.values()])
    inverse_errors = np.array([1 / max(score.mae, 1e-6) for score in scores])
    weights = inverse_errors / inverse_errors.sum()
    matrix = np.column_stack([predictions[score.model] for score in scores])
    ensemble_oof = matrix[valid] @ weights
    residuals = np.abs(y[valid] - ensemble_oof)
    conformal_q80 = float(np.quantile(residuals, 0.80, method="higher"))
    coverage80 = float(np.mean(residuals <= conformal_q80))

    fitted = {}
    X = frame[feature_set.feature_columns]
    target = frame[feature_set.target_column]
    for score in scores:
        fitted[score.model] = clone(models()[score.model]).fit(X, target)

    latest_x = X.iloc[[-1]]
    latest_predictions = np.array(
        [fitted[score.model].predict(latest_x)[0] for score in scores]
    )
    ensemble_return = float(latest_predictions @ weights)
    current_wti = float(frame["wti"].iloc[-1])
    point = float(current_wti * np.exp(ensemble_return))
    low = float(current_wti * np.exp(ensemble_return - conformal_q80))
    high = float(current_wti * np.exp(ensemble_return + conformal_q80))

    report = {
        "data_mode": data_mode,
        "horizon_trading_days": feature_set.horizon,
        "rows": len(frame),
        "feature_count": len(feature_set.feature_columns),
        "walk_forward": [asdict(score) for score in scores],
        "ensemble_weights": {
            score.model: float(weight) for score, weight in zip(scores, weights)
        },
        "conformal": {
            "nominal_coverage": 0.80,
            "observed_coverage": coverage80,
            "absolute_log_return_quantile": conformal_q80,
        },
        "latest": {
            "as_of": frame["date"].iloc[-1].isoformat(),
            "current_wti": current_wti,
            "forecast": point,
            "low": low,
            "high": high,
            "model_forecasts": {
                score.model: float(current_wti * np.exp(value))
                for score, value in zip(scores, latest_predictions)
            },
        },
        "warnings": [
            "Synthetic demo data is not a market forecast."
            if not args.input
            else "Forecasts are uncertain and must not be treated as financial advice.",
            "Prediction-market and polling features are bounded scenario priors, not causal claims.",
            "Recalibrate intervals after any material provider or feature-contract change.",
        ],
    }
    return fitted, report


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="Normalized CSV or parquet daily table")
    parser.add_argument("--output", type=Path, default=Path("analysis/artifacts"))
    parser.add_argument("--horizon", type=int, default=21)
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    raw = load_daily_frame(args.input) if args.input else make_demo_frame()
    feature_set = engineer_features(raw, horizon=args.horizon)
    predictions, scores = walk_forward(feature_set)
    fitted_models, report = fit_ensemble(
        feature_set,
        predictions,
        scores,
        data_mode="user-supplied" if args.input else "synthetic-demo",
    )

    args.output.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "models": fitted_models,
            "features": feature_set.feature_columns,
            "horizon": feature_set.horizon,
        },
        args.output / "ensemble.joblib",
    )
    (args.output / "model_report.json").write_text(
        json.dumps(report, indent=2), encoding="utf-8"
    )
    print(json.dumps(report["latest"], indent=2))
