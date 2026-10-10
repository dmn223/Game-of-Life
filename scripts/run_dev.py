"""Script de lansare a serverului de dezvoltare.

Usage:
    python scripts/run_dev.py
"""

import sys
from pathlib import Path
import uvicorn

# Adaugă rădăcina proiectului în sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def main():
    """Pornește serverul FastAPI în modul de dezvoltare."""
    print("[CelLab] Pornire server de dezvoltare...")
    print("   Deschideți http://localhost:8000 în browser")
    print("   Ctrl+C pentru oprire\n")

    uvicorn.run(
        "ui.app:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=["."],
    )


if __name__ == "__main__":
    main()
