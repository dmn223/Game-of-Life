"""Teste pentru modulul models/ — schema Pydantic."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from models.spec import (
    BoundaryCondition,
    CellState,
    CellularAutomatonSpec,
    GridConfig,
    NeighborhoodType,
    TransitionCondition,
)


class TestCellState:
    """Teste pentru CellState."""

    def test_valid_state(self):
        state = CellState(name="alive", color="#00ff88", symbol="O")
        assert state.name == "alive"
        assert state.color == "#00ff88"

    def test_invalid_color(self):
        with pytest.raises(ValidationError):
            CellState(name="alive", color="not-a-color")

    def test_empty_name(self):
        with pytest.raises(ValidationError):
            CellState(name="")


class TestTransitionCondition:
    """Teste pentru TransitionCondition."""

    def test_valid_transition(self):
        t = TransitionCondition(
            from_state="alive", to_state="dead",
            neighbor_state="alive", min_count=0, max_count=1,
        )
        assert t.from_state == "alive"

    def test_invalid_count_range(self):
        with pytest.raises(ValidationError):
            TransitionCondition(
                from_state="alive", to_state="dead",
                neighbor_state="alive", min_count=5, max_count=2,
            )


class TestCellularAutomatonSpec:
    """Teste pentru CellularAutomatonSpec."""

    @pytest.fixture
    def game_of_life_spec(self):
        """Fixture cu specificația Game of Life."""
        return CellularAutomatonSpec(
            name="Game of Life",
            states=[
                CellState(name="dead", color="#1a1a2e", symbol="."),
                CellState(name="alive", color="#00ff88", symbol="O"),
            ],
            default_state="dead",
            transitions=[
                TransitionCondition(
                    from_state="alive", to_state="dead",
                    neighbor_state="alive", min_count=0, max_count=1,
                ),
                TransitionCondition(
                    from_state="alive", to_state="alive",
                    neighbor_state="alive", min_count=2, max_count=3,
                ),
                TransitionCondition(
                    from_state="alive", to_state="dead",
                    neighbor_state="alive", min_count=4, max_count=8,
                ),
                TransitionCondition(
                    from_state="dead", to_state="alive",
                    neighbor_state="alive", min_count=3, max_count=3,
                ),
            ],
        )

    def test_valid_spec(self, game_of_life_spec):
        assert game_of_life_spec.name == "Game of Life"
        assert len(game_of_life_spec.states) == 2
        assert len(game_of_life_spec.transitions) == 4

    def test_get_state_index(self, game_of_life_spec):
        assert game_of_life_spec.get_state_index("dead") == 0
        assert game_of_life_spec.get_state_index("alive") == 1

    def test_invalid_state_reference(self):
        with pytest.raises(ValidationError):
            CellularAutomatonSpec(
                name="Bad",
                states=[
                    CellState(name="dead"),
                    CellState(name="alive"),
                ],
                default_state="dead",
                transitions=[
                    TransitionCondition(
                        from_state="alive", to_state="NONEXISTENT",
                        neighbor_state="alive", min_count=0, max_count=1,
                    ),
                ],
            )

    def test_invalid_default_state(self):
        with pytest.raises(ValidationError):
            CellularAutomatonSpec(
                name="Bad",
                states=[
                    CellState(name="dead"),
                    CellState(name="alive"),
                ],
                default_state="nonexistent",
                transitions=[
                    TransitionCondition(
                        from_state="alive", to_state="dead",
                        neighbor_state="alive", min_count=0, max_count=1,
                    ),
                ],
            )

    def test_load_from_json(self):
        json_path = Path(__file__).parent.parent / "models" / "examples" / "game_of_life.json"
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        spec = CellularAutomatonSpec(**data)
        assert spec.name == "Conway's Game of Life"

    def test_too_few_states(self):
        with pytest.raises(ValidationError):
            CellularAutomatonSpec(
                name="Bad",
                states=[CellState(name="only_one")],
                default_state="only_one",
                transitions=[
                    TransitionCondition(
                        from_state="only_one", to_state="only_one",
                        neighbor_state="only_one", min_count=0, max_count=0,
                    ),
                ],
            )
