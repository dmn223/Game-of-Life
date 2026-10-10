"""Teste placeholder pentru modulul analysis/.

Se vor completa pe măsură ce modulele de analiză sunt implementate.
"""

import pytest
import numpy as np

from analysis.cell_counter import CellCounter, CountResult


class TestCellCounter:
    """Teste pentru CellCounter (singurul modul deja implementat)."""

    def test_count_all_zeros(self):
        counter = CellCounter()
        cells = np.zeros((10, 10), dtype=np.int8)
        result = counter.count(cells, state_index=0, state_name="dead")
        assert result.count == 100
        assert result.percentage == 100.0

    def test_count_mixed(self):
        counter = CellCounter()
        cells = np.zeros((10, 10), dtype=np.int8)
        cells[0:5, :] = 1  # 50 celule alive
        result = counter.count(cells, state_index=1, state_name="alive")
        assert result.count == 50
        assert result.percentage == 50.0
