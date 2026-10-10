/**
 * CelLab Grid — Desenare și interacțiune pe Canvas.
 *
 * Responsabilități:
 * - Randare grid pe HTML5 Canvas
 * - Interacțiune mouse (click, drag pentru desenare celule)
 * - Zoom și pan
 * - Actualizare vizuală la schimbarea stării
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

        // Starea gridului (matrice 2D de indici de stare)
        this.cells = [];
        this.initEmptyGrid();

        // Culori stări (se actualizează din spec)
        this.stateColors = ['#1a1a2e', '#00ff88'];

        // Stare interacțiune
        this.isDrawing = false;
        this.drawState = 1; // Indexul stării cu care se desenează

        // Zoom & Pan
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;

        // Callbacks
        this.onCellToggle = null; // Funcție apelată la click pe celulă

        this._setupCanvas();
        this._setupEventListeners();
    }

    /** Inițializează un grid gol. */
    initEmptyGrid() {
        this.cells = Array.from({ length: this.gridHeight }, () =>
            Array(this.gridWidth).fill(0)
        );
    }

    /** Configurează dimensiunile canvas-ului. */
    _setupCanvas() {
        const displayWidth = this.gridWidth * this.cellSize;
        const displayHeight = this.gridHeight * this.cellSize;

        // High DPI support
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = displayWidth * dpr;
        this.canvas.height = displayHeight * dpr;
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;
        this.ctx.scale(dpr, dpr);
    }

    /** Atașează event listener-ii pentru interacțiune. */
    _setupEventListeners() {
        this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this._onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this._onMouseUp());
        // TODO: Touch events, wheel zoom
    }

    /** Convertește coordonate mouse → celulă grid. */
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
        this._toggleCell(row, col);
    }

    _onMouseMove(event) {
        if (!this.isDrawing) return;
        const { row, col } = this._mouseToCell(event);
        this._setCell(row, col, this.drawState);
    }

    _onMouseUp() {
        this.isDrawing = false;
    }

    _toggleCell(row, col) {
        if (row < 0 || row >= this.gridHeight || col < 0 || col >= this.gridWidth) return;
        this.cells[row][col] = this.cells[row][col] === 0 ? this.drawState : 0;
        this.render();
        if (this.onCellToggle) this.onCellToggle(row, col, this.cells[row][col]);
    }

    _setCell(row, col, state) {
        if (row < 0 || row >= this.gridHeight || col < 0 || col >= this.gridWidth) return;
        if (this.cells[row][col] === state) return;
        this.cells[row][col] = state;
        this.render();
        if (this.onCellToggle) this.onCellToggle(row, col, state);
    }

    /**
     * Actualizează gridul complet din date server.
     * @param {number[][]} gridData - Matricea de stări.
     */
    updateGrid(gridData) {
        this.cells = gridData;
        this.render();
    }

    /**
     * Actualizează culorile stărilor din specificație.
     * @param {string[]} colors - Lista de culori hex.
     */
    setStateColors(colors) {
        this.stateColors = colors;
        this.render();
    }

    /** Randează întregul grid pe canvas. */
    render() {
        const ctx = this.ctx;
        const size = this.cellSize;

        // Clear canvas
        ctx.fillStyle = this.stateColors[0] || '#1a1a2e';
        ctx.fillRect(0, 0, this.gridWidth * size, this.gridHeight * size);

        // Desenează celulele active
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                const state = this.cells[row]?.[col] || 0;
                if (state !== 0) {
                    ctx.fillStyle = this.stateColors[state] || '#00ff88';
                    ctx.fillRect(col * size + 1, row * size + 1, size - 1, size - 1);
                }
            }
        }

        // Desenează grid lines (subțiri)
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

    /** Populează gridul aleatoriu. */
    randomize(density = 0.3) {
        for (let row = 0; row < this.gridHeight; row++) {
            for (let col = 0; col < this.gridWidth; col++) {
                this.cells[row][col] = Math.random() < density ? 1 : 0;
            }
        }
        this.render();
    }

    /** Șterge tot gridul. */
    clear() {
        this.initEmptyGrid();
        this.render();
    }
}
