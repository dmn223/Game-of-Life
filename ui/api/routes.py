"""Endpoint-uri REST API — Motor de simulare integrat pentru CelLab.

Suportă:
- Reguli implicite (default) Conway's Game of Life (B3/S23) dacă utilizatorul nu definește altele
- Reguli bazate pe vecinătăți relative [x+dx, y+dy]
- Modificarea unei liste de câmpuri țintă relative [x+dx, y+dy] (devine 1, devine 0, invers, menține)
- Execuția simultană a tuturor regulilor aplicabile
- Reguli clasice bazate pe contor de vecini (Moore, Von Neumann)
- Parsare text pentru sintaxa cerută:
  "pentru [x,y], daca am vecinii [[x+1,y],...] sa aiba loc urmatoarele stari: campurile [...] se transforma..."
"""

from __future__ import annotations

import copy
import json
import random
import re
from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["cellab"])

# ============================================================
# Reguli Default (Conway's Game of Life: B3 / S23)
# ============================================================
DEFAULT_RULES: list[dict[str, Any]] = [
    {
        "name": "Supraviețuire (2-3 vecini)",
        "description": "O celulă vie [x,y]=1 cu 2 sau 3 vecini vii supraviețuiește (se menține 1)",
        "current_state": 1,
        "count_conditions": [{
            "state": 1,
            "min_count": 2,
            "max_count": 3,
            "neighborhood": "moore"
        }],
        "effects": [{
            "dx": 0,
            "dy": 0,
            "action": "set_1"
        }],
        "result_state": 1,
        "is_default": True,
    },
    {
        "name": "Naștere (exact 3 vecini)",
        "description": "O celulă moartă [x,y]=0 cu exact 3 vecini vii devine vie (se transformă din 0 în 1)",
        "current_state": 0,
        "count_conditions": [{
            "state": 1,
            "min_count": 3,
            "max_count": 3,
            "neighborhood": "moore"
        }],
        "effects": [{
            "dx": 0,
            "dy": 0,
            "action": "set_1"
        }],
        "result_state": 1,
        "is_default": True,
    },
    {
        "name": "Subpopulare (< 2 vecini)",
        "description": "O celulă vie [x,y]=1 cu mai puțin de 2 vecini vii moare (se transformă din 1 în 0)",
        "current_state": 1,
        "count_conditions": [{
            "state": 1,
            "min_count": 0,
            "max_count": 1,
            "neighborhood": "moore"
        }],
        "effects": [{
            "dx": 0,
            "dy": 0,
            "action": "set_0"
        }],
        "result_state": 0,
        "is_default": True,
    },
    {
        "name": "Suprapopulare (> 3 vecini)",
        "description": "O celulă vie [x,y]=1 cu 4 sau mai mulți vecini vii moare (se transformă din 1 în 0)",
        "current_state": 1,
        "count_conditions": [{
            "state": 1,
            "min_count": 4,
            "max_count": 8,
            "neighborhood": "moore"
        }],
        "effects": [{
            "dx": 0,
            "dy": 0,
            "action": "set_0"
        }],
        "result_state": 0,
        "is_default": True,
    },
]

# ============================================================
# Stare globală a simulării
# ============================================================
GRID_W = 50
GRID_H = 50

_grid: list[list[int]] = [[0] * GRID_W for _ in range(GRID_H)]
_generation: int = 0
# Inițializăm regulile active cu setul de reguli default
_rules: list[dict] = copy.deepcopy(DEFAULT_RULES)
_boundary: str = "wrap"  # "wrap" sau "dead"


def _get_active_rules() -> list[dict]:
    """Returnează regulile active; dacă lista e goală, returnează regulile default."""
    global _rules
    if not _rules:
        _rules = copy.deepcopy(DEFAULT_RULES)
    return _rules


def _get_cell(r: int, c: int) -> int:
    """Returnează starea celulei, cu tratarea condiției la margine."""
    h = len(_grid)
    w = len(_grid[0]) if h > 0 else 0
    if h == 0 or w == 0:
        return 0
    if _boundary == "wrap":
        return _grid[r % h][c % w]
    else:  # dead
        if 0 <= r < h and 0 <= c < w:
            return _grid[r][c]
        return 0


def _count_neighbors(r: int, c: int, state: int, neighborhood: str = "moore") -> int:
    """Numără vecinii în starea specificată."""
    count = 0
    if neighborhood == "moore":
        offsets = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    else:  # von_neumann
        offsets = [(-1, 0), (0, -1), (0, 1), (1, 0)]
    for dr, dc in offsets:
        if _get_cell(r + dr, c + dc) == state:
            count += 1
    return count


