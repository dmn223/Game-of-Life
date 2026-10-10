"""Q1: Care este starea după N iterații?

Rulează simularea N pași și returnează starea completă a gridului.
"""

from __future__ import annotations

import numpy as np


class StateQuery:
    """Determină starea gridului după un număr dat de iterații."""

    def query(self, cells: np.ndarray, target_generation: int) -> np.ndarray:
        """Returnează starea gridului la generația target.

        Args:
            cells: Starea inițială.
            target_generation: Numărul de generații de simulat.

        Returns:
            Matricea cu starea la generația target.
        """
        # TODO: Implementare (delegare către Simulator.run())
        raise NotImplementedError("StateQuery.query() — de implementat")
