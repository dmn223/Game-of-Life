"""Q2: Când atinge sistemul o stare stabilă?

Detectează momentul în care gridul nu se mai modifică
între două generații consecutive (still life).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class SteadyStateResult:
    """Rezultatul detectării stării stabile."""

    found: bool
    generation: Optional[int] = None
    final_state: Optional[np.ndarray] = None


class SteadyStateDetector:
    """Detectează când simularea atinge o stare stabilă."""

    def detect(
        self,
        max_generations: int = 1000,
    ) -> SteadyStateResult:
        """Caută starea stabilă în limita de generații dată.

        Args:
            max_generations: Numărul maxim de generații de verificat.

        Returns:
            SteadyStateResult cu generația la care s-a stabilizat.
        """
        # TODO: Implementare — comparare grid curent cu grid anterior
        raise NotImplementedError(
            "SteadyStateDetector.detect() — de implementat"
        )
