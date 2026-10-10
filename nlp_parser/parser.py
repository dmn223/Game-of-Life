"""Modulul principal de parsare: text în limbaj natural → CellularAutomatonSpec.

Acesta este punctul de intrare pentru conversia descrierilor
în limbaj natural într-o specificație formală validată.
"""

from __future__ import annotations

from models.spec import CellularAutomatonSpec
from nlp_parser.tokenizer import Tokenizer
from nlp_parser.rule_extractor import RuleExtractor
from nlp_parser.validator import SemanticValidator


class NaturalLanguageParser:
    """Parsează text în limbaj natural și produce un CellularAutomatonSpec.

    Pipeline-ul de procesare:
    1. Tokenizare și extragere entități (Tokenizer)
    2. Extragere reguli de tranziție (RuleExtractor)
    3. Validare semantică (SemanticValidator)
    4. Construire CellularAutomatonSpec
    """

    def __init__(self) -> None:
        self._tokenizer = Tokenizer()
        self._rule_extractor = RuleExtractor()
        self._validator = SemanticValidator()

    def parse(self, text: str) -> CellularAutomatonSpec:
        """Parsează text în limbaj natural și returnează o specificație validată.

        Args:
            text: Descrierea automatului celular în limbaj natural.

        Returns:
            CellularAutomatonSpec validat.

        Raises:
            ValueError: Dacă textul nu poate fi parsat sau validat.
        """
        # Pasul 1: Tokenizare
        tokens = self._tokenizer.tokenize(text)

        # Pasul 2: Extragere reguli
        raw_spec = self._rule_extractor.extract(tokens)

        # Pasul 3: Validare semantică
        self._validator.validate(raw_spec)

        # Pasul 4: Construire spec Pydantic
        spec = CellularAutomatonSpec(**raw_spec)
        return spec
