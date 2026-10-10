"""Q4: Câte celule de tipul X există după N iterații?

Numără celulele într-o stare specifică la o generație dată.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class CountResult:
    """Rezultatul contorizării celulelor."""

    state_name: str
    count: int
    generation: int
    total_cells: int
    percentage: float


class CellCounter:
    """Numără celulele într-o stare specifică."""

    def count(
        self,
        cells: np.ndarray,
        state_index: int,
        state_name: str,
    ) -> CountResult:
        """Numără celulele în starea dată.

        Args:
            cells: Matricea gridului.
            state_index: Indexul numeric al stării.
            state_name: Numele stării.

        Returns:
            CountResult cu numărul și procentul de celule.
        """
        count = int(np.sum(cells == state_index))
        total = cells.size
        return CountResult(
            state_name=state_name,
            count=count,
            generation=0,  # se setează de apelant
            total_cells=total,
            percentage=round(count / total * 100, 2) if total > 0 else 0.0,
        )