def _step_simulation():
    """Calculează o generație nouă aplicând TOATE regulile care se potrivesc simultan."""
    global _grid, _generation, _rules

    effective_rules = _get_active_rules()

    h = len(_grid)
    w = len(_grid[0]) if h > 0 else 0
    if h == 0 or w == 0:
        return

    # Inițializăm noul grid cu o copie a stării curente
    new_grid = [[_grid[r][c] for c in range(w)] for r in range(h)]

    # Colectăm acțiunile simultane pentru fiecare celulă țintă: (tr, tc) -> list[action]
    actions_on_cell: dict[tuple[int, int], list[str]] = {}

    for r in range(h):
        for c in range(w):
            curr_val = _grid[r][c]

            for rule in effective_rules:
                # 1. Verificare stare celulă curentă [x, y]
                req_state = rule.get("current_state", -1)
                if req_state != -1 and curr_val != req_state:
                    continue

                matched = True

                # 2. Condiții de pattern relativ (ex: [x+1, y] == 1 etc.)
                pattern_conds = rule.get("pattern_conditions", [])
                if pattern_conds:
                    for cond in pattern_conds:
                        dr = cond.get("dy", cond.get("dr", 0))
                        dc = cond.get("dx", cond.get("dc", 0))
                        req_neighbor_state = cond.get("state", 1)
                        if _get_cell(r + dr, c + dc) != req_neighbor_state:
                            matched = False
                            break

                # 3. Condiții de contor vecini (dacă există)
                count_conds = rule.get("count_conditions", [])
                if matched and count_conds:
                    for cc in count_conds:
                        cnt = _count_neighbors(r, c, cc.get("state", 1), cc.get("neighborhood", "moore"))
                        if not (cc.get("min_count", 0) <= cnt <= cc.get("max_count", 8)):
                            matched = False
                            break

                # Dacă regula nu are nicio condiție specificată, nu se potrivește implicit
                if not pattern_conds and not count_conds and req_state == -1:
                    matched = False

                if matched:
                    effects = rule.get("effects", [])
                    if not effects:
                        res_state = rule.get("result_state", 1)
                        action = "set_1" if res_state == 1 else "set_0"
                        effects = [{"dx": 0, "dy": 0, "action": action}]

                    for eff in effects:
                        dr = eff.get("dy", eff.get("dr", 0))
                        dc = eff.get("dx", eff.get("dc", 0))
                        act = eff.get("action", "set_1")

                        # Calcul coordonate țintă cu boundary
                        if _boundary == "wrap":
                            tr = (r + dr) % h
                            tc = (c + dc) % w
                        else:
                            tr = r + dr
                            tc = c + dc
                            if not (0 <= tr < h and 0 <= tc < w):
                                continue

                        target_key = (tr, tc)
                        if target_key not in actions_on_cell:
                            actions_on_cell[target_key] = []
                        actions_on_cell[target_key].append(act)

    # Aplicăm toate acțiunile acumulate simultan
    for (tr, tc), acts in actions_on_cell.items():
        val = _grid[tr][tc]
        for act in acts:
            if act in ("set_1", "1", "alive"):
                val = 1
            elif act in ("set_0", "0", "dead"):
                val = 0
            elif act in ("invert", "toggle", "invers"):
                val = 1 - val
            elif act in ("keep", "mentine"):
                pass
        new_grid[tr][tc] = val

    _grid = new_grid
    _generation += 1


