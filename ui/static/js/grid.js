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

        // Genetica culorii active de desenare (RGB)
        this.currentColor = { r: 0, g: 255, b: 136 }; // Verde neon implicit

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

            // Click stânga: desenare / recolorare celulă
            if (e.button === 0) {
                this.isDrawing = true;
                const { x, y } = this.screenToWorld(mouseX, mouseY);
                const existingColor = this.getCell(x, y);

                if (existingColor) {
                    // Dacă celula vie are deja exact aceeași culoare, o ștergem (toggle off)
                    const isSame = (
                        existingColor.r === this.currentColor.r &&
                        existingColor.g === this.currentColor.g &&
                        existingColor.b === this.currentColor.b
                    );
                    if (isSame) {
                        this.drawState = 0;
                        this.setCell(x, y, 0);
                    } else {
                        // Are o culoare diferită: o recolorăm în culoarea genetică selectată!
                        this.drawState = 1;
                        this.setCell(x, y, 1, this.currentColor);
                    }
                } else {
                    // Celulă moartă: o populăm cu noua culoare genetică
                    this.drawState = 1;
                    this.setCell(x, y, 1, this.currentColor);
                }

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
                    if (this.drawState === 1) {
                        const existingColor = this.getCell(x, y);
                        const isSame = existingColor && (
                            existingColor.r === this.currentColor.r &&
                            existingColor.g === this.currentColor.g &&
                            existingColor.b === this.currentColor.b
                        );
                        if (!isSame) {
                            this.setCell(x, y, 1, this.currentColor);
                            this.render();
                            if (this.onCellChange) this.onCellChange(x, y, 1);
                        }
                    } else {
                        if (this.hasCell(x, y)) {
                            this.setCell(x, y, 0);
                            this.render();
                            if (this.onCellChange) this.onCellChange(x, y, 0);
                        }
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
    // Utilitare Genetice de Culoare
    // ==========================================
    parseColor(input) {
        if (!input) return { r: 0, g: 255, b: 136 };
        if (typeof input === 'object' && input.r !== undefined) {
            return {
                r: Math.max(0, Math.min(255, Math.round(Number(input.r) || 0))),
                g: Math.max(0, Math.min(255, Math.round(Number(input.g) || 0))),
                b: Math.max(0, Math.min(255, Math.round(Number(input.b) || 0)))
            };
        }
        if (typeof input === 'string') {
            const s = input.trim();
            if (s.startsWith('#')) {
                if (s.length === 7) {
                    return {
                        r: parseInt(s.slice(1, 3), 16) || 0,
                        g: parseInt(s.slice(3, 5), 16) || 0,
                        b: parseInt(s.slice(5, 7), 16) || 0
                    };
                }
                if (s.length === 4) {
                    return {
                        r: parseInt(s[1] + s[1], 16) || 0,
                        g: parseInt(s[2] + s[2], 16) || 0,
                        b: parseInt(s[3] + s[3], 16) || 0
                    };
                }
            }
            const match = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
            if (match) {
                return {
                    r: Math.max(0, Math.min(255, parseInt(match[1], 10) || 0)),
                    g: Math.max(0, Math.min(255, parseInt(match[2], 10) || 0)),
                    b: Math.max(0, Math.min(255, parseInt(match[3], 10) || 0))
                };
            }
        }
        return { r: 0, g: 255, b: 136 };
    }

    colorToRgb(c) {
        if (!c || typeof c !== 'object') return 'rgb(0, 255, 136)';
        const r = c.r !== undefined ? c.r : 0;
        const g = c.g !== undefined ? c.g : 255;
        const b = c.b !== undefined ? c.b : 136;
        return `rgb(${r}, ${g}, ${b})`;
    }

    rgbToHex(c) {
        if (!c) return '#00ff88';
        const r = c.r !== undefined ? c.r : 0;
        const g = c.g !== undefined ? c.g : 255;
        const b = c.b !== undefined ? c.b : 136;
        const hx = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
        return `#${hx(r)}${hx(g)}${hx(b)}`;
    }

    setCurrentColor(colorInput) {
        this.currentColor = this.parseColor(colorInput);
    }

    recolorAll(colorInput) {
        const rgb = this.parseColor(colorInput);
        for (const [key] of this.cells.entries()) {
            this.cells.set(key, { ...rgb });
        }
        this.render();
    }

    // ==========================================
    // Operații pe Hashmap-ul de Celule
    // ==========================================
    hasCell(x, y) {
        return this.cells.has(`${x},${y}`);
    }

    getCell(x, y) {
        return this.cells.get(`${x},${y}`) || null;
    }

    setCell(x, y, state, color = null) {
        const key = `${x},${y}`;
        if (state === 1 || state === true) {
            const cellColor = color ? this.parseColor(color) : { ...this.currentColor };
            this.cells.set(key, cellColor);
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
     * Populează aleatoriu o zonă centrată cu colonii genetice colorate
     */
    randomize(size = 50, density = 0.3) {
        this.cells.clear();
        const half = Math.floor(size / 2);
        const startX = Math.round(this.cameraX) - half;
        const startY = Math.round(this.cameraY) - half;

        // Paletă genetică pentru colonii multiple
        const palette = [
            { r: 0, g: 255, b: 136 },   // Verde neon
            { r: 0, g: 229, b: 255 },   // Cian electric
            { r: 255, g: 0, b: 127 },   // Roz magenta
            { r: 255, g: 234, b: 0 },   // Galben solar
            { r: 168, g: 85, b: 247 },  // Violet vibrant
            { r: 255, g: 107, b: 0 }    // Portocaliu
        ];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (Math.random() < density) {
                    // Alegem o colonie cromatică bazată pe cadrane
                    const colIdx = (Math.floor(c / (size / 3)) + Math.floor(r / (size / 2)) * 3) % palette.length;
                    const baseCol = palette[colIdx];
                    // Variație genetică inițială ușoară (±3%)
                    const delta = (Math.random() - 0.5) * 15;
                    const cellColor = {
                        r: Math.max(0, Math.min(255, Math.round(baseCol.r + delta))),
                        g: Math.max(0, Math.min(255, Math.round(baseCol.g + delta))),
                        b: Math.max(0, Math.min(255, Math.round(baseCol.b + delta)))
                    };
                    this.cells.set(`${startX + c},${startY + r}`, cellColor);
                }
            }
        }
        this.render();
    }

    /**
     * Încarcă o listă de celule active [[x, y, color?], ...]
     */
    loadActiveCells(coordsList) {
        this.cells.clear();
        for (const item of coordsList) {
            if (Array.isArray(item)) {
                this.setCell(item[0], item[1], 1, item[2] || null);
            } else if (item && typeof item === 'object') {
                this.setCell(item.x, item.y, 1, item.color || null);
            }
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

        // 2. Desenează celulele active cu genetica lor cromatică (doar cele din perimetrul vizibil)
        const pad = cellSize >= 6 ? 1 : 0;
        const drawSize = Math.max(1, cellSize - pad);

        for (const [key, colorObj] of this.cells.entries()) {
            const sep = key.indexOf(',');
            const x = parseInt(key.slice(0, sep), 10);
            const y = parseInt(key.slice(sep + 1), 10);

            if (x >= minWorldX && x <= maxWorldX && y >= minWorldY && y <= maxWorldY) {
                const sx = cx + (x - this.cameraX) * cellSize;
                const sy = cy + (y - this.cameraY) * cellSize;
                ctx.fillStyle = this.colorToRgb(colorObj);
                ctx.fillRect(sx, sy, drawSize, drawSize);
            }
        }
    }
}
