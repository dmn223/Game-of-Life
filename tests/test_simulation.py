"""Teste pentru grid și motorul de simulare al automatului celular."""

import json
from pathlib import Path

import pytest
import numpy as np

from models.spec import (
    CellState,
    CellularAutomatonSpec,
    TransitionCondition,
)
from simulation_engine.grid import Grid
from simulation_engine.engine import Simulator

EXAMPLES_DIR = Path(__file__).parent.parent / "models" / "examples"


def load_example(filename):
    with (EXAMPLES_DIR / filename).open(encoding="utf-8") as file:
        return CellularAutomatonSpec(**json.load(file))


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

    def test_randomize_is_reproducible(self, gol_spec):
        first = Grid(gol_spec)
        second = Grid(gol_spec)
        first.randomize(density=0.4, seed=17)
        second.randomize(density=0.4, seed=17)
        assert np.array_equal(first.cells, second.cells)

    def test_randomize_rejects_invalid_density(self, gol_spec):
        with pytest.raises(ValueError):
            Grid(gol_spec).randomize(density=1.1)


class TestSimulator:
    def test_game_of_life_blinker_advances_one_generation(self):
        simulator = Simulator(load_example("game_of_life.json"))
        for col in (11, 12, 13):
            simulator.grid.set_cell(12, col, "alive")

        simulator.step()

        assert simulator.generation == 1
        alive = simulator.spec.get_state_index("alive")
        assert simulator.grid.cells[12, 12] == alive
        assert [simulator.grid.cells[row, 12] for row in (11, 12, 13)] == [alive] * 3
        assert simulator.grid.cells[12, 11] == simulator.spec.get_state_index("dead")

    def test_seeds_birth_and_death_rules(self):
        simulator = Simulator(load_example("seeds.json"))
        simulator.grid.set_cell(11, 12, "alive")
        simulator.grid.set_cell(12, 11, "alive")

        simulator.step()

        assert simulator.grid.get_cell(12, 12) == "alive"
        assert simulator.grid.get_cell(11, 12) == "dead"
        assert simulator.grid.get_cell(12, 11) == "dead"

    def test_brians_brain_three_state_transition(self):
        simulator = Simulator(load_example("brians_brain.json"))
        simulator.grid.set_cell(11, 12, "on")
        simulator.grid.set_cell(13, 12, "on")
        simulator.grid.set_cell(11, 11, "refractory")

        simulator.step()

        assert simulator.grid.get_cell(12, 12) == "on"
        assert simulator.grid.get_cell(11, 12) == "refractory"
        assert simulator.grid.get_cell(11, 11) == "off"

    def test_checkpoint_restores_spec_generation_and_grid(self, tmp_path):
        simulator = Simulator(load_example("game_of_life.json"))
        simulator.grid.set_cell(12, 11, "alive")
        simulator.grid.set_cell(12, 12, "alive")
        simulator.grid.set_cell(12, 13, "alive")
        simulator.step()
        checkpoint = tmp_path / "checkpoint.json"

        simulator.save_checkpoint(checkpoint)
        restored = Simulator.load_checkpoint(checkpoint)

        assert restored.generation == simulator.generation
        assert restored.spec == simulator.spec
        assert np.array_equal(restored.grid.cells, simulator.grid.cells)
        assert np.array_equal(restored.step(), simulator.step())

    def test_checkpoint_rejects_wrong_grid_shape(self):
        simulator = Simulator(load_example("game_of_life.json"))
        checkpoint = simulator.get_state_as_dict()
        checkpoint["grid"] = [[0, 1]]

        with pytest.raises(ValueError, match="Dimensiunea gridului"):
            Simulator.from_state_dict(checkpoint)
