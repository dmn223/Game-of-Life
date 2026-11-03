/**
 * CelLab Controls & Hashmap Simulation Engine — Motor de Simulare pe Spațiu Infinit.
 *
 * Include:
 * - Spațiu infinit O(celule active).
 * - Hashmap Pattern Memoization Cache: memorează stările locale calculate anterior pentru acces O(1).
 * - Controale complete: Play, Pause, Step, Reset, Random, Clear, Speed, Zoom, Fit All.
 * - Sincronizare rezistentă cu backend-ul.
 */

class SimulationControls {
    /**
     * @param {InfiniteGridRenderer} gridRenderer - Instanța InfiniteGridRenderer.
     */
    constructor(gridRenderer) {
        this.grid = gridRenderer;
        this.isPlaying = false;
        this.speed = 10; // generații pe secundă
        this.generation = 0;
        this.loopTimer = null;

        // Hashmap de stări memoizate: patternHash -> nextState
        // Dacă o secțiune de grid a fost calculată anterior, este găsită instant în O(1)
        this.hashmapCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;

        this._bindElements();
        this._bindEvents();
        this._initFpsMeter();
        this._updateHUD();
    }

    _bindElements() {
        // Controale principale
        this.btnPlay = document.getElementById('btn-play');
        this.btnPause = document.getElementById('btn-pause');
        this.btnStep = document.getElementById('btn-step');
        this.btnReset = document.getElementById('btn-reset');
        this.btnRandom = document.getElementById('btn-random');
        this.btnClear = document.getElementById('btn-clear');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');

        // Unelte navigare
        this.btnToolDraw = document.getElementById('btn-tool-draw');
        this.btnToolPan = document.getElementById('btn-tool-pan');
        this.btnZoomIn = document.getElementById('btn-zoom-in');
        this.btnZoomOut = document.getElementById('btn-zoom-out');
        this.btnResetView = document.getElementById('btn-reset-view');
        this.btnFitAll = document.getElementById('btn-fit-all');

        // Genetica Cromatică
        this.cellColorInput = document.getElementById('cell-color-input');
        this.customColorPreview = document.getElementById('custom-color-preview');
        this.geneticsChips = document.querySelectorAll('.genetics-chip');
        this.btnRecolorAll = document.getElementById('btn-recolor-all');

        // HUD & Indicatori
        this.generationCounter = document.getElementById('generation-counter');
        this.cellCount = document.getElementById('cell-count');
        this.cacheStats = document.getElementById('cache-stats');
        this.hudCoords = document.getElementById('hud-coords');
        this.hudZoom = document.getElementById('hud-zoom');
        this.hudFps = document.getElementById('hud-fps');
    }

    _bindEvents() {
        if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.play());
        if (this.btnPause) this.btnPause.addEventListener('click', () => this.pause());
        if (this.btnStep) this.btnStep.addEventListener('click', () => this.step());
        if (this.btnReset) this.btnReset.addEventListener('click', () => this.reset());
        if (this.btnRandom) this.btnRandom.addEventListener('click', () => this.randomize());
        if (this.btnClear) this.btnClear.addEventListener('click', () => this.clear());

        // Metodă unificată pentru selectarea și aplicarea culorii active
        const updateActiveColor = (hexOrRgb) => {
            const parsed = this.grid.parseColor(hexOrRgb);
            this.grid.setCurrentColor(parsed);
            const hex = this.grid.rgbToHex(parsed);

            if (this.cellColorInput) this.cellColorInput.value = hex;
            if (this.customColorPreview) this.customColorPreview.style.backgroundColor = hex;

            if (this.geneticsChips) {
                this.geneticsChips.forEach(c => {
                    const chipHex = c.dataset.color ? c.dataset.color.toLowerCase() : '';
                    if (chipHex === hex.toLowerCase()) {
                        c.classList.add('active');
                    } else {
                        c.classList.remove('active');
                    }
                });
            }
        };

