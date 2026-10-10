"""Teste placeholder pentru API-ul FastAPI.

Se vor completa pe măsură ce endpoint-urile sunt implementate.
"""

import pytest


@pytest.mark.skip(reason="API-ul nu este încă complet implementat")
class TestAPI:
    """Teste pentru endpoint-urile REST."""

    def test_root_returns_html(self):
        """GET / trebuie să returneze pagina HTML."""
        pass

    def test_examples_endpoint(self):
        """GET /api/examples trebuie să returneze lista de exemple."""
        pass

    def test_load_spec(self):
        """POST /api/spec/load trebuie să accepte o specificație validă."""
        pass
