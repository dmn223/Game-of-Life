/**
 * CelLab Controls — Controlul simulării (Play/Pause/Step/Reset/Random/Clear).
 * Conexiune hibridă: WebSocket pentru streaming rapid + fallback REST.
 */

class SimulationControls {
    /**
     * @param {GridRenderer} gridRenderer - Instanța GridRenderer.
     */
    constructor(gridRenderer) {
        this.grid = gridRenderer;
        this.isPlaying = false;
        this.speed = 10; // generații pe secundă
        this.ws = null;
        this.generation = 0;

        this._bindElements();
        this._bindEvents();
        this._initWebSocket();
    }

    _bindElements() {
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnStep = document.getElementById('btn-step');
        this.btnReset = document.getElementById('btn-reset');
        this.btnRandom = document.getElementById('btn-random');
        this.btnClear = document.getElementById('btn-clear');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');
        this.generationCounter = document.getElementById('generation-counter');
        this.cellCount = document.getElementById('cell-count');
        this.statusIndicator = document.getElementById('status-indicator');
    }

    _bindEvents() {
        this.btnPlay.addEventListener('click', () => this.play());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnStep.addEventListener('click', () => this.step());
        this.btnReset.addEventListener('click', () => this.reset());
        this.btnRandom.addEventListener('click', () => this.randomize());
        this.btnClear.addEventListener('click', () => this.clear());

        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value, 10);
            this.speedValue.textContent = `${this.speed} gen/s`;
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ action: 'speed', value: this.speed }));
            }
        });

        // Când utilizatorul desenează pe canvas, sincronizăm cu serverul
        this.grid.onCellToggle = (row, col, state) => {
            ApiClient.toggleCell(row, col).catch(() => {});
            this.updateCounters(this.generation, this.grid.getActiveCellCount());
        };
    }

    _initWebSocket() {
        try {
            this.ws = ApiClient.createSimulationSocket();

            this.ws.onopen = () => {
                if (this.statusIndicator) {
                    this.statusIndicator.textContent = '● Conectat (WebSocket)';
                    this.statusIndicator.className = 'status-badge connected';
                }
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'grid') {
                        this.grid.updateGrid(data.data);
                        this.generation = data.generation;
                        this.updateCounters(data.generation, data.active_cells);
                    } else if (data.type === 'error') {
                        this.pause();
                        alert(`Eroare simulare: ${data.message}`);
                    }
                } catch (e) {
                    console.error('Eroare procesare mesaj WS:', e);
                }
            };

            this.ws.onclose = () => {
                if (this.statusIndicator) {
                    this.statusIndicator.textContent = '○ Mod REST (reconectare...)';
                    this.statusIndicator.className = 'status-badge disconnected';
                }
                setTimeout(() => this._initWebSocket(), 3000);
            };

            this.ws.onerror = () => {
                if (this.statusIndicator) {
                    this.statusIndicator.textContent = '○ Mod REST';
                    this.statusIndicator.className = 'status-badge disconnected';
                }
            };
        } catch (e) {
            console.warn('Nu s-a putut inițializa WebSocket, se folosește REST fallback.');
        }
    }

    _wsSend(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
            return true;
        }
        return false;
    }

    async play() {
        this.isPlaying = true;
        this.btnPlay.disabled = true;
        this.btnPause.disabled = false;

        // Trimitem starea curentă a gridului la server pentru siguranță
        await ApiClient.setGrid(this.grid.cells).catch(() => {});

        const sent = this._wsSend({ action: 'set_grid', grid: this.grid.cells }) &&
                     this._wsSend({ action: 'speed', value: this.speed }) &&
                     this._wsSend({ action: 'start' });

        if (!sent) {
            // Fallback REST interval loop
            this._runRestLoop();
        }
    }

    _runRestLoop() {
        if (!this.isPlaying) return;
        ApiClient.simulateStep()
            .then((data) => {
                if (data && data.grid) {
                    this.grid.updateGrid(data.grid);
                    this.generation = data.generation;
                    this.updateCounters(data.generation, data.active_cells);
                }
                if (this.isPlaying) {
                    setTimeout(() => this._runRestLoop(), 1000 / this.speed);
                }
            })
            .catch((err) => {
                this.pause();
                alert(`Eroare: ${err.message}`);
            });
    }

    pause() {
        this.isPlaying = false;
        this.btnPlay.disabled = false;
        this.btnPause.disabled = true;
        this._wsSend({ action: 'stop' });
    }

    async step() {
        // Dacă e în play, punem pauză mai întâi
        if (this.isPlaying) {
            this.pause();
        }

        // Asigurăm sincronizarea gridului desenat manual
        await ApiClient.setGrid(this.grid.cells).catch(() => {});

        try {
            const data = await ApiClient.simulateStep();
            if (data && data.grid) {
                this.grid.updateGrid(data.grid);
                this.generation = data.generation;
                this.updateCounters(data.generation, data.active_cells);
            }
        } catch (err) {
            alert(`Nu s-a putut rula pasul: ${err.message}\nAsigurați-vă că ați adăugat cel puțin o regulă și ați apăsat "Aplică Regulile".`);
        }
    }

    async reset() {
        this.pause();
        await ApiClient.resetSimulation().catch(() => {});
        this.generation = 0;
        this.updateCounters(0, this.grid.getActiveCellCount());
    }

    async randomize() {
        this.pause();
        try {
            const res = await ApiClient.randomGrid(0.3);
            if (res && res.grid) {
                this.grid.updateGrid(res.grid);
                this.generation = 0;
                this.updateCounters(0, res.active_cells);
            }
        } catch (e) {
            this.grid.randomize(0.3);
            this.generation = 0;
            this.updateCounters(0, this.grid.getActiveCellCount());
        }
    }

    async clear() {
        this.pause();
        try {
            await ApiClient.clearGrid();
        } catch (e) {}
        this.grid.clear();
        this.generation = 0;
        this.updateCounters(0, 0);
    }

    /**
     * Actualizează contoarele din antetul Canvas-ului.
     */
    updateCounters(generation, activeCells) {
        if (this.generationCounter) {
            this.generationCounter.textContent = `Generația: ${generation}`;
        }
        if (this.cellCount) {
            this.cellCount.textContent = `Celule active: ${activeCells}`;
        }
    }
}
