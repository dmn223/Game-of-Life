"""Endpoint-uri REST API.

Endpoint-uri:
- POST /api/parse — Parsează text NLP → CellularAutomatonSpec
- POST /api/simulate/step — Calculează o generație
- POST /api/simulate/run — Rulează N generații
- POST /api/simulate/reset — Resetează simularea
- POST /api/analyze — Execută o întrebare de analiză
- GET  /api/spec — Returnează specificația curentă
- GET  /api/examples — Returnează exemplele disponibile
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from models.spec import CellularAutomatonSpec

router = APIRouter(tags=["cellab"])

# Stare globală a aplicației (în producție se folosește dependency injection)
_current_spec: Optional[CellularAutomatonSpec] = None
_simulator = None


class ParseRequest(BaseModel):
    """Request pentru parsare NLP."""
    text: str


class ParseResponse(BaseModel):
    """Response cu specificația parsată."""
    success: bool
    spec: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class SimulateRequest(BaseModel):
    """Request pentru simulare."""
    steps: int = 1


class GridUpdateRequest(BaseModel):
    """Request pentru actualizare celule pe grid."""
    cells: list[dict[str, Any]]  # [{"row": 0, "col": 0, "state": "alive"}]


class AnalyzeRequest(BaseModel):
    """Request pentru analiză."""
    question_type: str
    params: dict[str, Any] = {}


@router.post("/parse", response_model=ParseResponse)
async def parse_rules(request: ParseRequest):
    """Parsează reguli în limbaj natural."""
    # TODO: Integrare cu NaturalLanguageParser
    return ParseResponse(
        success=False,
        error="Parser-ul NLP nu este încă implementat",
    )


@router.post("/spec/load")
async def load_spec(spec: CellularAutomatonSpec):
    """Încarcă direct o specificație JSON."""
    global _current_spec, _simulator
    _current_spec = spec
    # TODO: Inițializare Simulator cu spec-ul încărcat
    return {"success": True, "name": spec.name}


@router.get("/spec")
async def get_current_spec():
    """Returnează specificația curentă."""
    if _current_spec is None:
        raise HTTPException(status_code=404, detail="Nicio specificație încărcată")
    return _current_spec.model_dump()


@router.post("/simulate/step")
async def simulate_step():
    """Calculează o singură generație."""
    # TODO: Integrare cu Simulator.step()
    raise HTTPException(status_code=501, detail="Simulatorul nu este încă implementat")


@router.post("/simulate/run")
async def simulate_run(request: SimulateRequest):
    """Rulează mai multe generații."""
    # TODO: Integrare cu Simulator.run()
    raise HTTPException(status_code=501, detail="Simulatorul nu este încă implementat")


@router.post("/simulate/reset")
async def simulate_reset():
    """Resetează simularea."""
    # TODO: Integrare cu Simulator.reset()
    raise HTTPException(status_code=501, detail="Simulatorul nu este încă implementat")


@router.post("/grid/update")
async def update_grid(request: GridUpdateRequest):
    """Actualizează celule individuale pe grid (desenare)."""
    # TODO: Integrare cu Grid.set_cell()
    raise HTTPException(status_code=501, detail="Gridul nu este încă implementat")


@router.post("/analyze")
async def analyze(request: AnalyzeRequest):
    """Execută o întrebare de analiză."""
    # TODO: Integrare cu Analyzer
    raise HTTPException(status_code=501, detail="Analizatorul nu este încă implementat")


@router.get("/examples")
async def list_examples():
    """Returnează lista de exemple disponibile."""
    examples_dir = Path(__file__).parent.parent.parent / "models" / "examples"
    examples = []
    if examples_dir.exists():
        for f in examples_dir.glob("*.json"):
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                examples.append({"filename": f.name, "name": data.get("name", f.stem)})
    return {"examples": examples}
