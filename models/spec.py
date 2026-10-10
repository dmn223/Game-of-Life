"""Schema Pydantic pentru specificația unui automat celular.

Acest modul definește structurile de date care servesc drept CONTRACT
între toate celelalte module ale proiectului CelLab.
"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class NeighborhoodType(str, Enum):
    """Tipul de vecinătate folosit pentru calculul tranzițiilor."""

    MOORE = "moore"  # 8 vecini (include diagonalele)
    VON_NEUMANN = "von_neumann"  # 4 vecini (doar ortogonal)


class BoundaryCondition(str, Enum):
    """Condiția la marginea gridului."""

    DEAD = "dead"  # Celulele din afara gridului sunt în starea default
    WRAP = "wrap"  # Grid toroidal (marginile se înfășoară)
    MIRROR = "mirror"  # Reflectare la margini


class CellState(BaseModel):
    """Definește o stare posibilă a unei celule."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Numele stării (ex: 'alive', 'dead', 'burning')",
    )
    color: str = Field(
        default="#000000",
        pattern=r"^#[0-9a-fA-F]{6}$",
        description="Culoarea pentru afișare în format hex",
    )
    symbol: str = Field(
        default=".",
        max_length=1,
        description="Simbol pentru reprezentare text (1 caracter)",
    )


class TransitionCondition(BaseModel):
    """O regulă de tranziție a automatului celular.

    Dacă o celulă în starea `from_state` are un număr de vecini în
    `neighbor_state` cuprins între `min_count` și `max_count` (inclusiv),
    celula trece în `to_state`.
    """

    from_state: str = Field(..., description="Starea curentă a celulei")
    to_state: str = Field(..., description="Starea în care trece celula")
    neighbor_state: str = Field(
        ..., description="Starea vecinilor care sunt numărați"
    )
    min_count: int = Field(
        ..., ge=0, le=8, description="Nr. minim de vecini (inclusiv)"
    )
    max_count: int = Field(
        ..., ge=0, le=8, description="Nr. maxim de vecini (inclusiv)"
    )
    priority: int = Field(
        default=0,
        description="Prioritatea regulii (mai mare = se aplică prima)",
    )

    @model_validator(mode="after")
    def validate_count_range(self) -> "TransitionCondition":
        """Verifică că min_count <= max_count."""
        if self.min_count > self.max_count:
            raise ValueError(
                f"min_count ({self.min_count}) nu poate fi mai mare "
                f"decât max_count ({self.max_count})"
            )
        return self


class GridConfig(BaseModel):
    """Configurația gridului de simulare."""

    width: int = Field(default=50, ge=3, le=500, description="Lățimea gridului")
    height: int = Field(
        default=50, ge=3, le=500, description="Înălțimea gridului"
    )
    boundary: BoundaryCondition = Field(
        default=BoundaryCondition.DEAD,
        description="Condiția la marginea gridului",
    )


class CellularAutomatonSpec(BaseModel):
    """Schema completă a unui automat celular.

    Aceasta este structura-contract între toate modulele CelLab.
    Este produsă de `nlp_parser` și consumată de `simulation_engine`,
    `analysis` și `ui`.
    """

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Numele automatului celular",
    )
    description: str = Field(
        default="",
        description="Descriere în limbaj natural a automatului",
    )
    states: list[CellState] = Field(
        ...,
        min_length=2,
        description="Lista de stări posibile (minim 2)",
    )
    default_state: str = Field(
        ...,
        description="Numele stării implicite (celule nedesenate)",
    )
    neighborhood: NeighborhoodType = Field(
        default=NeighborhoodType.MOORE,
        description="Tipul de vecinătate",
    )
    transitions: list[TransitionCondition] = Field(
        ...,
        min_length=1,
        description="Lista de reguli de tranziție",
    )
    grid: GridConfig = Field(
        default_factory=GridConfig,
        description="Configurația gridului",
    )

    @field_validator("transitions")
    @classmethod
    def validate_state_references(cls, v, info):
        """Verifică că toate stările referite în tranziții există în lista de stări."""
        if "states" in info.data:
            valid_states = {s.name for s in info.data["states"]}
            for transition in v:
                for state_ref in (
                    transition.from_state,
                    transition.to_state,
                    transition.neighbor_state,
                ):
                    if state_ref not in valid_states:
                        raise ValueError(
                            f"Starea '{state_ref}' referită în tranziție "
                            f"nu există în lista de stări valide: {valid_states}"
                        )
        return v

    @field_validator("default_state")
    @classmethod
    def validate_default_state(cls, v, info):
        """Verifică că starea implicită există în lista de stări."""
        if "states" in info.data:
            valid_states = {s.name for s in info.data["states"]}
            if v not in valid_states:
                raise ValueError(
                    f"Starea implicită '{v}' nu există în "
                    f"lista de stări valide: {valid_states}"
                )
        return v

    def get_state_index(self, state_name: str) -> int:
        """Returnează indexul numeric al unei stări (pentru reprezentare matricială)."""
        for i, state in enumerate(self.states):
            if state.name == state_name:
                return i
        raise ValueError(f"Starea '{state_name}' nu există")

    def get_state_by_name(self, state_name: str) -> CellState:
        """Returnează obiectul CellState după nume."""
        for state in self.states:
            if state.name == state_name:
                return state
        raise ValueError(f"Starea '{state_name}' nu există")
