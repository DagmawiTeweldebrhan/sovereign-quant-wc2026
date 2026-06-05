from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TacticalProfile:
    manager_id: str
    name: str
    preferred_formation: str
    ppda_factor: float
    defensive_line_height: float
    directness_index: float
    field_tilt_baseline: float
    system_elasticity: float = 0.5


def build_tactical_friction_features(manager_a: TacticalProfile, manager_b: TacticalProfile) -> dict[str, float]:
    return {
        "friction_press": manager_a.ppda_factor * manager_b.directness_index,
        "friction_backline": abs(manager_a.defensive_line_height - manager_b.defensive_line_height) / 75.0,
        "friction_directness": abs(manager_a.directness_index - manager_b.directness_index),
        "friction_field_tilt": abs(manager_a.field_tilt_baseline - manager_b.field_tilt_baseline),
        "elasticity_clash": abs(manager_a.system_elasticity - manager_b.system_elasticity),
    }


def tactical_pressure_index(features: dict[str, float]) -> float:
    values = list(features.values())
    return sum(values) / max(len(values), 1)

