/**
 * CelLab Rules Panel — Panoul de introducere reguli NLP și afișare specificație.
 */

class RulesPanel {
    constructor() {
        this._bindElements();
        this._bindEvents();
        this.currentSpec = null;
    }

    _bindElements() {
        this.nlpInput = document.getElementById('nlp-input');
        this.btnParse = document.getElementById('btn-parse');
        this.parseFeedback = document.getElementById('parse-feedback');
        this.specDisplay = document.getElementById('spec-display');
        this.btnLoadGol = document.getElementById('btn-load-gol');
    }

    _bindEvents() {
        this.btnParse.addEventListener('click', () => this.parseRules());
        this.btnLoadGol.addEventListener('click', () => this.loadGameOfLife());
    }

    async parseRules() {
        const text = this.nlpInput.value.trim();
        if (!text) {
            this._showFeedback('Introduceți regulile mai întâi.', 'error');
            return;
        }

        try {
            const result = await ApiClient.parseRules(text);
            if (result.success) {
                this.currentSpec = result.spec;
                this._displaySpec(result.spec);
                this._showFeedback('✅ Reguli parsate cu succes!', 'success');
            } else {
                this._showFeedback(`❌ ${result.error}`, 'error');
            }
        } catch (err) {
            this._showFeedback(`❌ Eroare: ${err.message}`, 'error');
        }
    }

    async loadGameOfLife() {
        // Încarcă exemplul Game of Life
        const golSpec = {
            name: "Conway's Game of Life",
            description: "Regulile clasice ale Jocului Vieții",
            states: [
                { name: "dead", color: "#1a1a2e", symbol: "." },
                { name: "alive", color: "#00ff88", symbol: "O" }
            ],
            default_state: "dead",
            neighborhood: "moore",
            transitions: [
                { from_state: "alive", to_state: "dead", neighbor_state: "alive", min_count: 0, max_count: 1, priority: 0 },
                { from_state: "alive", to_state: "alive", neighbor_state: "alive", min_count: 2, max_count: 3, priority: 0 },
                { from_state: "alive", to_state: "dead", neighbor_state: "alive", min_count: 4, max_count: 8, priority: 0 },
                { from_state: "dead", to_state: "alive", neighbor_state: "alive", min_count: 3, max_count: 3, priority: 0 }
            ],
            grid: { width: 50, height: 50, boundary: "wrap" }
        };

        try {
            await ApiClient.loadSpec(golSpec);
            this.currentSpec = golSpec;
            this._displaySpec(golSpec);
            this._showFeedback('✅ Game of Life încărcat!', 'success');
        } catch (err) {
            this._showFeedback(`❌ Eroare: ${err.message}`, 'error');
        }
    }

    _displaySpec(spec) {
        this.specDisplay.innerHTML = `
            <strong>${spec.name}</strong><br>
            <small>${spec.description || ''}</small><br><br>
            <strong>Stări:</strong> ${spec.states.map(s => 
                `<span style="color:${s.color}">${s.name}</span>`
            ).join(', ')}<br>
            <strong>Vecinătate:</strong> ${spec.neighborhood}<br>
            <strong>Reguli:</strong> ${spec.transitions.length}<br>
            <strong>Grid:</strong> ${spec.grid.width}×${spec.grid.height} (${spec.grid.boundary})
        `;
    }

    _showFeedback(message, type) {
        this.parseFeedback.textContent = message;
        this.parseFeedback.className = `feedback ${type}`;
    }
}
