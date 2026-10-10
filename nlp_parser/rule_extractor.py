"""Extragerea regulilor de tranziție din tokens.

Responsabilități:
- Interpretarea propozițiilor tokenizate ca reguli de tranziție
- Maparea expresiilor naturale la structuri TransitionCondition
- Deducerea stărilor și a configurației gridului
"""

from __future__ import annotations

from typing import Any

from nlp_parser.tokenizer import TokenizedText


class RuleExtractor:
    """Extrage reguli de tranziție din textul tokenizat."""

    def extract(self, tokenized: TokenizedText) -> dict[str, Any]:
        """Extrage un dicționar cu specificația automatului din tokens.

        Args:
            tokenized: Rezultatul tokenizării.

        Returns:
            Dicționar compatibil cu CellularAutomatonSpec(**result).

        Raises:
            ValueError: Dacă regulile nu pot fi extrase.
        """
        # TODO: Implementare completă în iterația următoare
        raise NotImplementedError("RuleExtractor.extract() — de implementat")