def _parse_custom_text_rule(text: str) -> Optional[dict]:
    """Parsează o regulă scrisă în limbaj natural / semi-formal."""
    clean_text = text.strip()
    if not clean_text:
        return None

    rule: dict[str, Any] = {
        "name": text[:40],
        "current_state": -1,
        "pattern_conditions": [],
        "effects": [],
    }

    lower = clean_text.lower()
    if "celula curenta este 1" in lower or "starea 1" in lower or "campul curent este 1" in lower:
        rule["current_state"] = 1
    elif "celula curenta este 0" in lower or "starea 0" in lower or "campul curent este 0" in lower:
        rule["current_state"] = 0

    coord_pattern = re.compile(
        r'\[\s*(?:x\s*([+-]\s*\d+)?)?\s*,\s*(?:y\s*([+-]\s*\d+)?)?\s*\](?:\s*=\s*([01]))?',
        re.IGNORECASE
    )

    split_parts = re.split(r'atunci|sa\s+aiba\s+loc|urmatoarele\s+stari|then|=>', clean_text, flags=re.IGNORECASE)
    cond_section = split_parts[0]
    effect_section = split_parts[1] if len(split_parts) > 1 else ""

    for match in coord_pattern.finditer(cond_section):
        dx_str, dy_str, state_str = match.groups()
        dx = int(dx_str.replace(" ", "")) if dx_str else 0
        dy = int(dy_str.replace(" ", "")) if dy_str else 0

        if dx == 0 and dy == 0:
            continue

        req_state = int(state_str) if state_str is not None else 1
        rule["pattern_conditions"].append({
            "dx": dx,
            "dy": dy,
            "state": req_state
        })

    if effect_section:
        default_action = "set_1"
        if "din 0 in 1" in effect_section.lower() or "devine 1" in effect_section.lower() or "->1" in effect_section:
            default_action = "set_1"
        elif "din 1 in 0" in effect_section.lower() or "devine 0" in effect_section.lower() or "->0" in effect_section:
            default_action = "set_0"
        elif "invers" in effect_section.lower() or "invert" in effect_section.lower() or "toggle" in effect_section:
            default_action = "invert"
        elif "mentin" in effect_section.lower() or "keep" in effect_section.lower():
            default_action = "keep"

        target_matches = list(coord_pattern.finditer(effect_section))
        if target_matches:
            for match in target_matches:
                dx_str, dy_str, state_str = match.groups()
                dx = int(dx_str.replace(" ", "")) if dx_str else 0
                dy = int(dy_str.replace(" ", "")) if dy_str else 0

                act = default_action
                if state_str == "1":
                    act = "set_1"
                elif state_str == "0":
                    act = "set_0"

                rule["effects"].append({
                    "dx": dx,
                    "dy": dy,
                    "action": act
                })
        else:
            rule["effects"].append({
                "dx": 0,
                "dy": 0,
                "action": default_action
            })
    else:
        rule["effects"].append({
            "dx": 0,
            "dy": 0,
            "action": "set_1"
        })

    return rule


# ============================================================
# Modele Pydantic pentru request/response
# ============================================================
class RulesRequest(BaseModel):
    rules: list[dict[str, Any]]
    boundary: str = "wrap"


class ParseCustomRuleRequest(BaseModel):
    text: str


class GridSetRequest(BaseModel):
    grid: list[list[int]]


class ToggleCellRequest(BaseModel):
    row: int
    col: int


class SimulateRequest(BaseModel):
    steps: int = 1


class RandomRequest(BaseModel):
    density: float = 0.3


class GridSizeRequest(BaseModel):
    width: int = 50
    height: int = 50


# ============================================================
# Endpoint-uri REST
# ============================================================
@router.post("/rules/set")
async def set_rules(request: RulesRequest):
    """Setează regulile active ale automatului."""
    global _rules, _boundary
    if not request.rules:
        # Dacă utilizatorul trimite listă goală, restaurăm regulile default
        _rules = copy.deepcopy(DEFAULT_RULES)
    else:
        _rules = request.rules
    _boundary = request.boundary
    return {"success": True, "rules_count": len(_rules), "is_default": not bool(request.rules)}


@router.get("/rules")
async def get_rules():
    """Returnează regulile active curente (sau default dacă nu s-au setat altele)."""
    effective = _get_active_rules()
    return {"rules": effective, "boundary": _boundary, "is_default": _rules == DEFAULT_RULES}


@router.get("/rules/default")
async def get_default_rules():
    """Returnează setul de reguli default (Conway's Game of Life B3/S23)."""
    return {
        "rules": DEFAULT_RULES,
        "name": "Conway's Game of Life (B3/S23)",
        "description": "Setul de reguli clasic: supraviețuire la 2-3 vecini, naștere la exact 3 vecini, moarte prin subpopulare (<2) sau suprapopulare (>3)."
    }


@router.post("/rules/reset_default")
async def reset_to_default_rules():
    """Resetează regulile active la setul default."""
    global _rules
    _rules = copy.deepcopy(DEFAULT_RULES)
    return {"success": True, "rules": _rules, "rules_count": len(_rules)}


@router.post("/rules/parse_custom")
async def parse_custom_rule(request: ParseCustomRuleRequest):
    """Parsează o regulă text în sintaxa cerută."""
    rule = _parse_custom_text_rule(request.text)
    if not rule or (not rule["pattern_conditions"] and rule["current_state"] == -1):
        raise HTTPException(status_code=400, detail="Nu s-a putut deduce o regulă validă din textul introdus.")
    return {"success": True, "rule": rule}


@router.get("/state")
async def get_state():
    """Returnează starea curentă a simulării."""
    active = sum(cell for row in _grid for cell in row)
    effective_rules = _get_active_rules()
    return {
        "grid": _grid,
        "generation": _generation,
        "width": GRID_W,
        "height": GRID_H,
        "active_cells": active,
        "rules_count": len(effective_rules),
        "boundary": _boundary,
    }


