"""WebSocket handler pentru streaming generații în timp real.

Protocol:
- Client trimite: {"action": "start"} / {"action": "stop"} / {"action": "step"}
- Server trimite: {"type": "grid", "generation": N, "data": [[...]]}
"""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["websocket"])


class SimulationStreamer:
    """Gestionează streaming-ul de generații către un client WebSocket."""

    def __init__(self, websocket: WebSocket) -> None:
        self.websocket = websocket
        self.running: bool = False
        self.speed: float = 0.1  # secunde între generații

    async def start(self) -> None:
        """Pornește streaming-ul de generații."""
        self.running = True
        while self.running:
            # TODO: Integrare cu Simulator.step()
            # state = simulator.get_state_as_dict()
            # await self.websocket.send_json({"type": "grid", **state})
            await asyncio.sleep(self.speed)

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
                # Pornește simularea în background
                asyncio.create_task(streamer.start())
            elif action == "stop":
                streamer.stop()
            elif action == "step":
                # Un singur pas
                # TODO: Integrare cu Simulator
                pass
            elif action == "speed":
                streamer.speed = max(0.01, data.get("value", 0.1))

    except WebSocketDisconnect:
        streamer.stop()
