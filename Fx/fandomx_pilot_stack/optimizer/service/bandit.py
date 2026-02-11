from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Tuple
import random

@dataclass
class BanditArm:
    alpha: float = 1.0
    beta: float = 1.0

class ThompsonBandit:
    """Thompson Sampling bandit storing Beta(alpha,beta) per decision key."""
    def __init__(self, seed: int = 7):
        self.arms: Dict[str, BanditArm] = {}
        random.seed(seed)

    def _arm(self, key: str) -> BanditArm:
        if key not in self.arms:
            self.arms[key] = BanditArm()
        return self.arms[key]

    def sample_multiplier(self, key: str, lo: float = 0.6, hi: float = 1.6) -> float:
        """Maps sampled success probability to a multiplier range."""
        arm = self._arm(key)
        p = random.betavariate(arm.alpha, arm.beta)  # 0..1
        return lo + (hi - lo) * p

    def update(self, key: str, success: bool, weight: float = 1.0) -> None:
        arm = self._arm(key)
        if success:
            arm.alpha += weight
        else:
            arm.beta += weight

    def export_state(self) -> Dict[str, Tuple[float, float]]:
        return {k: (v.alpha, v.beta) for k, v in self.arms.items()}

    def import_state(self, state: Dict[str, Tuple[float, float]]) -> None:
        self.arms = {k: BanditArm(alpha=a, beta=b) for k, (a, b) in state.items()}
