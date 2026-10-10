"""Q5: Intră simularea într-un ciclu repetitiv?

Detectează dacă secvența de stări intră într-un ciclu periodic
(oscilator), și dacă da, returnează lungimea ciclului.
Utilizează algoritmul Floyd (tortoise and hare) sau
stocarea hash-urilor stărilor.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class CycleResult:
    """Rezultatul detectării ciclurilor."""

    found: bool
    cycle_length: Optional[int] = None
    cycle_start_generation: Optional[int] = None


class CycleDetector:
    """Detectează cicluri în evoluția automatului celular."""

    def detect(
        self,
        max_generations: int = 1000,
    ) -> CycleResult:
        """Caută cicluri repetitive.

        Args:
            max_generations: Limita de generații de verificat.

        Returns:
            CycleResult cu lungimea ciclului și generația de start.
        """
        # TODO: Implementare cu hash-uri de stări (set de np.ndarray.tobytes())
        raise NotImplementedError(
            "CycleDetector.detect() — de implementat"
        )
