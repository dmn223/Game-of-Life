"""Calculul vecinătăților pentru gridul de simulare.

Suportă vecinătățile Moore (8 vecini) și Von Neumann (4 vecini),
cu diferite condiții la margini (dead, wrap, mirror).
"""

from __future__ import annotations

import numpy as np
from scipy import signal  # type: ignore[import-untyped]

from models.spec import (
    BoundaryCondition,
    CellularAutomatonSpec,
    NeighborhoodType,
)


class NeighborCalculator:
    """Calculează numărul de vecini pentru fiecare celulă."""

    # Kernel-uri de convoluție pentru tipurile de vecinătate
    MOORE_KERNEL = np.array(
        [[1, 1, 1],
         [1, 0, 1],
         [1, 1, 1]], dtype=np.int8
    )

    VON_NEUMANN_KERNEL = np.array(
        [[0, 1, 0],
         [1, 0, 1],
         [0, 1, 0]], dtype=np.int8
    )

    def __init__(self, spec: CellularAutomatonSpec) -> None:
        self.spec = spec
        self.kernel = (
            self.MOORE_KERNEL
            if spec.neighborhood == NeighborhoodType.MOORE
            else self.VON_NEUMANN_KERNEL
        )

    def count_neighbors(
        self, cells: np.ndarray
    ) -> dict[str, np.ndarray]:
        """Numără vecinii de fiecare tip de stare pentru fiecare celulă.

        Args:
            cells: Matricea gridului (indici de stări).

        Returns:
            Dicționar {state_name: matrice_counts} cu numărul de vecini
            în fiecare stare pentru fiecare celulă.
        """
        # TODO: Implementare cu scipy.signal.convolve2d
        # pentru eficiență (convoluție vectorizată)
        # Trebuie gestionată condiția la margini (boundary)
        raise NotImplementedError(
            "NeighborCalculator.count_neighbors() — de implementat"
        )
