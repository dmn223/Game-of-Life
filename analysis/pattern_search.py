"""Q3: Apare vreodată o configurație specifică?

Caută un sub-pattern (matrice mică) în gridul de simulare
pe parcursul mai multor generații.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class PatternResult:
    """Rezultatul căutării de pattern."""

    found: bool
    generation: Optional[int] = None
    position: Optional[tuple[int, int]] = None  # (row, col) unde a fost găsit


class PatternSearcher:
    """Caută un sub-pattern specific în evoluția simulării."""

    def search(
        self,
        pattern: np.ndarray,
        max_generations: int = 1000,
    ) -> PatternResult:
        """Caută pattern-ul în gridul de simulare pe parcursul generațiilor.

        Args:
            pattern: Matricea sub-pattern de căutat.
            max_generations: Numărul maxim de generații de verificat.

        Returns:
            PatternResult cu locația și generația unde a fost găsit.
        """
        # TODO: Implementare cu sliding window pe grid
        raise NotImplementedError(
            "PatternSearcher.search() — de implementat"
        )
