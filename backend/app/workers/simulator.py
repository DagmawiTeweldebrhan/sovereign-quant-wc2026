from __future__ import annotations

import numpy as np


def run_monte_carlo_engine(
    home_lambda: float,
    away_lambda: float,
    tau_d: float,
    iterations: int = 100_000,
) -> dict[str, object]:
    """
    Executes a vectorized Monte Carlo match simulation.
    """

    try:
        safe_home_lambda = float(max(home_lambda, 1e-6))
        safe_away_lambda = float(max(away_lambda, 1e-6))
        safe_iterations = int(max(iterations, 1))
        rng = np.random.default_rng()

        raw_home_goals = rng.poisson(safe_home_lambda, safe_iterations)
        raw_away_goals = rng.poisson(safe_away_lambda, safe_iterations)

        adjustment = np.ones(safe_iterations, dtype=float)
        adjustment = np.where(
            (raw_home_goals == 0) & (raw_away_goals == 0),
            np.clip(1.0 - (safe_home_lambda * safe_away_lambda * tau_d), 0.05, 5.0),
            adjustment,
        )
        adjustment = np.where(
            (raw_home_goals == 0) & (raw_away_goals == 1),
            np.clip(1.0 + (safe_home_lambda * tau_d), 0.05, 5.0),
            adjustment,
        )
        adjustment = np.where(
            (raw_home_goals == 1) & (raw_away_goals == 0),
            np.clip(1.0 + (safe_away_lambda * tau_d), 0.05, 5.0),
            adjustment,
        )
        adjustment = np.where(
            (raw_home_goals == 1) & (raw_away_goals == 1),
            np.clip(1.0 - tau_d, 0.05, 5.0),
            adjustment,
        )

        total_weight = float(adjustment.sum()) or float(safe_iterations)
        home_wins = float(adjustment[raw_home_goals > raw_away_goals].sum() / total_weight)
        draws = float(adjustment[raw_home_goals == raw_away_goals].sum() / total_weight)
        away_wins = float(adjustment[raw_home_goals < raw_away_goals].sum() / total_weight)

        score_pairs = np.char.add(np.char.add(raw_home_goals.astype(str), "-"), raw_away_goals.astype(str))
        unique_scorelines, inverse = np.unique(score_pairs, return_inverse=True)
        weighted_counts = np.bincount(inverse, weights=adjustment, minlength=unique_scorelines.size)
        distribution = {
            scoreline: float(weight / total_weight)
            for scoreline, weight in zip(unique_scorelines, weighted_counts, strict=False)
        }
        most_probable_scoreline = max(distribution.items(), key=lambda item: item[1])[0] if distribution else "0-0"

        return {
            "home_win": home_wins,
            "draw": draws,
            "away_win": away_wins,
            "most_probable_scoreline": most_probable_scoreline,
            "distribution": distribution,
        }
    except Exception:
        return {
            "home_win": 0.0,
            "draw": 0.0,
            "away_win": 0.0,
            "most_probable_scoreline": "0-0",
            "distribution": {"0-0": 1.0},
        }

