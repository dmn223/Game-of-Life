"""Aplicarea regulilor de tranziție pe gridul de simulare.

Primește gridul curent și matricele de vecinătate,
aplicând regulile de tranziție pentru a genera starea următoare.
"""

from __future__ import annotations

import numpy as np

from models.spec import CellularAutomatonSpec


class TransitionApplicator:
    """Aplică regulile de tranziție pe grid."""

    def __init__(self, spec: CellularAutomatonSpec) -> None:
        self.spec = spec
        # Pre-procesare: sortare reguli după prioritate (descrescător)
        self._sorted_transitions = sorted(
            spec.transitions, key=lambda t: t.priority, reverse=True
        )

    def apply(
        self,
        cells: np.ndarray,
        neighbor_counts: dict[str, np.ndarray],
    ) -> np.ndarray:
        """Aplică tranzițiile și returnează gridul actualizat.

        Args:
            cells: Matricea curentă a gridului.
            neighbor_counts: Rezultatul NeighborCalculator.count_neighbors().

        Returns:
            Matricea numpy cu starea nouă a gridului.
        """
        # TODO: Implementare vectorizată cu NumPy
        # Strategia: pentru fiecare regulă (în ordine de prioritate),
        # se creează o mască booleană și se aplică tranziția
        raise NotImplementedError(
            "TransitionApplicator.apply() — de implementat"
        )
