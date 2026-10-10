"""Motorul principal de simulare.

Orchestează calculul generațiilor succesive ale automatului celular
pe baza specificației formale (CellularAutomatonSpec).
"""

from __future__ import annotations

from typing import Optional

import numpy as np

from models.spec import CellularAutomatonSpec
from simulation_engine.grid import Grid
from simulation_engine.neighbors import NeighborCalculator
from simulation_engine.transitions import TransitionApplicator


class Simulator:
    """Motorul de simulare a automatului celular.

    Attributes:
        spec: Specificația automatului celular.
        grid: Gridul curent de simulare.
        generation: Numărul generației curente.
        history: Istoricul stărilor anterioare (opțional).
    """

    def __init__(
        self,
        spec: CellularAutomatonSpec,
        keep_history: bool = False,
    ) -> None:
        """Inițializează simulatorul.

        Args:
            spec: Specificația automatului celular.
            keep_history: Dacă True, stochează toate stările anterioare.
        """
        self.spec = spec
        self.grid = Grid(spec)
        self.generation: int = 0
        self.keep_history = keep_history
        self.history: list[np.ndarray] = []

        self._neighbor_calc = NeighborCalculator(spec)
        self._transition_app = TransitionApplicator(spec)

    def step(self) -> np.ndarray:
        """Calculează o singură generație.

        Returns:
            Matricea numpy cu starea nouă a gridului.
        """
        if self.keep_history:
            self.history.append(self.grid.cells.copy())

        # Calculează vecinătățile
        neighbor_counts = self._neighbor_calc.count_neighbors(self.grid.cells)

        # Aplică tranzițiile
        new_cells = self._transition_app.apply(
            self.grid.cells, neighbor_counts
        )

        self.grid.cells = new_cells
        self.generation += 1
        return new_cells

    def run(self, steps: int) -> np.ndarray:
        """Rulează mai multe generații.

        Args:
            steps: Numărul de generații de calculat.

        Returns:
            Starea finală a gridului.
        """
        for _ in range(steps):
            self.step()
        return self.grid.cells

    def reset(self) -> None:
        """Resetează simularea la starea inițială."""
        self.grid = Grid(self.spec)
        self.generation = 0
        self.history.clear()

    def get_state_as_dict(self) -> dict:
        """Returnează starea curentă ca dicționar serializabil."""
        return {
            "generation": self.generation,
            "grid": self.grid.cells.tolist(),
            "width": self.spec.grid.width,
            "height": self.spec.grid.height,
        }
