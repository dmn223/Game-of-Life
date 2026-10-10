/**
 * CelLab Controls — Logica butoanelor de control (Play/Pause/Step/Reset).
 */

class SimulationControls {
    /**
     * @param {GridRenderer} gridRenderer - Instanța GridRenderer.
     */
    constructor(gridRenderer) {
        this.grid = gridRenderer;
        this.isPlaying = false;
        this.animationId = null;
        this.speed = 10; // generații pe secundă
        this.ws = null; // WebSocket connection

        this._bindElements();
        this._bindEvents();
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
    }

    _bindEvents() {
        this.btnPlay.addEventListener('click', () => this.play());
        this.btnPause.addEventListener('click', () => this.pause());
        this.btnStep.addEventListener('click', () => this.step());
        this.btnReset.addEventListener('click', () => this.reset());
        this.btnRandom.addEventListener('click', () => this.randomize());
        this.btnClear.addEventListener('click', () => this.clear());

        this.speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            this.speedValue.textContent = `${this.speed} gen/s`;
        });
    }

    play() {
        this.isPlaying = true;
        this.btnPlay.disabled = true;
        this.btnPause.disabled = false;
        // TODO: Pornire simulare via WebSocket
        console.log('▶ Play — simulare pornită');
    }

    pause() {
        this.isPlaying = false;
        this.btnPlay.disabled = false;
        this.btnPause.disabled = true;
        // TODO: Oprire simulare via WebSocket
        console.log('⏸ Pause — simulare oprită');
    }

    step() {
        // TODO: Un singur pas de simulare
        console.log('⏭ Step — un pas de simulare');
    }

    reset() {
        this.pause();
        // TODO: Reset simulare
        console.log('⏹ Reset — simulare resetată');
    }

    randomize() {
        this.grid.randomize(0.3);
        console.log('🎲 Random — grid populat aleatoriu');
    }

    clear() {
        this.grid.clear();
        console.log('🗑 Clear — grid șters');
    }

    /**
     * Actualizează contoarele din UI.
     * @param {number} generation - Numărul generației.
     * @param {number} activeCells - Numărul de celule active.
     */
    updateCounters(generation, activeCells) {
        this.generationCounter.textContent = `Generația: ${generation}`;
        this.cellCount.textContent = `Celule active: ${activeCells}`;
    }
}
