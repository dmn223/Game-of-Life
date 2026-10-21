/**
 * CelLab Rules Panel — Editor intuitiv de reguli pentru automate celulare 2D.
 *
 * Suportă:
 * - Reguli relative [x, y] și vecini [[x+dx, y+dy], ...]
 * - Modificarea unei liste de câmpuri țintă (0 -> 1, 1 -> 0, invers, menține)
 * - Aplicarea simultană a tuturor regulilor care se potrivesc
 * - Mod Text cu parsare inteligentă + Constructor Vizual cu grilă interactivă
 * - Presetări rapide (Game of Life, Seeds, Inversor [x,y])
 */

class RulesPanel {
    constructor() {
        this.rules = [];
        // Grilă relativă 5x5: [2][2] este centrul [x, y]
        // 0 = indiferent (*), 1 = trebuie să fie 1 (verde), -1 = trebuie să fie 0 (roșu)
        this.patternGrid = Array.from({ length: 5 }, () => Array(5).fill(0));

        this._bindElements();
        this._bindEvents();
        this._renderPatternGrid();
        this._renderRulesList();

        // Încărcăm regulile inițiale de pe server sau presetul Game of Life implicit
        this._loadInitialRules();
    }

    _bindElements() {
        // Tab-uri
        this.tabBtnText = document.getElementById('tab-btn-text');
        this.tabBtnVisual = document.getElementById('tab-btn-visual');
        this.tabContentText = document.getElementById('tab-content-text');
        this.tabContentVisual = document.getElementById('tab-content-visual');

        // Mod Text
        this.customRuleText = document.getElementById('custom-rule-text');
        this.btnParseAddRule = document.getElementById('btn-parse-add-rule');

        // Mod Vizual
        this.visualCurrentState = document.getElementById('visual-current-state');
        this.patternGridContainer = document.getElementById('pattern-grid-container');
        this.visualTargetField = document.getElementById('visual-target-field');
        this.visualAction = document.getElementById('visual-action');
        this.btnAddVisualRule = document.getElementById('btn-add-visual-rule');

        // Listă reguli & acțiuni
        this.activeRulesList = document.getElementById('active-rules-list');
        this.rulesCountBadge = document.getElementById('rules-count-badge');
        this.btnClearRules = document.getElementById('btn-clear-rules');
        this.btnApplyRules = document.getElementById('btn-apply-rules');
        this.ruleFeedback = document.getElementById('rule-feedback');
        this.ruleBoundary = document.getElementById('rule-boundary');

        // Presetări
        this.btnPresetGol = document.getElementById('btn-preset-gol');
        this.btnPresetSeeds = document.getElementById('btn-preset-seeds');
        this.btnPresetInverter = document.getElementById('btn-preset-inverter');
    }

    _bindEvents() {
        // Schimbare tab-uri
        this.tabBtnText.addEventListener('click', () => this._switchTab('text'));
        this.tabBtnVisual.addEventListener('click', () => this._switchTab('visual'));

        // Adăugare regulă din text
        this.btnParseAddRule.addEventListener('click', () => this._addRuleFromText());

        // Adăugare regulă vizuală
        this.btnAddVisualRule.addEventListener('click', () => this._addVisualRule());

        // Ștergere toate regulile
        this.btnClearRules.addEventListener('click', () => {
            this.rules = [];
            this._renderRulesList();
            this._applyRulesToServer();
            this._showFeedback('Toate regulile au fost șterse.', 'success');
        });

        // Aplicare manuală
        this.btnApplyRules.addEventListener('click', () => this._applyRulesToServer(true));

        // Schimbare margine
        this.ruleBoundary.addEventListener('change', () => this._applyRulesToServer());

        // Presetări
        this.btnPresetGol.addEventListener('click', () => this._loadPresetGoL());
        this.btnPresetSeeds.addEventListener('click', () => this._loadPresetSeeds());
        this.btnPresetInverter.addEventListener('click', () => this._loadPresetInverter());
    }

