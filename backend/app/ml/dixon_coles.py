from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import exp, factorial, log

import numpy as np


@dataclass(frozen=True)
class TeamStrength:
    alpha: float
    beta: float


def time_decay_weight(current_time: datetime, match_time: datetime, phi: float) -> float:
    delta_days = max((current_time - match_time).total_seconds() / 86400.0, 0.0)
    return exp(-phi * delta_days)


def tau(x: int, y: int, d: float) -> float:
    if x == 0 and y == 0:
        return 1.0 - (x * y * d)
    if x == 0 and y == 1:
        return 1.0 + (x * d)
    if x == 1 and y == 0:
        return 1.0 + (y * d)
    if x == 1 and y == 1:
        return 1.0 - d
    return 1.0


def expected_goals(alpha_home: float, beta_away: float, gamma_home_advantage: float) -> float:
    return max(exp(alpha_home + beta_away + gamma_home_advantage), 1e-6)


def away_expected_goals(alpha_away: float, beta_home: float) -> float:
    return max(exp(alpha_away + beta_home), 1e-6)


def score_probability_matrix(
    home_strength: TeamStrength,
    away_strength: TeamStrength,
    d: float,
    gamma_home_advantage: float = 0.1,
    max_goals: int = 6,
) -> dict[str, float]:
    home_lambda = expected_goals(home_strength.alpha, away_strength.beta, gamma_home_advantage)
    away_lambda = away_expected_goals(away_strength.alpha, home_strength.beta)
    probabilities: dict[str, float] = {}

    for home_goals in range(max_goals + 1):
        for away_goals in range(max_goals + 1):
            home_term = (home_lambda**home_goals) * exp(-home_lambda) / factorial(home_goals)
            away_term = (away_lambda**away_goals) * exp(-away_lambda) / factorial(away_goals)
            score_probability = tau(home_goals, away_goals, d) * home_term * away_term
            probabilities[f"{home_goals}-{away_goals}"] = float(max(score_probability, 0.0))

    total = sum(probabilities.values()) or 1.0
    return {score: value / total for score, value in probabilities.items()}


def estimate_strengths_from_features(home_attack: float, away_defense: float) -> TeamStrength:
    return TeamStrength(alpha=log(max(home_attack, 1e-6)), beta=log(max(away_defense, 1e-6)))


def scoreline_from_distribution(distribution: dict[str, float]) -> str:
    return max(distribution.items(), key=lambda item: item[1])[0] if distribution else "0-0"


def blend_lambdas(base_lambda: float, adjustment: float) -> float:
    return max(base_lambda + adjustment, 1e-6)


def normalize_probabilities(probabilities: dict[str, float]) -> dict[str, float]:
    total = sum(probabilities.values()) or 1.0
    return {key: value / total for key, value in probabilities.items()}


def vectorize_score_probabilities(home_lambda: float, away_lambda: float, max_goals: int = 6) -> np.ndarray:
    scores = np.arange(max_goals + 1)
    home_component = np.exp(-home_lambda) * np.power(home_lambda, scores) / np.vectorize(factorial)(scores)
    away_component = np.exp(-away_lambda) * np.power(away_lambda, scores) / np.vectorize(factorial)(scores)
    return np.outer(home_component, away_component)

