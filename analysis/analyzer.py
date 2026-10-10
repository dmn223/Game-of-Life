"""Orchestratorul de analiză — punct de intrare pentru toate întrebările.

Deleagă fiecare tip de întrebare către modulul specializat corespunzător.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Optional

from models.spec import CellularAutomatonSpec
from simulation_engine.engine import Simulator
from analysis.state_query import StateQuery
from analysis.steady_state import SteadyStateDetector
from analysis.pattern_search import PatternSearcher
from analysis.cell_counter import CellCounter
from analysis.cycle_detector import CycleDetector


class QuestionType(str, Enum):
    """Tipurile de întrebări de analiză suportate."""

    STATE_AFTER_N = "state_after_n"  # Q1: Starea după N iterații
    STEADY_STATE = "steady_state"  # Q2: Când atinge stare stabilă
    PATTERN_SEARCH = "pattern_search"  # Q3: Apare o configurație specifică
    CELL_COUNT = "cell_count"  # Q4: Câte celule de tip X după N iterații
    CYCLE_DETECTION = "cycle_detection"  # Q5: Intră într-un ciclu repetitiv


@dataclass
class AnalysisResult:
    """Rezultatul unei analize."""

    question_type: QuestionType
    answer: Any
    details: str = ""
    generation_reached: int = 0


class Analyzer:
    """Orchestrator de analiză — procesează întrebări despre simulare."""

    def __init__(self, simulator: Simulator) -> None:
        self.simulator = simulator
        self._state_query = StateQuery()
        self._steady_state = SteadyStateDetector()
        self._pattern_search = PatternSearcher()
        self._cell_counter = CellCounter()
        self._cycle_detector = CycleDetector()

    def analyze(
        self,
        question_type: QuestionType,
        **params: Any,
    ) -> AnalysisResult:
        """Execută o analiză pe baza tipului de întrebare.

        Args:
            question_type: Tipul întrebării.
            **params: Parametri specifici întrebării (ex: n=100, state='alive').

        Returns:
            AnalysisResult cu răspunsul.
        """
        handlers = {
            QuestionType.STATE_AFTER_N: self._handle_state_after_n,
            QuestionType.STEADY_STATE: self._handle_steady_state,
            QuestionType.PATTERN_SEARCH: self._handle_pattern_search,
            QuestionType.CELL_COUNT: self._handle_cell_count,
            QuestionType.CYCLE_DETECTION: self._handle_cycle_detection,
        }

        handler = handlers.get(question_type)
        if handler is None:
            raise ValueError(f"Tip de întrebare necunoscut: {question_type}")

        return handler(**params)

    def _handle_state_after_n(self, **params: Any) -> AnalysisResult:
        """Q1: Care este starea după N iterații?"""
        # TODO: Implementare
        raise NotImplementedError

    def _handle_steady_state(self, **params: Any) -> AnalysisResult:
        """Q2: Când atinge sistemul o stare stabilă?"""
        # TODO: Implementare
        raise NotImplementedError

    def _handle_pattern_search(self, **params: Any) -> AnalysisResult:
        """Q3: Apare vreodată o configurație specifică?"""
        # TODO: Implementare
        raise NotImplementedError

    def _handle_cell_count(self, **params: Any) -> AnalysisResult:
        """Q4: Câte celule de tipul X există după N iterații?"""
        # TODO: Implementare
        raise NotImplementedError

    def _handle_cycle_detection(self, **params: Any) -> AnalysisResult:
        """Q5: Intră simularea într-un ciclu repetitiv?"""
        # TODO: Implementare
        raise NotImplementedError