        // Selector Culoare Genetică Celule (Chip-uri)
        if (this.geneticsChips) {
            this.geneticsChips.forEach(chip => {
                chip.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const color = chip.dataset.color;
                    updateActiveColor(color);
                });
            });
        }

        // Color picker nativ (atât pe evenimentul 'input' cât și pe 'change')
        if (this.cellColorInput) {
            const handleColorChange = (e) => {
                const color = e.target.value;
                updateActiveColor(color);
            };
            this.cellColorInput.addEventListener('input', handleColorChange);
            this.cellColorInput.addEventListener('change', handleColorChange);
        }

        // Buton Recolorare Toate Celulele Vii de pe ecran
        if (this.btnRecolorAll) {
            this.btnRecolorAll.addEventListener('click', () => {
                this.grid.recolorAll(this.grid.currentColor);
                if (window.rulesPanel) {
                    window.rulesPanel._showFeedback('🎨 Toate celulele vii au fost colorate în noua nuanță!', 'success');
                }
            });
        }

        if (this.speedSlider) {
            this.speedSlider.addEventListener('input', (e) => {
                this.speed = Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 10));
                if (this.speedValue) this.speedValue.textContent = `${this.speed} gen/s`;
                if (this.isPlaying && this.loopTimer) {
                    clearInterval(this.loopTimer);
                    this.loopTimer = setInterval(() => this._tick(), 1000 / this.speed);
                }
            });
        }

        // Unelte Desenare / Pan
        if (this.btnToolDraw) {
            this.btnToolDraw.addEventListener('click', () => {
                this.grid.currentTool = 'draw';
                this.btnToolDraw.classList.add('active');
                if (this.btnToolPan) this.btnToolPan.classList.remove('active');
                this.grid.canvas.style.cursor = 'crosshair';
            });
        }
        if (this.btnToolPan) {
            this.btnToolPan.addEventListener('click', () => {
                this.grid.currentTool = 'pan';
                this.btnToolPan.classList.add('active');
                if (this.btnToolDraw) this.btnToolDraw.classList.remove('active');
                this.grid.canvas.style.cursor = 'grab';
            });
        }

        // Butoane Zoom
        if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => this.grid.zoomIn());
        if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => this.grid.zoomOut());
        if (this.btnResetView) this.btnResetView.addEventListener('click', () => this.grid.resetView());
        if (this.btnFitAll) this.btnFitAll.addEventListener('click', () => this.grid.fitAll());

        // Callback la modificarea celulelor prin desenare
        this.grid.onCellChange = () => {
            this._updateHUD();
        };

        // Callback la mișcarea camerei / zoom
        this.grid.onViewportChange = (cx, cy, zoom) => {
            if (this.hudCoords) this.hudCoords.textContent = `Centru: (${Math.round(cx)}, ${Math.round(cy)})`;
            if (this.hudZoom) this.hudZoom.textContent = `Zoom: ${Math.round(zoom * 100)}%`;
        };

        // Scurtături de tastatură utile
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.isPlaying) this.pause();
                else this.play();
            } else if (e.key === 's' || e.key === 'S') {
                this.step();
            } else if (e.key === 'r' || e.key === 'R') {
                this.randomize();
            } else if (e.key === 'c' || e.key === 'C') {
                this.clear();
            } else if (e.key === 'f' || e.key === 'F') {
                this.grid.fitAll();
            }
        });
    }

    /**
     * Returnează regulile active din RulesPanel.
     * Dacă utilizatorul a șters toate regulile, returnează lista goală (fără reguli ascunse).
     */
    getActiveRules() {
        if (window.rulesPanel && Array.isArray(window.rulesPanel.rules)) {
            return window.rulesPanel.rules;
        }
        return [];
    }

    /**
     * Resetează cache-ul de hashmap (de apelat la schimbarea regulilor)
     */
    clearCache() {
        this.hashmapCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this._updateHUD();
    }

    /**
     * Calculează generația următoare pe spațiul infinit folosind Hashmap Memoization
     */
    executeStep() {
        const rules = this.getActiveRules();
        const enabledRules = rules.filter(r => r.enabled !== false);
        const activeCells = this.grid.cells;

        // Dacă nu există reguli active, starea este 100% STABILĂ:
        // Nu se modifică nicio celulă, gridul rămâne neschimbat!
        if (activeCells.size === 0 || enabledRules.length === 0) {
            this.generation += 1;
            this._updateHUD();
            return;
        }

        // 1. Identificăm toate coordonatele candidate (celulele vii + toți vecinii lor din jur)
        const candidates = new Set();
        const neighborOffsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0], [0,  0], [1,  0],
            [-1,  1], [0,  1], [1,  1]
        ];

        for (const key of activeCells.keys()) {
            const sep = key.indexOf(',');
            const cx = parseInt(key.slice(0, sep), 10);
            const cy = parseInt(key.slice(sep + 1), 10);

            for (const [dx, dy] of neighborOffsets) {
                candidates.add(`${cx + dx},${cy + dy}`);
            }
        }

        const nextCells = new Map();
        // Colectăm acțiuni simultane multi-țintă dacă există reguli relative cu ținte multiple
        const multiActions = new Map();

        // Mutație genetică aleatorie între 1% și 3% pe fiecare canal RGB
        const mutateChannel = (val) => {
            const pct = 0.01 + Math.random() * 0.02; // [0.01, 0.03]
            const sign = Math.random() < 0.5 ? -1 : 1;
            const delta = sign * pct * 255;
            return Math.max(0, Math.min(255, Math.round(val + delta)));
        };

        // Calculează culoarea unei celule noi: medie a celulelor vecine vii + mutație
        const computeChildColor = (cx, cy) => {
            let totalR = 0;
            let totalG = 0;
            let totalB = 0;
            let count = 0;

            for (const [dx, dy] of [
                [-1, -1], [0, -1], [1, -1],
                [-1,  0],          [1,  0],
                [-1,  1], [0,  1], [1,  1]
            ]) {
                const parentColor = activeCells.get(`${cx + dx},${cy + dy}`);
                if (parentColor) {
                    totalR += (parentColor.r !== undefined ? parentColor.r : 0);
                    totalG += (parentColor.g !== undefined ? parentColor.g : 255);
                    totalB += (parentColor.b !== undefined ? parentColor.b : 136);
                    count++;
                }
            }

            if (count > 0) {
                return {
                    r: mutateChannel(totalR / count),
                    g: mutateChannel(totalG / count),
                    b: mutateChannel(totalB / count)
                };
            }

            // Fără părinți direcți (naștere spontană): folosește culoarea curentă + mutație
            const curr = this.grid.currentColor || { r: 0, g: 255, b: 136 };
            return {
                r: mutateChannel(curr.r),
                g: mutateChannel(curr.g),
                b: mutateChannel(curr.b)
            };
        };

        // 2. Pentru fiecare celulă candidată: verificăm în Hashmap Cache
        for (const key of candidates) {
            const sep = key.indexOf(',');
            const x = parseInt(key.slice(0, sep), 10);
            const y = parseInt(key.slice(sep + 1), 10);

            // Calculăm hash-ul configurației 3x3 din jurul lui (x, y)
            // Valoare binară compactă (9 biți)
            let hash = 0;
            let bit = 0;
            for (const [dx, dy] of neighborOffsets) {
                if (activeCells.has(`${x + dx},${y + dy}`)) {
                    hash |= (1 << bit);
                }
                bit++;
            }

            // --- LOOKUP ÎN HASHMAP CACHE (O(1)) ---
            if (this.hashmapCache.has(hash)) {
                this.cacheHits++;
                const cached = this.hashmapCache.get(hash);
                if (cached.nextState === 1) {
                    // Dacă celula era deja vie, își păstrează culoarea genetică proprie
                    // Dacă e o celulă NOUĂ născută, calculăm media culorilor părinților + mutație 1-3%
                    const cellColor = activeCells.has(key)
                        ? (activeCells.get(key) || { r: 0, g: 255, b: 136 })
                        : computeChildColor(x, y);
                    nextCells.set(key, cellColor);
                }
                // Dacă regula din cache avea acțiuni multi-țintă
                if (cached.multiEffects && cached.multiEffects.length > 0) {
                    for (const eff of cached.multiEffects) {
                        const tk = `${x + eff.dx},${y + eff.dy}`;
                        if (!multiActions.has(tk)) multiActions.set(tk, []);
                        multiActions.get(tk).push(eff.action);
                    }
                }
                continue;
            }

            // --- DACĂ NU ESTE ÎN HASHMAP: Evaluăm regulile și salvăm în Hashmap ---
            this.cacheMisses++;

            const currVal = activeCells.has(key) ? 1 : 0;
            // Număr vecini vii din cei 8 (fără centru)
            let aliveNeighbors = 0;
            for (let i = 0; i < 9; i++) {
                if (i !== 4 && (hash & (1 << i))) {
                    aliveNeighbors++;
                }
            }

            let cellNextState = currVal;
            let matchedAny = false;
            let multiEffects = [];

            for (const rule of enabledRules) {
                // Verificare stare curentă
                const reqState = rule.current_state !== undefined ? rule.current_state : -1;
                if (reqState !== -1 && currVal !== reqState) continue;

                let matched = true;

                // Verificare condiții tip pattern relativ
                const patternConds = rule.pattern_conditions || [];
                if (patternConds.length > 0) {
                    for (const cond of patternConds) {
                        const cVal = activeCells.has(`${x + cond.dx},${y + cond.dy}`) ? 1 : 0;
                        const reqVal = cond.state !== undefined ? cond.state : 1;
                        if (cVal !== reqVal) {
                            matched = false;
                            break;
                        }
                    }
                }

                // Verificare condiții contor vecini
                const countConds = rule.count_conditions || [];
                if (matched && countConds.length > 0) {
                    for (const cc of countConds) {
                        const minC = cc.min_count !== undefined ? cc.min_count : 0;
                        const maxC = cc.max_count !== undefined ? cc.max_count : 8;
                        if (aliveNeighbors < minC || aliveNeighbors > maxC) {
                            matched = false;
                            break;
                        }
                    }
                }

                if (!patternConds.length && !countConds.length && reqState === -1) {
                    matched = false;
                }

                if (matched) {
                    matchedAny = true;
                    const effects = rule.effects || [{ dx: 0, dy: 0, action: (rule.result_state === 1 ? 'set_1' : 'set_0') }];

                    for (const eff of effects) {
                        if (eff.dx === 0 && eff.dy === 0) {
                            if (eff.action === 'set_1' || eff.action === 1) cellNextState = 1;
                            else if (eff.action === 'set_0' || eff.action === 0) cellNextState = 0;
                            else if (eff.action === 'invert') cellNextState = 1 - cellNextState;
                        } else {
                            multiEffects.push(eff);
                            const tk = `${x + eff.dx},${y + eff.dy}`;
                            if (!multiActions.has(tk)) multiActions.set(tk, []);
                            multiActions.get(tk).push(eff.action);
                        }
                    }
                }
            }

            // Memorăm rezultatul în Hashmap Cache pentru căutări viitoare instantanee
            this.hashmapCache.set(hash, {
                nextState: cellNextState,
                multiEffects: multiEffects,
            });

            if (cellNextState === 1) {
                const cellColor = activeCells.has(key)
                    ? (activeCells.get(key) || { r: 0, g: 255, b: 136 })
                    : computeChildColor(x, y);
                nextCells.set(key, cellColor);
            }
        }

        // 3. Aplicăm acțiunile simultane pe câmpuri externe relative
        for (const [tKey, acts] of multiActions.entries()) {
            let val = nextCells.has(tKey) ? 1 : (activeCells.has(tKey) ? 1 : 0);
            for (const act of acts) {
                if (act === 'set_1' || act === 1) val = 1;
                else if (act === 'set_0' || act === 0) val = 0;
                else if (act === 'invert') val = 1 - val;
            }
            if (val === 1) {
                if (!nextCells.has(tKey)) {
                    const sep = tKey.indexOf(',');
                    const tx = parseInt(tKey.slice(0, sep), 10);
                    const ty = parseInt(tKey.slice(sep + 1), 10);
                    const cellColor = activeCells.has(tKey)
                        ? (activeCells.get(tKey) || { r: 0, g: 255, b: 136 })
                        : computeChildColor(tx, ty);
                    nextCells.set(tKey, cellColor);
                }
            } else {
                nextCells.delete(tKey);
            }
        }

        // Actualizăm starea gridului
        this.grid.cells = nextCells;
        this.generation += 1;

        this.grid.render();
        this._updateHUD();
    }

    _tick() {
        if (!this.isPlaying) return;
        this.executeStep();
    }

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        if (this.btnPlay) this.btnPlay.disabled = true;
        if (this.btnPause) this.btnPause.disabled = false;

        this.loopTimer = setInterval(() => this._tick(), 1000 / this.speed);
    }

    pause() {
        this.isPlaying = false;
        if (this.loopTimer) {
            clearInterval(this.loopTimer);
            this.loopTimer = null;
        }
        if (this.btnPlay) this.btnPlay.disabled = false;
        if (this.btnPause) this.btnPause.disabled = true;
    }

    step() {
        if (this.isPlaying) this.pause();
        this.executeStep();
    }

    reset() {
        this.pause();
        this.generation = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this._updateHUD();
    }

    clear() {
        this.pause();
        this.grid.clear();
        this.generation = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        this._updateHUD();
    }

    randomize(size = 60, density = 0.28) {
        this.pause();
        this.grid.randomize(size, density);
        this.generation = 0;
        this._updateHUD();
    }

    /**
     * Inițializează contorul de FPS în timp real bazat pe requestAnimationFrame.
     * Măsoară fluența randării pe ecran și starea de încărcare a simulatorului.
     */
    _initFpsMeter() {
        let frameCount = 0;
        let lastTime = performance.now();
        this.currentFps = 60;

        const updateFpsUi = (fps) => {
            this.currentFps = fps;
            const text = `⚡ ${fps} FPS`;

            if (this.hudFps) {
                this.hudFps.textContent = text;
                this.hudFps.classList.remove('fps-good', 'fps-warn', 'fps-bad');
                if (fps >= 50) this.hudFps.classList.add('fps-good');
                else if (fps >= 30) this.hudFps.classList.add('fps-warn');
                else this.hudFps.classList.add('fps-bad');
                this.hudFps.title = `Fluență: ${fps} FPS (${fps >= 50 ? 'Excelent' : fps >= 30 ? 'Bun' : 'Scăzut'})`;
            }
        };

        const fpsLoop = (timestamp) => {
            frameCount++;
            const elapsed = timestamp - lastTime;
            if (elapsed >= 500) {
                const calculatedFps = Math.round((frameCount * 1000) / elapsed);
                updateFpsUi(calculatedFps);
                frameCount = 0;
                lastTime = timestamp;
            }
            requestAnimationFrame(fpsLoop);
        };

        requestAnimationFrame(fpsLoop);
    }

    _updateHUD() {
        const count = this.grid.getActiveCellCount();
        if (this.generationCounter) this.generationCounter.textContent = `Gen: ${this.generation}`;
        if (this.cellCount) this.cellCount.textContent = `Vii: ${count}`;

        const rules = this.getActiveRules();
        const enabledCount = rules.filter(r => r.enabled !== false).length;

        if (this.cacheStats) {
            if (enabledCount === 0) {
                this.cacheStats.textContent = 'Stare: Stabilă (0 reguli)';
            } else {
                const totalQueries = this.cacheHits + this.cacheMisses;
                const hitRate = totalQueries > 0 ? Math.round((this.cacheHits / totalQueries) * 100) : 0;
                this.cacheStats.textContent = `Hashmap: ${this.hashmapCache.size} stări (${hitRate}% hit)`;
            }
        }
    }
}
