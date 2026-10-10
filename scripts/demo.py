"""Demo CLI rapid — testare rapidă a modelelor și simulatorului.

Usage:
    python scripts/demo.py
"""

import json
import sys
from pathlib import Path

# Adaugă rădăcina proiectului în sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from models.spec import CellularAutomatonSpec


def main():
    """Demo: încarcă exemplul Game of Life și afișează specificația."""
    print("[CelLab] Demo")
    print("=" * 40)

    # Încarcă exemplul Game of Life
    example_path = Path(__file__).parent.parent / "models" / "examples" / "game_of_life.json"
    with open(example_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    spec = CellularAutomatonSpec(**data)
    print(f"\n📋 Specificație: {spec.name}")
    print(f"   Descriere: {spec.description}")
    print(f"   Stări: {', '.join(s.name for s in spec.states)}")
    print(f"   Stare default: {spec.default_state}")
    print(f"   Vecinătate: {spec.neighborhood.value}")
    print(f"   Reguli: {len(spec.transitions)}")
    print(f"   Grid: {spec.grid.width}×{spec.grid.height} ({spec.grid.boundary.value})")

    print("\n✅ Schema Pydantic funcționează corect!")
    print("\n📄 JSON exportat:")
    print(spec.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