@router.post("/grid/set")
async def set_grid(request: GridSetRequest):
    """Setează starea completă a gridului."""
    global _grid, _generation, GRID_H, GRID_W
    _grid = request.grid
    GRID_H = len(_grid)
    GRID_W = len(_grid[0]) if _grid else 0
    _generation = 0
    return {"success": True}


@router.post("/grid/toggle")
async def toggle_cell(request: ToggleCellRequest):
    """Toggle o celulă individuală (0 <-> 1)."""
    r, c = request.row, request.col
    if 0 <= r < GRID_H and 0 <= c < GRID_W:
        _grid[r][c] = 1 - _grid[r][c]
    return {"success": True, "row": r, "col": c, "state": _grid[r][c]}


@router.post("/grid/clear")
async def clear_grid():
    """Resetează toate celulele la 0."""
    global _grid, _generation
    _grid = [[0] * GRID_W for _ in range(GRID_H)]
    _generation = 0
    return {"success": True, "grid": _grid}


@router.post("/grid/random")
async def random_grid(request: RandomRequest = RandomRequest()):
    """Populare aleatorie a gridului cu densitatea specificată."""
    global _grid, _generation
    _grid = [
        [1 if random.random() < request.density else 0 for _ in range(GRID_W)]
        for _ in range(GRID_H)
    ]
    _generation = 0
    active = sum(cell for row in _grid for cell in row)
    return {"success": True, "grid": _grid, "active_cells": active}


@router.post("/grid/resize")
async def resize_grid(request: GridSizeRequest):
    """Redimensionează gridul."""
    global _grid, GRID_W, GRID_H, _generation
    GRID_W = max(3, min(200, request.width))
    GRID_H = max(3, min(200, request.height))
    _grid = [[0] * GRID_W for _ in range(GRID_H)]
    _generation = 0
    return {"success": True, "width": GRID_W, "height": GRID_H}


@router.post("/simulate/step")
async def simulate_step():
    """Calculează o singură generație pe baza regulilor (folosește default dacă nu s-au setat altele)."""
    _step_simulation()
    active = sum(cell for row in _grid for cell in row)
    return {
        "grid": _grid,
        "generation": _generation,
        "active_cells": active,
    }


@router.post("/simulate/run")
async def simulate_run(request: SimulateRequest):
    """Rulează N generații."""
    for _ in range(request.steps):
        _step_simulation()
    active = sum(cell for row in _grid for cell in row)
    return {
        "grid": _grid,
        "generation": _generation,
        "active_cells": active,
    }


@router.post("/simulate/reset")
async def simulate_reset():
    """Resetează contorul de generații la 0."""
    global _generation
    _generation = 0
    return {"success": True, "generation": 0}


@router.post("/spec/load")
async def load_spec(spec: dict[str, Any]):
    """Încarcă o specificație JSON clasică și o convertește în reguli."""
    global _rules, _boundary, GRID_W, GRID_H, _grid, _generation

    rules = []
    for t in spec.get("transitions", []):
        from_st = 1 if t.get("from_state") != spec.get("default_state", "dead") else 0
        to_st = 1 if t.get("to_state") != spec.get("default_state", "dead") else 0
        neigh_st = 1 if t.get("neighbor_state") != spec.get("default_state", "dead") else 0

        rules.append({
            "name": f"{t.get('from_state')} -> {t.get('to_state')}",
            "current_state": from_st,
            "count_conditions": [{
                "state": neigh_st,
                "min_count": t.get("min_count", 0),
                "max_count": t.get("max_count", 8),
                "neighborhood": spec.get("neighborhood", "moore"),
            }],
            "effects": [{
                "dx": 0,
                "dy": 0,
                "action": "set_1" if to_st == 1 else "set_0"
            }],
            "result_state": to_st,
        })
    _rules = rules

    grid_cfg = spec.get("grid", {})
    GRID_W = grid_cfg.get("width", 50)
    GRID_H = grid_cfg.get("height", 50)
    _boundary = grid_cfg.get("boundary", "wrap")
    _grid = [[0] * GRID_W for _ in range(GRID_H)]
    _generation = 0

    return {"success": True, "name": spec.get("name", "Custom"), "rules_count": len(rules)}


@router.get("/examples")
async def list_examples():
    """Returnează exemplele disponibile."""
    examples_dir = Path(__file__).parent.parent.parent / "models" / "examples"
    examples = []
    if examples_dir.exists():
        for f in examples_dir.glob("*.json"):
            with open(f, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                examples.append({"filename": f.name, "name": data.get("name", f.stem)})
    return {"examples": examples}
