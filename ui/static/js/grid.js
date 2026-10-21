/**
 * CelLab Infinite Grid — Spațiu Celular Infinit (sau Virtual Infinit) pe HTML5 Canvas.
 *
 * Caracteristici cheie:
 * - Stocare sparse bazată pe Hashmap (Map<"x,y", state>), consum de memorie O(celule vii).
 * - Zoom nelimitat (de la 5% la 5000%) centrat pe cursorul mouse-ului.
 * - Navigare Pan fluidă (click dreapta sau modul pan / roată mouse).
 * - Randare virtualizată de înaltă performanță (se desenează doar celulele vizibile).
 * - Funcții de auto-centrare (Fit All, Reset View).
 */

class InfiniteGridRenderer {
    /**
     * @param {HTMLCanvasElement} canvas - Elementul Canvas.
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Spațiu infinit: HashMap de coordonate "x,y" -> stare (1)
        this.cells = new Map();

        // Parametrii camerei / viewport
        this.cameraX = 0; // coordonata x a centrului în spațiul lumii
        this.cameraY = 0; // coordonata y a centrului în spațiul lumii
        this.zoom = 1.0;  // factor de scalare (1.0 = normal)
        this.baseCellSize = 18; // pixeli per celulă la zoom 1.0
        this.minZoom = 0.05;
        this.maxZoom = 40.0;

        // Culori
        this.bgColor = '#0e101f';
        this.gridLineColor = 'rgba(255, 255, 255, 0.04)';
        this.aliveColor = '#00ff88';
        this.aliveBorderColor = '#00cc6a';

        // Stare interacțiune
        this.isPanning = false;
        this.isDrawing = false;
        this.drawState = 1;
        this.panStartX = 0;
        this.panStartY = 0;
        this.dpr = window.devicePixelRatio || 1;

        // Tool activ: 'draw' sau 'pan'
        this.currentTool = 'draw';

        // Callbacks
        this.onCellChange = null;
        this.onViewportChange = null;

        this._setupCanvas();
        this._setupEventListeners();
        this.render();
    }

    _setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 800, height: 600 };
            const width = Math.max(300, rect.width - 20);
            const height = Math.max(300, rect.height - 70);

            this.canvas.width = width * this.dpr;
            this.canvas.height = height * this.dpr;
            this.canvas.style.width = `${width}px`;
            this.canvas.style.height = `${height}px`;

            this.render();
        };

        window.addEventListener('resize', resize);
        setTimeout(resize, 50);
    }

    _setupEventListeners() {
        // Zoom cu rotița mouse-ului centrat pe cursor
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
            this.zoomAt(mouseX, mouseY, zoomFactor);
        }, { passive: false });

        // Mouse Down
        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Pan pe click dreapta (button 2) sau click mijloc (button 1) sau când tool-ul e 'pan'
            if (e.button === 2 || e.button === 1 || this.currentTool === 'pan' || e.shiftKey) {
                this.isPanning = true;
                this.panStartX = mouseX;
                this.panStartY = mouseY;
                this.canvas.style.cursor = 'grabbing';
                return;
            }

            // Click stânga: desenare celulă
            if (e.button === 0) {
                this.isDrawing = true;
                const { x, y } = this.screenToWorld(mouseX, mouseY);
                // Dacă e deja vie, o transformăm în 0; altfel în 1
                this.drawState = this.getCell(x, y) === 1 ? 0 : 1;
                this.setCell(x, y, this.drawState);
                this.render();
                if (this.onCellChange) this.onCellChange(x, y, this.drawState);
            }
        });

        // Mouse Move
        window.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            if (this.isPanning) {
                const dx = mouseX - this.panStartX;
                const dy = mouseY - this.panStartY;
                const cellSize = this.baseCellSize * this.zoom;

                this.cameraX -= dx / cellSize;
                this.cameraY -= dy / cellSize;

                this.panStartX = mouseX;
                this.panStartY = mouseY;
                this.render();
                if (this.onViewportChange) this.onViewportChange(this.cameraX, this.cameraY, this.zoom);
                return;
            }

            if (this.isDrawing) {
                if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                    const { x, y } = this.screenToWorld(mouseX, mouseY);
                    if (this.getCell(x, y) !== this.drawState) {
                        this.setCell(x, y, this.drawState);
                        this.render();
                        if (this.onCellChange) this.onCellChange(x, y, this.drawState);
                    }
                }
            }
        });

        // Mouse Up
        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                this.canvas.style.cursor = this.currentTool === 'pan' ? 'grab' : 'crosshair';
            }
            this.isDrawing = false;
        });

        // Prevenim meniul contextual nativ pe click dreapta pe canvas
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Zoom centrat pe o coordonată ecran specifică
     */
    zoomAt(screenX, screenY, factor) {
        const oldZoom = this.zoom;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, oldZoom * factor));
        if (newZoom === oldZoom) return;

        const { x: worldX, y: worldY } = this.screenToWorld(screenX, screenY);

        this.zoom = newZoom;

        const rect = this.canvas.getBoundingClientRect();
        const displayW = rect.width;
        const displayH = rect.height;
        const cellSize = this.baseCellSize * this.zoom;

        this.cameraX = worldX - (screenX - displayW / 2) / cellSize;
        this.cameraY = worldY - (screenY - displayH / 2) / cellSize;

        this.render();
        if (this.onViewportChange) this.onViewportChange(this.cameraX, this.cameraY, this.zoom);
    }

    zoomIn() {
        const rect = this.canvas.getBoundingClientRect();
        this.zoomAt(rect.width / 2, rect.height / 2, 1.3);
    }

    zoomOut() {
        const rect = this.canvas.getBoundingClientRect();
        this.zoomAt(rect.width / 2, rect.height / 2, 0.77);
    }

    resetView() {
        this.cameraX = 0;
        this.cameraY = 0;
        this.zoom = 1.0;
        this.render();
        if (this.onViewportChange) this.onViewportChange(this.cameraX, this.cameraY, this.zoom);
    }

    /**
     * Convertește Coordonate Ecran -> Coordonate Spațiu Infinit (World)
     */
    screenToWorld(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const cellSize = this.baseCellSize * this.zoom;

        const wx = Math.floor(this.cameraX + (screenX - cx) / cellSize);
        const wy = Math.floor(this.cameraY + (screenY - cy) / cellSize);
        return { x: wx, y: wy };
    }

    /**
     * Convertește Coordonate Spațiu Infinit (World) -> Coordonate Ecran
     */
    worldToScreen(worldX, worldY) {
        const rect = this.canvas.getBoundingClientRect();
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const cellSize = this.baseCellSize * this.zoom;

        const sx = cx + (worldX - this.cameraX) * cellSize;
        const sy = cy + (worldY - this.cameraY) * cellSize;
        return { x: sx, y: sy };
    }

    // ==========================================
    // Operații pe Hashmap-ul de Celule
    // ==========================================
    getCell(x, y) {
        return this.cells.get(`${x},${y}`) || 0;
    }

    setCell(x, y, state) {
        const key = `${x},${y}`;
        if (state === 1 || state === true) {
            this.cells.set(key, 1);
        } else {
            this.cells.delete(key);
        }
    }

    clear() {
        this.cells.clear();
        this.render();
    }

    getActiveCellCount() {
        return this.cells.size;
    }

    /**
     * Bounding box al tuturor celulelor vii
     */
    getBoundingBox() {
        if (this.cells.size === 0) return null;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        for (const key of this.cells.keys()) {
            const sep = key.indexOf(',');
            const x = parseInt(key.slice(0, sep), 10);
            const y = parseInt(key.slice(sep + 1), 10);
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }

        return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
    }

    /**
     * Încadrează toate celulele active în viewport
     */
    fitAll() {
        const bbox = this.getBoundingBox();
        if (!bbox) {
            this.resetView();
            return;
        }

        this.cameraX = (bbox.minX + bbox.maxX) / 2;
        this.cameraY = (bbox.minY + bbox.maxY) / 2;

        const rect = this.canvas.getBoundingClientRect();
        const margin = 80;
        const availW = Math.max(100, rect.width - margin);
        const availH = Math.max(100, rect.height - margin);

        const neededZoomX = availW / (Math.max(5, bbox.width) * this.baseCellSize);
        const neededZoomY = availH / (Math.max(5, bbox.height) * this.baseCellSize);
        this.zoom = Math.max(this.minZoom, Math.min(2.5, Math.min(neededZoomX, neededZoomY)));

        this.render();
        if (this.onViewportChange) this.onViewportChange(this.cameraX, this.cameraY, this.zoom);
    }

    /**
     * Populează aleatoriu o zonă centrată
     */
    randomize(size = 50, density = 0.3) {
        this.cells.clear();
        const half = Math.floor(size / 2);
        const startX = Math.round(this.cameraX) - half;
        const startY = Math.round(this.cameraY) - half;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (Math.random() < density) {
                    this.setCell(startX + c, startY + r, 1);
                }
            }
        }
        this.render();
    }

    /**
     * Încarcă o listă de celule active [[x, y], ...]
     */
    loadActiveCells(coordsList) {
        this.cells.clear();
        for (const [x, y] of coordsList) {
            this.setCell(x, y, 1);
        }
        this.fitAll();
    }

    /**
     * Randează întregul canvas pe baza viewport-ului curent (virtualizat)
     */
    render() {
        const ctx = this.ctx;
        const rect = this.canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;

        // Resetare scalare DPI
        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

        // Fundal întunecat
        ctx.fillStyle = this.bgColor;
        ctx.fillRect(0, 0, w, h);

        const cellSize = this.baseCellSize * this.zoom;
        const cx = w / 2;
        const cy = h / 2;

        // Calculăm limitele vizibile în spațiul lumii (World coordinates)
        const minWorldX = Math.floor(this.cameraX - cx / cellSize) - 1;
        const maxWorldX = Math.ceil(this.cameraX + cx / cellSize) + 1;
        const minWorldY = Math.floor(this.cameraY - cy / cellSize) - 1;
        const maxWorldY = Math.ceil(this.cameraY + cy / cellSize) + 1;

        // 1. Desenează linii de grid (doar dacă zoom-ul permite vizualizarea lor)
        if (cellSize >= 6) {
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = this.gridLineColor;

            // Linii verticale
            ctx.beginPath();
            for (let x = minWorldX; x <= maxWorldX; x++) {
                const sx = cx + (x - this.cameraX) * cellSize;
                ctx.moveTo(sx, 0);
                ctx.lineTo(sx, h);
            }
            // Linii orizontale
            for (let y = minWorldY; y <= maxWorldY; y++) {
                const sy = cy + (y - this.cameraY) * cellSize;
                ctx.moveTo(0, sy);
                ctx.lineTo(w, sy);
            }
            ctx.stroke();

            // Axe principale (0, 0) dacă sunt vizibile
            if (minWorldX <= 0 && maxWorldX >= 0) {
                const sx0 = cx + (0 - this.cameraX) * cellSize;
                ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(sx0, 0);
                ctx.lineTo(sx0, h);
                ctx.stroke();
            }
            if (minWorldY <= 0 && maxWorldY >= 0) {
                const sy0 = cy + (0 - this.cameraY) * cellSize;
                ctx.strokeStyle = 'rgba(139, 92, 246, 0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, sy0);
                ctx.lineTo(w, sy0);
                ctx.stroke();
            }
        }

        // 2. Desenează celulele active (doar cele din perimetrul vizibil)
        ctx.fillStyle = this.aliveColor;
        const pad = cellSize >= 6 ? 1 : 0;
        const drawSize = Math.max(1, cellSize - pad);

        for (const key of this.cells.keys()) {
            const sep = key.indexOf(',');
            const x = parseInt(key.slice(0, sep), 10);
            const y = parseInt(key.slice(sep + 1), 10);

            if (x >= minWorldX && x <= maxWorldX && y >= minWorldY && y <= maxWorldY) {
                const sx = cx + (x - this.cameraX) * cellSize;
                const sy = cy + (y - this.cameraY) * cellSize;
                ctx.fillRect(sx, sy, drawSize, drawSize);
            }
        }
    }
}
