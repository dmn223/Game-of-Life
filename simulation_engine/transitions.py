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
        result = cells.copy()
        unresolved = np.ones(cells.shape, dtype=bool)

        for transition in self._sorted_transitions:
            source_idx = self.spec.get_state_index(transition.from_state)
            target_idx = self.spec.get_state_index(transition.to_state)
            neighbor_counts_for_state = neighbor_counts[transition.neighbor_state]
            matches = (
                unresolved
                & (cells == source_idx)
                & (neighbor_counts_for_state >= transition.min_count)
                & (neighbor_counts_for_state <= transition.max_count)
            )
            result[matches] = target_idx
            unresolved[matches] = False

        return result
