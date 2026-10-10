"""Teste placeholder pentru modulul simulation_engine/.

Se vor completa pe măsură ce motorul de simulare este implementat.
"""

import pytest
import numpy as np

from models.spec import (
    CellState,
    CellularAutomatonSpec,
    TransitionCondition,
)
from simulation_engine.grid import Grid


class TestGrid:
    """Teste pentru Grid."""

    @pytest.fixture
    def gol_spec(self):
        return CellularAutomatonSpec(
            name="GoL",
            states=[
                CellState(name="dead", color="#000000"),
                CellState(name="alive", color="#00ff88"),
            ],
            default_state="dead",
            transitions=[
                TransitionCondition(
                    from_state="alive", to_state="dead",
                    neighbor_state="alive", min_count=0, max_count=1,
                ),
            ],
        )

    def test_grid_creation(self, gol_spec):
        grid = Grid(gol_spec)
        assert grid.cells.shape == (50, 50)
        assert grid.cells.dtype == np.int8

    def test_grid_default_state(self, gol_spec):
        grid = Grid(gol_spec)
        # Toate celulele trebuie să fie în starea default (dead=0)
        assert np.all(grid.cells == 0)

    def test_set_cell(self, gol_spec):
        grid = Grid(gol_spec)
        grid.set_cell(5, 5, "alive")
        assert grid.get_cell(5, 5) == "alive"

    def test_clear(self, gol_spec):
        grid = Grid(gol_spec)
        grid.set_cell(5, 5, "alive")
        grid.clear()
        assert np.all(grid.cells == 0)
