/**
 * CelLab Controls — Controlul complet al simulării (Play/Pause/Step/Reset/Random/Clear).
 *
 * Funcționează 100% garantat prin motor local instantaneu în JavaScript
 * + sincronizare în timp real cu serverul (WebSocket / REST).
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
        this.loopTimer = null;
        this.lastStepTime = 0;

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
        if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.play());
        if (this.btnPause) this.btnPause.addEventListener('click', () => this.pause());
        if (this.btnStep) this.btnStep.addEventListener('click', () => this.step());
        if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());
        if (this.btnRandom) this.btnRandom.addEventListener('click', () => this.randomize());
        if (this.btnClear) this.btnClear.addEventListener('click', () => this.clear());

        if (this.speedSlider) {
            this.speedSlider.addEventListener('input', (e) => {
                this.speed = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 10));
                if (this.speedValue) {
                    this.speedValue.textContent = `${this.speed} gen/s`;
                }
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    try {
                        this.ws.send(JSON.stringify({ action: 'speed', value: this.speed }));
                    } catch (err) {}
                }
                // Dacă rulează, adaptăm intervalul local
                if (this.isPlaying && this.loopTimer) {
                    clearInterval(this.loopTimer);
                    this.loopTimer = setInterval(() => this._tick(), 1000 / this.speed);
                }
            });
        }

        // Când utilizatorul desenează cu mouse-ul pe canvas
        this.grid.onCellToggle = (row, col, state) => {
            ApiClient.toggleCell(row, col).catch(() => {});
            this.updateCounters(this.generation, this.grid.getActiveCellCount());
        };
    }

    _initWebSocket() {
        try {
            this.ws = ApiClient.createSimulationSocket();
            if (!this.ws) {
                this._setStatus(false, 'Local / REST');
                return;
            }

            this.ws.onopen = () => {
                this._setStatus(true, '● Conectat (WebSocket)');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'grid') {
                        this.grid.updateGrid(data.data);
                        this.generation = data.generation;
                        this.updateCounters(data.generation, data.active_cells !== undefined ? data.active_cells : this.grid.getActiveCellCount());
                    }
                } catch (e) {
                    console.error('Eroare parsare mesaj WS:', e);
                }
            };

            this.ws.onclose = () => {
                this._setStatus(false, '○ Mod Local / REST');
                // Încercare reconectare silențioasă după 4 secunde
                setTimeout(() => this._initWebSocket(), 4000);
            };

            this.ws.onerror = () => {
                this._setStatus(false, '○ Mod Local / REST');
            };
        } catch (e) {
            this._setStatus(false, '○ Mod Local / REST');
        }
    }

    _setStatus(connected, text) {
        if (!this.statusIndicator) return;
        this.statusIndicator.textContent = text;
        this.statusIndicator.className = connected ? 'status-badge connected' : 'status-badge disconnected';
    }

    _wsSend(payload) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(payload));
                return true;
            } catch (err) {}
        }
        return false;
    }

    /**
     * Returnează regulile active din RulesPanel sau regulile default Conway's GoL
     */
    getActiveRules() {
        if (window.rulesPanel && Array.isArray(window.rulesPanel.rules) && window.rulesPanel.rules.length > 0) {
            return window.rulesPanel.rules;
        }
        // Reguli implicite Conway's Game of Life
        return [
            {
                name: 'GoL: Supraviețuire',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 2, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
            },
            {
                name: 'GoL: Naștere',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 3, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
            },
            {
                name: 'GoL: Subpopulare',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 1, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
            },
            {
                name: 'GoL: Suprapopulare',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 4, max_count: 8, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
            },
        ];
    }

    /**
     * Returnează tipul de margine ('wrap' sau 'dead')
     */
    getBoundary() {
        const boundElem = document.getElementById('rule-boundary');
        return boundElem ? boundElem.value : 'wrap';
    }

    /**
     * Calculează un pas de simulare complet pe client (100% offline-ready)
     */
    executeStepLocally() {
        const gridCells = this.grid.cells;
        const h = gridCells.length;
        const w = h > 0 ? gridCells[0].length : 0;
        if (h === 0 || w === 0) return;

        const boundary = this.getBoundary();
        const rules = this.getActiveRules();

        const getCell = (r, c) => {
            if (boundary === 'wrap') {
                const nr = ((r % h) + h) % h;
                const nc = ((c % w) + w) % w;
                return gridCells[nr][nc];
            } else {
                if (r >= 0 && r < h && c >= 0 && c < w) {
                    return gridCells[r][c];
                }
                return 0;
            }
        };

        const countNeighbors = (r, c, state = 1, neighborhood = 'moore') => {
            let count = 0;
            const offsets = neighborhood === 'von_neumann'
                ? [[-1, 0], [0, -1], [0, 1], [1, 0]]
                : [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const [dr, dc] of offsets) {
                if (getCell(r + dr, c + dc) === state) count++;
            }
            return count;
        };

        // Copiem starea inițială
        const newGrid = gridCells.map(row => [...row]);
        // Map pentru acumularea acțiunilor simultane: "r,c" -> [action, ...]
        const actionsMap = new Map();

        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const currVal = gridCells[r][c];

                for (const rule of rules) {
                    // Dacă regula este dezactivată explicit, o sărim
                    if (rule.enabled === false) continue;

                    // 1. Verificare stare celulă curentă [x, y]
                    const reqState = rule.current_state !== undefined ? rule.current_state : -1;
                    if (reqState !== -1 && currVal !== reqState) continue;

                    let matched = true;

                    // 2. Condiții de tip pattern relativ [x+dx, y+dy]
                    const patternConds = rule.pattern_conditions || [];
                    if (patternConds.length > 0) {
                        for (const cond of patternConds) {
                            const dr = cond.dy !== undefined ? cond.dy : (cond.dr || 0);
                            const dc = cond.dx !== undefined ? cond.dx : (cond.dc || 0);
                            const reqNeighborState = cond.state !== undefined ? cond.state : 1;
                            if (getCell(r + dr, c + dc) !== reqNeighborState) {
                                matched = false;
                                break;
                            }
                        }
                    }

                    // 3. Condiții de contor vecini (Moore / Von Neumann)
                    const countConds = rule.count_conditions || [];
                    if (matched && countConds.length > 0) {
                        for (const cc of countConds) {
                            const cnt = countNeighbors(r, c, cc.state !== undefined ? cc.state : 1, cc.neighborhood || 'moore');
                            const minC = cc.min_count !== undefined ? cc.min_count : 0;
                            const maxC = cc.max_count !== undefined ? cc.max_count : 8;
                            if (cnt < minC || cnt > maxC) {
                                matched = false;
                                break;
                            }
                        }
                    }

                    if (!patternConds.length && !countConds.length && reqState === -1) {
                        matched = false;
                    }

                    if (matched) {
                        // Acumulăm efectele pentru toate câmpurile țintă
                        let effects = rule.effects;
                        if (!effects || effects.length === 0) {
                            const resState = rule.result_state !== undefined ? rule.result_state : 1;
                            effects = [{ dx: 0, dy: 0, action: resState === 1 ? 'set_1' : 'set_0' }];
                        }

                        for (const eff of effects) {
                            const dr = eff.dy !== undefined ? eff.dy : (eff.dr || 0);
                            const dc = eff.dx !== undefined ? eff.dx : (eff.dc || 0);
                            const act = eff.action || 'set_1';

                            let tr, tc;
                            if (boundary === 'wrap') {
                                tr = ((r + dr) % h + h) % h;
                                tc = ((c + dc) % w + w) % w;
                            } else {
                                tr = r + dr;
                                tc = c + dc;
                                if (tr < 0 || tr >= h || tc < 0 || tc >= w) continue;
                            }

                            const key = `${tr},${tc}`;
                            if (!actionsMap.has(key)) actionsMap.set(key, []);
                            actionsMap.get(key).push(act);
                        }
                    }
                }
            }
        }

        // Aplicăm toate acțiunile acumulate SIMULTAN
        let activeCount = 0;
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const key = `${r},${c}`;
                if (actionsMap.has(key)) {
                    let val = gridCells[r][c];
                    for (const act of actionsMap.get(key)) {
                        if (act === 'set_1' || act === '1' || act === 1) val = 1;
                        else if (act === 'set_0' || act === '0' || act === 0) val = 0;
                        else if (act === 'invert' || act === 'toggle' || act === 'invers') val = 1 - val;
                        // 'keep' nu modifică val
                    }
                    newGrid[r][c] = val;
                }
                if (newGrid[r][c] === 1) activeCount++;
            }
        }

        this.grid.updateGrid(newGrid);
        this.generation += 1;
        this.updateCounters(this.generation, activeCount);
    }

    _tick() {
        if (!this.isPlaying) return;
        this.executeStepLocally();
    }

    /**
     * Pornește simularea continuă
     */
    async play() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        if (this.btnPlay) this.btnPlay.disabled = true;
        if (this.btnPause) this.btnPause.disabled = false;

        // Sincronizăm gridul curent cu serverul
        ApiClient.setGrid(this.grid.cells).catch(() => {});

        // Încercăm pornirea prin WebSocket
        const wsStarted = this._wsSend({ action: 'set_grid', grid: this.grid.cells }) &&
                          this._wsSend({ action: 'speed', value: this.speed }) &&
                          this._wsSend({ action: 'start' });

        // Pornim loop-ul local de garantare (dacă WS nu e conectat)
        if (!wsStarted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            if (this.loopTimer) clearInterval(this.loopTimer);
            this.loopTimer = setInterval(() => this._tick(), 1000 / this.speed);
        }
    }

    /**
     * Oprește simularea
     */
    pause() {
        this.isPlaying = false;
        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }

        if (this.btnPlay) this.btnPlay.disabled = false;
        if (this.btnPause) this.btnPause.disabled = true;

        this._wsSend({ action: 'stop' });
    }

    /**
     * Execută un singur pas de simulare
     */
    async step() {
        if (this.isPlaying) {
            this.pause();
        }

        // Executăm instant pe client
        this.executeStepLocally();

        // Sincronizăm în background pe server
        ApiClient.simulateStep().catch(() => {});
    }

    /**
     * Resetează generația la 0 (păstrează configurația curentă de celule)
     */
    async reset() {
        this.pause();
        this.generation = 0;
        this.updateCounters(0, this.grid.getActiveCellCount());
        ApiClient.resetSimulation().catch(() => {});
    }

    /**
     * Populează aleatoriu gridul cu celule vii (30%)
     */
    async randomize() {
        this.pause();
        this.grid.randomize(0.3);
        this.generation = 0;
        const active = this.grid.getActiveCellCount();
        this.updateCounters(0, active);

        // Sincronizare server
        ApiClient.setGrid(this.grid.cells).catch(() => {});
    }

    /**
     * Curăță tot gridul (toate celulele devin 0)
     */
    async clear() {
        this.pause();
        this.grid.clear();
        this.generation = 0;
        this.updateCounters(0, 0);

        // Sincronizare server
        ApiClient.clearGrid().catch(() => {});
    }

    /**
     * Actualizează contoarele din antetul Canvas-ului
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
