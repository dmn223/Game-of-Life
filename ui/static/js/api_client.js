/**
 * CelLab API Client — Comunicare cu backend-ul FastAPI.
 *
 * Furnizează funcții pentru toate endpoint-urile REST și WebSocket.
 */

const API_BASE = '/api';
const WS_BASE = `ws://${window.location.host}/ws`;

const ApiClient = {
    /**
     * Parsează reguli în limbaj natural.
     * @param {string} text - Textul cu regulile.
     * @returns {Promise<Object>} Răspunsul cu specificația parsată.
     */
    async parseRules(text) {
        const response = await fetch(`${API_BASE}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        return response.json();
    },

    /**
     * Încarcă o specificație JSON direct.
     * @param {Object} spec - Specificația automatului.
     * @returns {Promise<Object>} Răspunsul serverului.
     */
    async loadSpec(spec) {
        const response = await fetch(`${API_BASE}/spec/load`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(spec),
        });
        return response.json();
    },

    /**
     * Obține specificația curentă.
     * @returns {Promise<Object>} Specificația curentă.
     */
    async getSpec() {
        const response = await fetch(`${API_BASE}/spec`);
        return response.json();
    },

    /**
     * Calculează un pas de simulare.
     * @returns {Promise<Object>} Starea nouă a gridului.
     */
    async simulateStep() {
        const response = await fetch(`${API_BASE}/simulate/step`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Rulează mai multe pași de simulare.
     * @param {number} steps - Numărul de pași.
     * @returns {Promise<Object>} Starea finală.
     */
    async simulateRun(steps) {
        const response = await fetch(`${API_BASE}/simulate/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps }),
        });
        return response.json();
    },

    /**
     * Resetează simularea.
     * @returns {Promise<Object>}
     */
    async resetSimulation() {
        const response = await fetch(`${API_BASE}/simulate/reset`, {
            method: 'POST',
        });
        return response.json();
    },

    /**
     * Actualizează celule pe grid.
     * @param {Array} cells - Lista de celule [{row, col, state}].
     * @returns {Promise<Object>}
     */
    async updateGrid(cells) {
        const response = await fetch(`${API_BASE}/grid/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cells }),
        });
        return response.json();
    },

    /**
     * Execută o analiză.
     * @param {string} questionType - Tipul întrebării.
     * @param {Object} params - Parametrii analizei.
     * @returns {Promise<Object>} Rezultatul analizei.
     */
    async analyze(questionType, params = {}) {
        const response = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_type: questionType, params }),
        });
        return response.json();
    },

    /**
     * Obține lista de exemple disponibile.
     * @returns {Promise<Object>}
     */
    async getExamples() {
        const response = await fetch(`${API_BASE}/examples`);
        return response.json();
    },

    /**
     * Creează o conexiune WebSocket pentru simulare.
     * @returns {WebSocket}
     */
    createSimulationSocket() {
        return new WebSocket(`${WS_BASE}/simulation`);
    },
};
