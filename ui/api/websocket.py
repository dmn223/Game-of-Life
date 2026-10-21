"""WebSocket handler pentru streaming generații în timp real.

Protocol:
- Client trimite: {"action": "start"} / {"action": "stop"} / {"action": "step"} / {"action": "speed", "value": 10}
- Server trimite: {"type": "grid", "generation": N, "data": [[...]], "active_cells": M}
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

import ui.api.routes as rt

router = APIRouter(tags=["websocket"])


class SimulationStreamer:
    """Gestionează streaming-ul de generații către un client WebSocket."""

    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.running: bool = False
        self.speed: float = 0.1  # secunde între generații

    async def start(self) -> None:
        """Pornește streaming-ul continuu de generații."""
        self.running = True
        while self.running:
            if not rt._rules:
                await asyncio.sleep(self.speed)
                continue

            rt._step_simulation()
            active = sum(cell for row in rt._grid for cell in row)
            try:
                await self.websocket.send_json({
                    "type": "grid",
                    "generation": rt._generation,
                    "data": rt._grid,
                    "active_cells": active,
                })
            except Exception:
                self.running = False
                break
            await asyncio.sleep(self.speed)

    async def do_step(self) -> None:
        """Execută un singur pas și trimite rezultatul înapoi."""
        if not rt._rules:
            await self.websocket.send_json({
                "type": "error",
                "message": "Nu sunt definite reguli. Adăugați reguli mai întâi!"
            })
            return

        rt._step_simulation()
        active = sum(cell for row in rt._grid for cell in row)
        await self.websocket.send_json({
            "type": "grid",
            "generation": rt._generation,
            "data": rt._grid,
            "active_cells": active,
        })

    def stop(self) -> None:
        """Oprește streaming-ul."""
        self.running = False


@router.websocket("/simulation")
async def simulation_websocket(websocket: WebSocket):
    """Endpoint WebSocket pentru simulare în timp real."""
    await websocket.accept()
    streamer = SimulationStreamer(websocket)

    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "start":
                asyncio.create_task(streamer.start())
            elif action == "stop":
                streamer.stop()
            elif action == "step":
                await streamer.do_step()
            elif action == "speed":
                # Convertim generații/sec în interval de somn
                hz = max(1, data.get("value", 10))
                streamer.speed = max(0.016, 1.0 / hz)
            elif action == "set_grid":
                grid_data = data.get("grid")
                if grid_data and isinstance(grid_data, list):
                    rt._grid = grid_data
                    rt._generation = 0

    except WebSocketDisconnect:
        streamer.stop()
