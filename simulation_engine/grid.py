"""Reprezentarea gridului de simulare.

Gridul este o matrice NumPy 2D unde fiecare celulă conține
indexul numeric al stării sale (conform ordinii din spec.states).
"""

from __future__ import annotations

import numpy as np

from models.spec import CellularAutomatonSpec


class Grid:
    """Gridul 2D al automatului celular.

    Attributes:
        spec: Specificația automatului.
        cells: Matricea numpy cu stările celulelor (indici numerici).
        width: Lățimea gridului.
        height: Înălțimea gridului.
    """

    def __init__(self, spec: CellularAutomatonSpec) -> None:
        """Inițializează gridul cu starea default.

        Args:
            spec: Specificația automatului celular.
        """
        self.spec = spec
        self.width = spec.grid.width
        self.height = spec.grid.height

        # Indexul numeric al stării default
        default_idx = spec.get_state_index(spec.default_state)
        self.cells: np.ndarray = np.full(
            (self.height, self.width), default_idx, dtype=np.int8
        )

    def set_cell(self, row: int, col: int, state_name: str) -> None:
        """Setează starea unei celule specifice.

        Args:
            row: Rândul celulei (0-indexed).
            col: Coloana celulei (0-indexed).
            state_name: Numele stării.
        """
        state_idx = self.spec.get_state_index(state_name)
        self.cells[row, col] = state_idx

    def get_cell(self, row: int, col: int) -> str:
        """Returnează numele stării unei celule.

        Args:
            row: Rândul celulei.
            col: Coloana celulei.

        Returns:
            Numele stării celulei.
        """
        state_idx = self.cells[row, col]
        return self.spec.states[state_idx].name

    def randomize(self, density: float = 0.3) -> None:
        """Populează gridul aleatoriu.

        Args:
            density: Probabilitatea ca o celulă să fie în prima stare non-default.
        """
        default_idx = self.spec.get_state_index(self.spec.default_state)
        # Găsește prima stare non-default
        non_default_idx = next(
            i for i in range(len(self.spec.states)) if i != default_idx
        )
        random_mask = np.random.random((self.height, self.width)) < density
        self.cells = np.where(random_mask, non_default_idx, default_idx).astype(
            np.int8
        )

    def clear(self) -> None:
        """Resetează toate celulele la starea default."""
        default_idx = self.spec.get_state_index(self.spec.default_state)
        self.cells.fill(default_idx)

    def to_text(self) -> str:
        """Reprezentare text a gridului."""
        lines = []
        for row in range(self.height):
            line = ""
            for col in range(self.width):
                state_idx = self.cells[row, col]
                line += self.spec.states[state_idx].symbol
            lines.append(line)
        return "\n".join(lines)
