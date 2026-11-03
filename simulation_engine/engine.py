"""Motorul principal de simulare.

Orchestează calculul generațiilor succesive ale automatului celular
pe baza specificației formale (CellularAutomatonSpec).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

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

    def get_state_as_dict(self) -> dict[str, Any]:
        """Returnează checkpoint complet, serializabil în JSON."""
        return {
            "spec": self.spec.model_dump(mode="json"),
            "generation": self.generation,
            "grid": self.grid.cells.tolist(),
            "width": self.spec.grid.width,
            "height": self.spec.grid.height,
        }

    @classmethod
    def from_state_dict(
        cls, state: dict[str, Any], keep_history: bool = False
    ) -> "Simulator":
        """Reface un simulator dintr-un checkpoint produs de get_state_as_dict."""
        if "spec" not in state:
            raise ValueError("Checkpoint-ul nu conține specificația automatului")

        spec = CellularAutomatonSpec.model_validate(state["spec"])
        simulator = cls(spec, keep_history=keep_history)
        generation = state.get("generation")
        if not isinstance(generation, int) or generation < 0:
            raise ValueError("generation trebuie să fie un întreg nenegativ")

        cells = np.asarray(state.get("grid"))
        expected_shape = (spec.grid.height, spec.grid.width)
        if cells.shape != expected_shape:
            raise ValueError(
                f"Dimensiunea gridului {cells.shape} nu corespunde {expected_shape}"
            )
        if not np.issubdtype(cells.dtype, np.integer):
            raise ValueError("Gridul checkpoint-ului trebuie să conțină indici întregi")
        if np.any(cells < 0) or np.any(cells >= len(spec.states)):
            raise ValueError("Gridul checkpoint-ului conține indici de stare invalizi")

        simulator.grid.cells = cells.astype(np.int8, copy=True)
        simulator.generation = generation
        return simulator

    def save_checkpoint(self, path: str | Path) -> None:
        """Salvează specificația, generația și gridul curent într-un fișier JSON."""
        Path(path).write_text(
            json.dumps(self.get_state_as_dict(), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    @classmethod
    def load_checkpoint(
        cls, path: str | Path, keep_history: bool = False
    ) -> "Simulator":
        """Încarcă un simulator dintr-un checkpoint JSON."""
        try:
            state = json.loads(Path(path).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise ValueError(f"Nu s-a putut citi checkpoint-ul: {exc}") from exc
        if not isinstance(state, dict):
            raise ValueError("Checkpoint-ul JSON trebuie să fie un obiect")
        return cls.from_state_dict(state, keep_history=keep_history)
