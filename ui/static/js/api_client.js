/**
 * CelLab API Client — Comunicare completă cu backend-ul FastAPI.
 * Rezistent la deconectare, protocol file:// și erori de rețea.
 */

const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
        return '/api';
    }
    return 'http://127.0.0.1:8000/api';
};

const getWsBase = () => {
    if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http') && window.location.host) {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${window.location.host}/ws`;
    }
    return 'ws://127.0.0.1:8000/ws';
};

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

const ApiClient = {
    /**
     * Setează lista de reguli active și tipul de margine.
     */
    async setRules(rules, boundary = 'wrap') {
        try {
            const r = await fetch(`${API_BASE}/rules/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rules, boundary }),
            });
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error(err.detail || 'Eroare la setarea regulilor');
            }
            return await r.json();
        } catch (err) {
            console.warn('API setRules offline/eroare:', err.message);
            return { success: false, rules_count: rules.length, offline: true };
        }
    },

    /**
     * Obține regulile active curente de pe server.
     */
    async getRules() {
        try {
            const r = await fetch(`${API_BASE}/rules`);
            if (!r.ok) return null;
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Obține setul de reguli default.
     */
    async getDefaultRules() {
        try {
            const r = await fetch(`${API_BASE}/rules/default`);
            if (!r.ok) return null;
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Resetează regulile de pe server la setul default.
     */
    async resetDefaultRules() {
        try {
            const r = await fetch(`${API_BASE}/rules/reset_default`, { method: 'POST' });
            if (!r.ok) return null;
            return await r.json();
        } catch (err) {
            return null;
        }
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
            const err = await r.json().catch(() => ({}));
            throw new Error(err.detail || 'Nu s-a putut parsa regula');
        }
        return await r.json();
    },

    /**
     * Obține starea completă curentă (grid, generație, celule active).
     */
    async getState() {
        try {
            const r = await fetch(`${API_BASE}/state`);
            if (!r.ok) return null;
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Schimbă starea unei celule pe server.
     */
    async toggleCell(row, col) {
        try {
            const r = await fetch(`${API_BASE}/grid/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ row, col }),
            });
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Setează întregul grid pe server.
     */
    async setGrid(grid) {
        try {
            const r = await fetch(`${API_BASE}/grid/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grid }),
            });
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Curăță gridul (toate celulele 0).
     */
    async clearGrid() {
        try {
            const r = await fetch(`${API_BASE}/grid/clear`, { method: 'POST' });
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Populează aleatoriu gridul.
     */
    async randomGrid(density = 0.3) {
        try {
            const r = await fetch(`${API_BASE}/grid/random`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ density }),
            });
            return await r.json();
        } catch (err) {
            return null;
        }
    },

    /**
     * Execută un singur pas de simulare pe server.
     */
    async simulateStep() {
        const r = await fetch(`${API_BASE}/simulate/step`, { method: 'POST' });
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.detail || 'Eroare la simulare pe server');
        }
        return await r.json();
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
            const err = await r.json().catch(() => ({}));
            throw new Error(err.detail || 'Eroare la simulare pe server');
        }
        return await r.json();
    },

    /**
     * Resetează contorul de generații.
     */
    async resetSimulation() {
        try {
            const r = await fetch(`${API_BASE}/simulate/reset`, { method: 'POST' });
            return await r.json();
        } catch (err) {
            return null;
        }
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
        if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(err.detail || 'Eroare la analiză');
        }
        return await r.json();
    },

    /**
     * Deschide conexiunea WebSocket pentru streaming în timp real.
     */
    createSimulationSocket() {
        try {
            const wsUrl = `${WS_BASE}/simulation`;
            return new WebSocket(wsUrl);
        } catch (e) {
            console.warn('Nu s-a putut crea WebSocket URL:', e.message);
            return null;
        }
    },
};