    _switchTab(tab) {
        if (tab === 'text') {
            this.tabBtnText.classList.add('active');
            this.tabBtnVisual.classList.remove('active');
            this.tabContentText.classList.add('active');
            this.tabContentVisual.classList.remove('active');
        } else {
            this.tabBtnVisual.classList.add('active');
            this.tabBtnText.classList.remove('active');
            this.tabContentVisual.classList.add('active');
            this.tabContentText.classList.remove('active');
        }
    }

    /**
     * Grilă 5x5 interactivă pentru selectarea vecinilor relativi:
     * Click trece prin: 0 (oricare) -> 1 (trebuie 1) -> -1 (trebuie 0) -> 0
     */
    _renderPatternGrid() {
        this.patternGridContainer.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'pattern-grid';

        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                const cell = document.createElement('div');
                cell.className = 'pattern-cell';
                const dy = r - 2;
                const dx = c - 2;

                if (dy === 0 && dx === 0) {
                    // Celula curentă [x, y]
                    cell.classList.add('pattern-center');
                    cell.innerHTML = '<strong>[x,y]</strong>';
                    cell.title = 'Celula curentă [x, y]';
                } else {
                    const labelY = dy > 0 ? `+${dy}` : (dy < 0 ? `${dy}` : '');
                    const labelX = dx > 0 ? `+${dx}` : (dx < 0 ? `${dx}` : '');
                    const coordLabel = `[${labelX || 'x'}, ${labelY || 'y'}]`;
                    cell.dataset.r = r;
                    cell.dataset.c = c;
                    cell.title = `Vecin relativ ${coordLabel} — click pentru a schimba condiția`;

                    this._updatePatternCellVisual(cell, this.patternGrid[r][c], coordLabel);

                    cell.addEventListener('click', () => {
                        // Ciclu: 0 -> 1 -> -1 -> 0
                        if (this.patternGrid[r][c] === 0) {
                            this.patternGrid[r][c] = 1;
                        } else if (this.patternGrid[r][c] === 1) {
                            this.patternGrid[r][c] = -1;
                        } else {
                            this.patternGrid[r][c] = 0;
                        }
                        this._updatePatternCellVisual(cell, this.patternGrid[r][c], coordLabel);
                    });
                }

                grid.appendChild(cell);
            }
        }
        this.patternGridContainer.appendChild(grid);
    }

    _updatePatternCellVisual(cell, val, label) {
        cell.classList.remove('state-any', 'state-one', 'state-zero');
        if (val === 1) {
            cell.classList.add('state-one');
            cell.innerHTML = `<span>${label}</span><small>=1</small>`;
        } else if (val === -1) {
            cell.classList.add('state-zero');
            cell.innerHTML = `<span>${label}</span><small>=0</small>`;
        } else {
            cell.classList.add('state-any');
            cell.innerHTML = `<span>${label}</span><small>*</small>`;
        }
    }

    /**
     * Adăugare regulă din formularul vizual
     */
    _addVisualRule() {
        const currState = parseInt(this.visualCurrentState.value, 10);
        const [targetDx, targetDy] = this.visualTargetField.value.split(',').map(n => parseInt(n, 10));
        const action = this.visualAction.value;

        // Extragem condițiile de vecini selectate pe grila 5x5
        const patternConds = [];
        for (let r = 0; r < 5; r++) {
            for (let c = 0; c < 5; c++) {
                if (r === 2 && c === 2) continue;
                const val = this.patternGrid[r][c];
                if (val !== 0) {
                    patternConds.push({
                        dx: c - 2,
                        dy: r - 2,
                        state: val === 1 ? 1 : 0,
                    });
                }
            }
        }

        if (patternConds.length === 0 && currState === -1) {
            this._showFeedback('Selectați cel puțin un vecin pe grilă sau specificați starea celulei curente!', 'error');
            return;
        }

        const actionText = {
            'set_1': 'devine 1 (din 0 în 1)',
            'set_0': 'devine 0 (din 1 în 0)',
            'invert': 'se inversează (0 ↔ 1)',
            'keep': 'se menține',
        }[action] || action;

        const targetDesc = (targetDx === 0 && targetDy === 0) ? '[x, y]' : `[x${targetDx >= 0 ? '+' + targetDx : targetDx}, y${targetDy >= 0 ? '+' + targetDy : targetDy}]`;

        const newRule = {
            name: `Regulă vizuală #${this.rules.length + 1}`,
            description: `Dacă [x,y]=${currState === -1 ? '*' : currState} și vecinii ceruți sunt prezenți, atunci ${targetDesc} ${actionText}`,
            current_state: currState,
            pattern_conditions: patternConds,
            effects: [{
                dx: targetDx,
                dy: targetDy,
                action: action,
            }],
        };

        this.rules.push(newRule);
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback(`✅ Regula a fost adăugată cu succes! (${this.rules.length} reguli active)`, 'success');

        // Resetăm parțial grila vizuală
        this.patternGrid = Array.from({ length: 5 }, () => Array(5).fill(0));
        this._renderPatternGrid();
    }

    /**
     * Adăugare regulă prin parsarea textului în limbaj natural
     */
    async _addRuleFromText() {
        const rawText = this.customRuleText.value.trim();
        if (!rawText) {
            this._showFeedback('Introduceți textul regulii mai întâi.', 'error');
            return;
        }

        try {
            // Trimitem la server pentru parsare robustă
            const res = await ApiClient.parseCustomRule(rawText);
            if (res && res.success && res.rule) {
                const parsed = res.rule;
                parsed.name = `Regulă Text #${this.rules.length + 1}`;
                parsed.description = rawText;
                this.rules.push(parsed);
                this._renderRulesList();
                await this._applyRulesToServer();
                this._showFeedback('✅ Regula din text a fost parsatǎ și adăugată cu succes!', 'success');
                this.customRuleText.value = '';
            } else {
                throw new Error('Răspuns invalid de la parser');
            }
        } catch (err) {
            // Fallback: parsare locală pe client dacă serverul e offline
            const localRule = this._parseTextLocally(rawText);
            if (localRule) {
                this.rules.push(localRule);
                this._renderRulesList();
                this._applyRulesToServer();
                this._showFeedback('✅ Regula a fost parsatǎ local și adăugată!', 'success');
                this.customRuleText.value = '';
            } else {
                this._showFeedback(`❌ Nu s-a putut parsa regula: ${err.message}. Verificați că ați inclus coordonate de forma [x+1, y].`, 'error');
            }
        }
    }

    /**
     * Parser local de rezervă pe client pentru sintaxa cerută:
     * <pentru campul curent [x,y], daca am vecinii [[x+1,y],....] sa aiba loc urmatoarele stari: campurile [lista] se transforma...>
     */
    _parseTextLocally(text) {
        const coordRegex = /\[\s*(?:x\s*([+-]\s*\d+)?)?\s*,\s*(?:y\s*([+-]\s*\d+)?)?\s*\](?:\s*=\s*([01]))?/gi;
        const parts = text.split(/atunci|sa\s+aiba\s+loc|urmatoarele\s+stari|then|=>/i);
        const condPart = parts[0] || '';
        const effPart = parts[1] || '';

        const patternConds = [];
        let match;
        while ((match = coordRegex.exec(condPart)) !== null) {
            const dx = match[1] ? parseInt(match[1].replace(/\s+/g, ''), 10) : 0;
            const dy = match[2] ? parseInt(match[2].replace(/\s+/g, ''), 10) : 0;
            const state = match[3] !== undefined ? parseInt(match[3], 10) : 1;
            if (dx === 0 && dy === 0) continue; // sărim centrul
            patternConds.push({ dx, dy, state });
        }

        if (patternConds.length === 0) return null;

        let action = 'set_1';
        const effLower = effPart.toLowerCase();
        if (effLower.includes('din 1 in 0') || effLower.includes('devine 0') || effLower.includes('->0')) {
            action = 'set_0';
        } else if (effLower.includes('invers') || effLower.includes('invert') || effLower.includes('toggle')) {
            action = 'invert';
        } else if (effLower.includes('mentin') || effLower.includes('keep')) {
            action = 'keep';
        }

        const effects = [];
        const effRegex = /\[\s*(?:x\s*([+-]\s*\d+)?)?\s*,\s*(?:y\s*([+-]\s*\d+)?)?\s*\]/gi;
        while ((match = effRegex.exec(effPart)) !== null) {
            const dx = match[1] ? parseInt(match[1].replace(/\s+/g, ''), 10) : 0;
            const dy = match[2] ? parseInt(match[2].replace(/\s+/g, ''), 10) : 0;
            effects.push({ dx, dy, action });
        }

        if (effects.length === 0) {
            effects.push({ dx: 0, dy: 0, action });
        }

        return {
            name: `Regulă Text #${this.rules.length + 1}`,
            description: text,
            current_state: -1,
            pattern_conditions: patternConds,
            effects: effects,
        };
    }

    /**
     * Randează lista de reguli active cu buton de ștergere individuală
     */
    _renderRulesList() {
        if (!this.activeRulesList) return;

        if (this.rulesCountBadge) {
            this.rulesCountBadge.textContent = this.rules.length;
        }

        if (this.rules.length === 0) {
            this.activeRulesList.innerHTML = '<p class="placeholder">Nicio regulă definită. Adăugați una mai sus sau alegeți o presetare.</p>';
            return;
        }

        let html = '';
        this.rules.forEach((rule, idx) => {
            let details = '';

            if (rule.pattern_conditions && rule.pattern_conditions.length > 0) {
                const condsStr = rule.pattern_conditions.map(c => {
                    const sx = c.dx >= 0 ? `+${c.dx}` : c.dx;
                    const sy = c.dy >= 0 ? `+${c.dy}` : c.dy;
                    return `[x${sx}, y${sy}]=${c.state}`;
                }).join(', ');
                details += `<div><strong>Vecini:</strong> ${condsStr}</div>`;
            }

            if (rule.count_conditions && rule.count_conditions.length > 0) {
                const cc = rule.count_conditions[0];
                details += `<div><strong>Număr vecini:</strong> între ${cc.min_count} și ${cc.max_count} (stare=${cc.state})</div>`;
            }

            if (rule.effects && rule.effects.length > 0) {
                const effStr = rule.effects.map(e => {
                    const sx = e.dx >= 0 ? `+${e.dx}` : e.dx;
                    const sy = e.dy >= 0 ? `+${e.dy}` : e.dy;
                    const actName = {
                        'set_1': 'devine 1',
                        'set_0': 'devine 0',
                        'invert': 'invers (0↔1)',
                        'keep': 'se menține',
                    }[e.action] || e.action;
                    return `[x${sx}, y${sy}] → ${actName}`;
                }).join(', ');
                details += `<div><strong>Efecte:</strong> ${effStr}</div>`;
            } else if (rule.result_state !== undefined) {
                details += `<div><strong>Rezultat:</strong> [x, y] → devine ${rule.result_state}</div>`;
            }

            html += `
                <div class="rule-card">
                    <div class="rule-card-header">
                        <span class="rule-title">${rule.name || `Regula ${idx + 1}`}</span>
                        <button class="btn-delete-rule" data-idx="${idx}" title="Șterge regula">✕</button>
                    </div>
                    <div class="rule-card-body">
                        ${details}
                    </div>
                </div>
            `;
        });

        this.activeRulesList.innerHTML = html;

        // Atașăm evenimentele de ștergere
        this.activeRulesList.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.dataset.idx, 10);
                this.rules.splice(i, 1);
                this._renderRulesList();
                this._applyRulesToServer();
            });
        });
    }

    /**
     * Sincronizează regulile active cu backend-ul
     */
    async _applyRulesToServer(showFeedback = false) {
        const boundary = this.ruleBoundary ? this.ruleBoundary.value : 'wrap';
        try {
            const res = await ApiClient.setRules(this.rules, boundary);
            if (showFeedback) {
                this._showFeedback(`🚀 ${res.rules_count} reguli au fost aplicate pe simulator! Puteți rula (▶ Play / ⏭ Step).`, 'success');
            }
        } catch (err) {
            this._showFeedback(`Eroare la trimiterea regulilor: ${err.message}`, 'error');
        }
    }

    /**
     * Încărcare inițială
     */
    async _loadInitialRules() {
        try {
            const state = await ApiClient.getRules();
            if (state && state.rules && state.rules.length > 0) {
                this.rules = state.rules;
                this._renderRulesList();
                return;
            }
        } catch (e) {}

        // Preset implicit: Conway's Game of Life
        this._loadPresetGoL(false);
    }

    // ==========================================
    // Presetări
    // ==========================================
    _loadPresetGoL(feedback = true) {
        this.rules = [
            {
                name: 'GoL: Supraviețuire (2-3 vecini)',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 2, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                result_state: 1,
            },
            {
                name: 'GoL: Naștere (exact 3 vecini)',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 3, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                result_state: 1,
            },
            {
                name: 'GoL: Subpopulare (0-1 vecini)',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 1, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                result_state: 0,
            },
            {
                name: 'GoL: Suprapopulare (4-8 vecini)',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 4, max_count: 8, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                result_state: 0,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        if (feedback) {
            this._showFeedback('🧬 S-a încărcat presetarea: Conway\'s Game of Life!', 'success');
        }
    }

    _loadPresetSeeds() {
        this.rules = [
            {
                name: 'Seeds: Naștere (exact 2 vecini)',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 2, max_count: 2, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                result_state: 1,
            },
            {
                name: 'Seeds: Moarte imediată',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 8, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                result_state: 0,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback('🌱 S-a încărcat presetarea: Seeds (B2/S)!', 'success');
    }

    _loadPresetInverter() {
        // Exemplu de regulă direct raportată la vecinii [x+1, y] și [x-1, y] care afectează multiple câmpuri simultan
        this.rules = [
            {
                name: 'Inversor Orizontal [x, y]',
                description: 'Dacă vecinii [x+1,y]=1 și [x-1,y]=1, inversează [x,y] și stinge vecinii',
                current_state: -1,
                pattern_conditions: [
                    { dx: 1, dy: 0, state: 1 },
                    { dx: -1, dy: 0, state: 1 },
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },     // [x, y] se inversează
                    { dx: 1, dy: 0, action: 'set_0' },      // [x+1, y] devine 0
                    { dx: -1, dy: 0, action: 'set_0' },     // [x-1, y] devine 0
                ],
            },
            {
                name: 'Inversor Vertical [x, y]',
                description: 'Dacă vecinii [x,y+1]=1 și [x,y-1]=1, inversează [x,y]',
                current_state: -1,
                pattern_conditions: [
                    { dx: 0, dy: 1, state: 1 },
                    { dx: 0, dy: -1, state: 1 },
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },
                ],
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback('🔄 S-a încărcat presetarea: Inversor [x, y] cu câmpuri multiple!', 'success');
    }

    _showFeedback(msg, type = 'success') {
        if (!this.ruleFeedback) return;
        this.ruleFeedback.textContent = msg;
        this.ruleFeedback.className = `feedback ${type}`;
        this.ruleFeedback.classList.remove('hidden');

        // Ascundem după 6 secunde
        setTimeout(() => {
            if (this.ruleFeedback) {
                this.ruleFeedback.classList.add('hidden');
            }
        }, 6000);
    }
}
