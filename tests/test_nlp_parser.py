"""Teste placeholder pentru modulul nlp_parser/.

Se vor completa pe măsură ce parser-ul este implementat.
"""

import pytest

from nlp_parser.parser import NaturalLanguageParser


class TestNaturalLanguageParser:
    """Teste pentru NaturalLanguageParser."""

    def test_parser_instantiation(self):
        """Verifică că parser-ul se poate instanția."""
        parser = NaturalLanguageParser()
        assert parser is not None

    @pytest.mark.skip(reason="Parser-ul NLP nu este încă implementat")
    def test_parse_game_of_life(self):
        """Testează parsarea regulilor Game of Life din limbaj natural."""
        parser = NaturalLanguageParser()
        text = (
            "A cell survives if it has 2 or 3 alive neighbors. "
            "A dead cell becomes alive if it has exactly 3 alive neighbors. "
            "An alive cell dies if it has fewer than 2 or more than 3 alive neighbors."
        )
        spec = parser.parse(text)
        assert spec.name is not None
        assert len(spec.states) >= 2
