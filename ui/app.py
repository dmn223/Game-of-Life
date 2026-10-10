"""Aplicația FastAPI principală.

Servește:
- API REST pentru parsare NLP, control simulare, analiză
- WebSocket pentru streaming generații în timp real
- Fișierele statice ale interfeței web (HTML/CSS/JS)
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from ui.api.routes import router as api_router
from ui.api.websocket import router as ws_router

# Directorul cu fișierele statice
STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(
    title="CelLab",
    description="Sistem pentru simularea automatelor celulare 2D",
    version="0.1.0",
)

# Înregistrare rute API
app.include_router(api_router, prefix="/api")
app.include_router(ws_router, prefix="/ws")

# Servire fișiere statice
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """Servește pagina principală."""
    return FileResponse(str(STATIC_DIR / "index.html"))
