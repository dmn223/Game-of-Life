"""Tokenizare și extragere entități din textul în limbaj natural.

Responsabilități:
- Împărțirea textului în propoziții și tokens
- Identificarea numelor de stări (ex: 'alive', 'dead', 'burning')
- Identificarea numerelor și intervalelor (ex: 'between 2 and 3')
- Identificarea cuvintelor cheie (ex: 'neighbor', 'survives', 'dies')
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Token:
    """Un token extras din textul sursă."""

    text: str
    token_type: str  # 'STATE', 'NUMBER', 'KEYWORD', 'PUNCTUATION', 'OTHER'
    position: int = 0


@dataclass
class TokenizedText:
    """Rezultatul tokenizării: lista de tokens + metadate."""

    tokens: list[Token] = field(default_factory=list)
    sentences: list[str] = field(default_factory=list)
    detected_states: list[str] = field(default_factory=list)
    detected_numbers: list[int] = field(default_factory=list)


class Tokenizer:
    """Tokenizează text în limbaj natural și extrage entități relevante."""

    # Cuvinte cheie recunoscute pentru regulile automatelor celulare
    KEYWORDS: set[str] = {
        "neighbor", "neighbors", "neighbour", "neighbours",
        "survives", "survive", "dies", "die", "born", "becomes",
        "alive", "dead", "live", "empty", "populated",
        "exactly", "fewer", "more", "between", "less", "greater",
        "cell", "cells", "state", "transition",
        "moore", "von_neumann", "von", "neumann",
        "wrap", "toroidal", "boundary", "edge",
    }

    def tokenize(self, text: str) -> TokenizedText:
        """Tokenizează textul și extrage entități.

        Args:
            text: Textul de procesat.

        Returns:
            TokenizedText cu tokens, propoziții, stări și numere detectate.
        """
        # TODO: Implementare completă în iterația următoare
        raise NotImplementedError("Tokenizer.tokenize() — de implementat")
