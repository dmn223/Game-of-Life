/**
 * CelLab API Client — Comunicare completă cu backend-ul FastAPI.
 */

const API_BASE = '/api';
const WS_BASE = `ws://${window.location.host}/ws`;

const ApiClient = {
    /**
     * Setează lista de reguli active și tipul de margine.
     */
    async setRules(rules, boundary = 'wrap') {
        const r = await fetch(`${API_BASE}/rules/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rules, boundary }),
        });
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.detail || 'Eroare la setarea regulilor');
        }
        return r.json();
    },

    /**
     * Obține regulile active curente de pe server.
     */
    async getRules() {
        const r = await fetch(`${API_BASE}/rules`);
        return r.json();
    },

    /**
     * Trimite un text în limbaj natural / sintaxă [x, y] pentru a fi parsat pe backend.
     */
    async parseCustomRule(text) {
        const r = await fetch(`${API_BASE}/rules/parse_custom`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.detail || 'Nu s-a putut parsa regula');
        }
        return r.json();
    },

    /**
     * Obține starea completă curentă (grid, generație, celule active).
     */
    async getState() {
        const r = await fetch(`${API_BASE}/state`);
        return r.json();
    },

    /**
     * Schimbă starea unei celule pe server.
     */
    async toggleCell(row, col) {
        const r = await fetch(`${API_BASE}/grid/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ row, col }),
        });
        return r.json();
    },

    /**
     * Setează întregul grid pe server.
     */
    async setGrid(grid) {
        const r = await fetch(`${API_BASE}/grid/set`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grid }),
        });
        return r.json();
    },

    /**
     * Curăță gridul (toate celulele 0).
     */
    async clearGrid() {
        const r = await fetch(`${API_BASE}/grid/clear`, { method: 'POST' });
        return r.json();
    },

    /**
     * Populează aleatoriu gridul.
     */
    async randomGrid(density = 0.3) {
        const r = await fetch(`${API_BASE}/grid/random`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ density }),
        });
        return r.json();
    },

    /**
     * Execută un singur pas de simulare pe server.
     */
    async simulateStep() {
        const r = await fetch(`${API_BASE}/simulate/step`, { method: 'POST' });
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.detail || 'Eroare la simulare');
        }
        return r.json();
    },

    /**
     * Rulează N generații.
     */
    async simulateRun(steps = 1) {
        const r = await fetch(`${API_BASE}/simulate/run`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steps }),
        });
        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.detail || 'Eroare la simulare');
        }
        return r.json();
    },

    /**
     * Resetează contorul de generații.
     */
    async resetSimulation() {
        const r = await fetch(`${API_BASE}/simulate/reset`, { method: 'POST' });
        return r.json();
    },

    /**
     * Execută o cerere de analiză.
     */
    async analyze(questionType, params = {}) {
        const r = await fetch(`${API_BASE}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question_type: questionType, params }),
        });
        return r.json();
    },

    /**
     * Deschide conexiunea WebSocket pentru streaming în timp real.
     */
    createSimulationSocket() {
        return new WebSocket(`${WS_BASE}/simulation`);
    },
};
