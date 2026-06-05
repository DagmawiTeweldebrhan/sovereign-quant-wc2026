from __future__ import annotations

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from sklearn.isotonic import IsotonicRegression

try:
    from lightgbm import LGBMRegressor
except Exception:  # pragma: no cover - fallback for lean environments
    from sklearn.ensemble import HistGradientBoostingRegressor


def shin_clean_probabilities(raw_odds: dict[str, float]) -> dict[str, float]:
    inverted = {key: 1.0 / max(value, 1e-6) for key, value in raw_odds.items()}
    total = sum(inverted.values()) or 1.0
    return {key: value / total for key, value in inverted.items()}


def build_feature_vector(feature_map: dict[str, float]) -> np.ndarray:
    ordered_keys = sorted(feature_map)
    return np.array([feature_map[key] for key in ordered_keys], dtype=float)


@dataclass
class CalibratedOutcomeModel:
    regressor: Any
    calibrator: IsotonicRegression

    def predict(self, feature_matrix: np.ndarray) -> np.ndarray:
        raw_predictions = np.asarray(self.regressor.predict(feature_matrix), dtype=float)
        return np.asarray(self.calibrator.predict(raw_predictions), dtype=float)


def build_probability_model() -> Any:
    try:
        return LGBMRegressor(
            n_estimators=250,
            learning_rate=0.05,
            max_depth=-1,
            random_state=42,
        )
    except TypeError:
        return HistGradientBoostingRegressor(
            max_iter=250,
            learning_rate=0.05,
            max_depth=6,
            random_state=42,
        )


def calibrate_probabilities(targets: np.ndarray, predictions: np.ndarray) -> IsotonicRegression:
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(predictions, targets)
    return calibrator


def blend_probability_triplet(home: float, draw: float, away: float) -> dict[str, float]:
    total = max(home + draw + away, 1e-9)
    return {"home_win": home / total, "draw": draw / total, "away_win": away / total}
