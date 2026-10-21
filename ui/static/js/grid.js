/**
 * CelLab Grid — Desenare și interacțiune pe HTML5 Canvas.
 *
 * Responsabilități:
 * - Randare grid pe Canvas cu HiDPI support
 * - Desenare interactivă cu mouse-ul (click & drag)
 * - Actualizare instantanee a stării celulelor
 */

class GridRenderer {
    /**
     * @param {HTMLCanvasElement} canvas - Elementul Canvas.
     * @param {Object} options - Opțiuni de configurare.
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Dimensiuni grid
        this.gridWidth = options.gridWidth || 50;
        this.gridHeight = options.gridHeight || 50;
        this.cellSize = options.cellSize || 12;

        // Starea gridului (matrice 2D de 0 și 1)
        this.cells = [];
        this.initEmptyGrid();

        // Culori stări: 0 = dead (fundal închis), 1 = alive (verde vibrant)
        this.stateColors = ['#1a1a2e', '#00ff88'];

        // Stare interacțiune desenare
        this.isDrawing = false;
        this.drawState = 1;

        // Callbacks
        this.onCellToggle = null;

        this._setupCanvas();
        this._setupEventListeners();
    }

    /** Inițializează un grid gol de 0. */
    initEmptyGrid() {
        this.cells = Array.from({ length: this.gridHeight }, () =>
            Array(this.gridWidth).fill(0)
        );
    }

    /** Configurează dimensiunile canvas-ului și suportul pentru ecrane Retina/HiDPI. */
    _setupCanvas() {
        const displayWidth = this.gridWidth * this.cellSize;
        const displayHeight = this.gridHeight * this.cellSize;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        this.ctx.scale(dpr, dpr);
    }

    /** Atașează event listener-ii pentru interacțiune cu mouse-ul. */
    _setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        window.addEventListener('mouseup', () => this._onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
    }

    /** Convertește coordonatele mouse-ului în coordonate de celulă (row, col). */
    _mouseToCell(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return { row, col };
    }

    _onMouseDown(event) {
        this.isDrawing = true;
        const { row, col } = this._mouseToCell(event);
        if (row >= 0 && row < this.gridHeight && col >= 0 && col < this.gridWidth) {
            // Dacă dăm click pe o celulă vie, o transformăm în 0; altfel în 1
            this.drawState = this.cells[row][col] === 1 ? 0 : 1;
            this._setCell(row, col, this.drawState);
        }
    }

    _onMouseMove(event) {
        if (!this.isDrawing) return;
        const { row, col } = this._mouseToCell(event);
        this._setCell(row, col, this.drawState);
    }

    _onMouseUp() {
        this.isDrawing = false;
    }

    _setCell(row, col, state) {
        if (row < 0 || row >= this.gridHeight || col < 0 || col >= this.gridWidth) return;
        if (this.cells[row][col] === state) return;
        this.cells[row][col] = state;
        this.render();
        if (this.onCellToggle) {
            this.onCellToggle(row, col, state);
        }
    }

    /**
     * Actualizează gridul complet din datele serverului.
     * @param {number[][]} gridData - Matricea de 0 și 1.
     */
    updateGrid(gridData) {
        if (!gridData || gridData.length === 0) return;
        this.cells = gridData;
        this.gridHeight = gridData.length;
        this.gridWidth = gridData[0].length;
        this.render();
    }

    /** Calculează numărul de celule active (cu valoarea 1). */
    getActiveCellCount() {
        let count = 0;
        for (let r = 0; r < this.gridHeight; r++) {
            for (let c = 0; c < this.gridWidth; c++) {
                if (this.cells[r][c] === 1) count++;
            }
        }
        return count;
    }

    /** Randează gridul complet pe canvas. */
    render() {
        const ctx = this.ctx;
        const size = this.cellSize;

        // Șterge fundalul
        ctx.fillStyle = this.stateColors[0] || '#1a1a2e';
        ctx.fillRect(0, 0, this.gridWidth * size, this.gridHeight * size);

        // Desenează celulele vii (1)
        ctx.fillStyle = this.stateColors[1] || '#00ff88';
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                if (this.cells[row]?.[col] === 1) {
                    ctx.fillRect(col * size + 1, row * size + 1, size - 1, size - 1);
                }
            }
        }

        // Linii de grilă subțiri
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * size, 0);
            ctx.lineTo(x * size, this.gridHeight * size);
            ctx.stroke();
        }
        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * size);
            ctx.lineTo(this.gridWidth * size, y * size);
            ctx.stroke();
        }
    }

    /** Populează gridul aleatoriu local. */
    randomize(density = 0.3) {
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                this.cells[row][col] = Math.random() < density ? 1 : 0;
            }
        }
        this.render();
    }

    /** Resetează toate celulele la 0. */
    clear() {
        this.initEmptyGrid();
        this.render();
    }
}
