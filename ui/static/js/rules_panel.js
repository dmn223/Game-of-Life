/**
 * CelLab Rules Panel — Editor intuitiv de reguli pentru automate celulare 2D.
 *
 * Oferă:
 * - Constructor Vizual 3×3 simplu și intuitiv în jurul lui [x, y]
 * - Mod Text cu șabloane rapide 1-click
 * - Suport pentru reguli relative [x+dx, y+dy] și acțiuni simultane pe câmpuri multiple
 * - Toggle ON/OFF individual pentru fiecare regulă activă
 * - Presetări rapide (Default GoL B3/S23, Inversor [x,y], Seeds, Propagare)
 * - Aplicare automată instantanee la adăugare/modificare
 */

class RulesPanel {
    constructor() {
        this.rules = [];
        this.visualCenterState = -1; // -1 = Oricare, 1 = Vie, 0 = Moartă
        // Map de vecini 3x3: "dx,dy" -> state (0 = oricare, 1 = trebuie 1, -1 = trebuie 0)
        this.neighborStates = {
            '-1,-1': 0, '0,-1': 0, '1,-1': 0,
            '-1,0':  0,          '1,0':  0,
            '-1,1':  0, '0,1':  0, '1,1':  0,
        };

        // Expunem instanța global pentru acces facil din SimulationControls
        window.rulesPanel = this;

        this._bindElements();
        this._bindEvents();
        this._updateVisualNeighborGrid();
        this._renderRulesList();

        // Încărcare inițială reguli de pe server sau setul default
        this._loadInitialRules();
    }

    _bindElements() {
        // Tab-uri
        this.tabBtnVisual = document.getElementById('tab-btn-visual');
        this.tabBtnText = document.getElementById('tab-btn-text');
        this.tabContentVisual = document.getElementById('tab-content-visual');
        this.tabContentText = document.getElementById('tab-content-text');

        // Mod Vizual 3x3
        this.statePills = document.querySelectorAll('.btn-state-pill');
        this.centerCellLabel = document.getElementById('center-cell-label');
        this.nbCells = document.querySelectorAll('.nb-cell');
        this.btnNbAny = document.getElementById('btn-nb-any');
        this.btnNbHoriz = document.getElementById('btn-nb-horiz');
        this.btnNbVert = document.getElementById('btn-nb-vert');
        this.btnNbCross = document.getElementById('btn-nb-cross');
        this.visualTargetField = document.getElementById('visual-target-field');
        this.visualAction = document.getElementById('visual-action');
        this.btnAddVisualRule = document.getElementById('btn-add-visual-rule');

        // Mod Text
        this.customRuleText = document.getElementById('custom-rule-text');
        this.btnParseAddRule = document.getElementById('btn-parse-add-rule');
        this.templateButtons = document.querySelectorAll('.btn-template');

        // Listă reguli & acțiuni
        this.activeRulesList = document.getElementById('active-rules-list');
        this.rulesCountBadge = document.getElementById('rules-count-badge');
        this.btnClearRules = document.getElementById('btn-clear-rules');
        this.btnApplyRules = document.getElementById('btn-apply-rules');
        this.ruleFeedback = document.getElementById('rule-feedback');
        this.ruleBoundary = document.getElementById('rule-boundary');

        // Presetări
        this.btnResetDefault = document.getElementById('btn-reset-default');
        this.btnPresetInverter = document.getElementById('btn-preset-inverter');
        this.btnPresetSeeds = document.getElementById('btn-preset-seeds');
        this.btnPresetWave = document.getElementById('btn-preset-wave');
    }

    _bindEvents() {
        // Schimbare tab-uri
        if (this.tabBtnVisual) {
            this.tabBtnVisual.addEventListener('click', () => this._switchTab('visual'));
        }
        if (this.tabBtnText) {
            this.tabBtnText.addEventListener('click', () => this._switchTab('text'));
        }

        // Selector stare celulă curentă [x, y]
        this.statePills.forEach(pill => {
            pill.addEventListener('click', () => {
                this.statePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                this.visualCenterState = parseInt(pill.dataset.state, 10);
                if (this.centerCellLabel) {
                    this.centerCellLabel.textContent = this.visualCenterState === 1 ? 'Vie (1)' : (this.visualCenterState === 0 ? 'Moartă (0)' : 'Oricare');
                }
            });
        });

        // Click pe căsuțele de vecini 3x3
        this.nbCells.forEach(cell => {
            cell.addEventListener('click', () => {
                const dx = cell.dataset.dx;
                const dy = cell.dataset.dy;
                const key = `${dx},${dy}`;
                const cur = this.neighborStates[key] || 0;
                // Ciclu intuitiv: 0 (oricare) -> 1 (trebuie 1) -> -1 (trebuie 0) -> 0
                if (cur === 0) {
                    this.neighborStates[key] = 1;
                } else if (cur === 1) {
                    this.neighborStates[key] = -1;
                } else {
                    this.neighborStates[key] = 0;
                }
                this._updateNeighborCellElement(cell, this.neighborStates[key]);
            });
        });

        // Butoane rapide configurare vecini
        if (this.btnNbAny) {
            this.btnNbAny.addEventListener('click', () => {
                Object.keys(this.neighborStates).forEach(k => this.neighborStates[k] = 0);
                this._updateVisualNeighborGrid();
            });
        }
        if (this.btnNbHoriz) {
            this.btnNbHoriz.addEventListener('click', () => {
                Object.keys(this.neighborStates).forEach(k => this.neighborStates[k] = 0);
                this.neighborStates['-1,0'] = 1;
                this.neighborStates['1,0'] = 1;
                this._updateVisualNeighborGrid();
            });
        }
        if (this.btnNbVert) {
            this.btnNbVert.addEventListener('click', () => {
                Object.keys(this.neighborStates).forEach(k => this.neighborStates[k] = 0);
                this.neighborStates['0,-1'] = 1;
                this.neighborStates['0,1'] = 1;
                this._updateVisualNeighborGrid();
            });
        }
        if (this.btnNbCross) {
            this.btnNbCross.addEventListener('click', () => {
                Object.keys(this.neighborStates).forEach(k => this.neighborStates[k] = 0);
                this.neighborStates['-1,0'] = 1;
                this.neighborStates['1,0'] = 1;
                this.neighborStates['0,-1'] = 1;
                this.neighborStates['0,1'] = 1;
                this._updateVisualNeighborGrid();
            });
        }

        // Adăugare regulă vizuală
        if (this.btnAddVisualRule) {
            this.btnAddVisualRule.addEventListener('click', () => this._addVisualRule());
        }

        // Șabloane rapide text
        this.templateButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.customRuleText) {
                    this.customRuleText.value = btn.dataset.template;
                    this.customRuleText.focus();
                }
            });
        });

        // Adăugare regulă din text
        if (this.btnParseAddRule) {
            this.btnParseAddRule.addEventListener('click', () => this._addRuleFromText());
        }

        // Ștergere toate regulile
        if (this.btnClearRules) {
            this.btnClearRules.addEventListener('click', () => {
                this.rules = [];
                this._renderRulesList();
                this._applyRulesToServer();
                this._showFeedback('Toate regulile au fost șterse. Simulatorul va folosi regulile default Conway la rulare.', 'warning');
            });
        }

        // Buton Aplicare manuală
        if (this.btnApplyRules) {
            this.btnApplyRules.addEventListener('click', () => this._applyRulesToServer(true));
        }

        // Schimbare margine
        if (this.ruleBoundary) {
            this.ruleBoundary.addEventListener('change', () => this._applyRulesToServer());
        }

        // Presetări rapide
        if (this.btnResetDefault) {
            this.btnResetDefault.addEventListener('click', () => this._loadDefaultRules());
        }
        if (this.btnPresetInverter) {
            this.btnPresetInverter.addEventListener('click', () => this._loadPresetInverter());
        }
        if (this.btnPresetSeeds) {
            this.btnPresetSeeds.addEventListener('click', () => this._loadPresetSeeds());
        }
        if (this.btnPresetWave) {
            this.btnPresetWave.addEventListener('click', () => this._loadPresetWave());
        }
    }

    _switchTab(tab) {
        if (tab === 'visual') {
            this.tabBtnVisual.classList.add('active');
            this.tabBtnText.classList.remove('active');
            this.tabContentVisual.classList.add('active');
            this.tabContentText.classList.remove('active');
        } else {
            this.tabBtnText.classList.add('active');
            this.tabBtnVisual.classList.remove('active');
            this.tabContentText.classList.add('active');
            this.tabContentVisual.classList.remove('active');
        }
    }

    _updateVisualNeighborGrid() {
        this.nbCells.forEach(cell => {
            const dx = cell.dataset.dx;
            const dy = cell.dataset.dy;
            const st = this.neighborStates[`${dx},${dy}`] || 0;
            this._updateNeighborCellElement(cell, st);
        });
    }

    _updateNeighborCellElement(cell, state) {
        cell.classList.remove('st-any', 'st-one', 'st-zero');
        const statusSpan = cell.querySelector('.nb-status');
        if (state === 1) {
            cell.classList.add('st-one');
            if (statusSpan) statusSpan.textContent = '🟢 Trebuie 1';
        } else if (state === -1) {
            cell.classList.add('st-zero');
            if (statusSpan) statusSpan.textContent = '🔴 Trebuie 0';
        } else {
            cell.classList.add('st-any');
            if (statusSpan) statusSpan.textContent = '⚪ Oricare';
        }
    }

    /**
     * Construiește și adaugă regula configurată vizual
     */
    _addVisualRule() {
        const currState = this.visualCenterState;
        const targetVal = this.visualTargetField ? this.visualTargetField.value : '0,0';
        const action = this.visualAction ? this.visualAction.value : 'set_1';

        // Colectăm condițiile de vecini active (diferite de 0)
        const patternConds = [];
        Object.entries(this.neighborStates).forEach(([key, val]) => {
            if (val !== 0) {
                const [dx, dy] = key.split(',').map(Number);
                patternConds.push({
                    dx,
                    dy,
                    state: val === 1 ? 1 : 0,
                });
            }
        });

        if (currState === -1 && patternConds.length === 0) {
            this._showFeedback('Selectați cel puțin o condiție (stare celulă curentă sau cel puțin un vecin).', 'warning');
            return;
        }

        // Construim lista de efecte
        let effects = [];
        let targetDesc = '[x, y]';

        if (targetVal === 'multi_inverter') {
            effects = [
                { dx: 0, dy: 0, action: action },
                { dx: 1, dy: 0, action: 'set_0' },
                { dx: -1, dy: 0, action: 'set_0' },
            ];
            targetDesc = '[x,y] și vecinii orizontali';
        } else {
            const [tdx, tdy] = targetVal.split(',').map(Number);
            effects = [{ dx: tdx, dy: tdy, action: action }];
            targetDesc = (tdx === 0 && tdy === 0) ? '[x, y]' : `[x${tdx >= 0 ? '+' + tdx : tdx}, y${tdy >= 0 ? '+' + tdy : tdy}]`;
        }

        const actionText = {
            'set_1': 'devine 1 (din 0 în 1)',
            'set_0': 'devine 0 (din 1 în 0)',
            'invert': 'se inversează (0 ↔ 1)',
            'keep': 'se menține',
        }[action] || action;

        // Construim descriere clară în română
        let condDesc = [];
        if (currState !== -1) {
            condDesc.push(`[x, y] este ${currState}`);
        }
        if (patternConds.length > 0) {
            const pStr = patternConds.map(p => `[x${p.dx >= 0 ? '+' + p.dx : p.dx}, y${p.dy >= 0 ? '+' + p.dy : p.dy}]=${p.state}`).join(', ');
            condDesc.push(`vecinii (${pStr})`);
        }
        const fullDesc = `Dacă ${condDesc.join(' și ')} ➔ ${targetDesc} ${actionText}`;

        const newRule = {
            name: `Regulă Vizuală #${this.rules.length + 1}`,
            description: fullDesc,
            current_state: currState,
            pattern_conditions: patternConds,
            effects: effects,
            enabled: true,
        };

        this.rules.push(newRule);
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback(`✅ Regula a fost adăugată și este ACTIVĂ pe simulator!`, 'success');

        // Resetăm selecția de vecini pentru comoditate
        Object.keys(this.neighborStates).forEach(k => this.neighborStates[k] = 0);
        this._updateVisualNeighborGrid();
    }

    /**
     * Adăugare regulă prin parsarea textului în limbaj natural
     */
    async _addRuleFromText() {
        const rawText = this.customRuleText.value.trim();
        if (!rawText) {
            this._showFeedback('Introduceți textul regulii sau alegeți un șablon de mai sus.', 'warning');
            return;
        }

        try {
            const res = await ApiClient.parseCustomRule(rawText);
            if (res && res.success && res.rule) {
                const parsed = res.rule;
                parsed.name = `Regulă Text #${this.rules.length + 1}`;
                parsed.description = rawText;
                parsed.enabled = true;
                this.rules.push(parsed);
                this._renderRulesList();
                await this._applyRulesToServer();
                this._showFeedback('✅ Regula din text a fost parsatǎ și adăugată cu succes!', 'success');
                this.customRuleText.value = '';
                return;
            }
        } catch (err) {}

        // Fallback parsare locală
        const localRule = this._parseTextLocally(rawText);
        if (localRule) {
            localRule.enabled = true;
            this.rules.push(localRule);
            this._renderRulesList();
            this._applyRulesToServer();
            this._showFeedback('✅ Regula a fost parsatǎ și activată pe simulator!', 'success');
            this.customRuleText.value = '';
        } else {
            this._showFeedback('❌ Nu s-a putut parsa regula. Asigurați-vă că folosiți coordonate de tipul [x+1, y].', 'error');
        }
    }

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
            if (dx === 0 && dy === 0) continue;
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
            enabled: true,
        };
    }

    /**
     * Randează lista de reguli active cu comutator ON/OFF și ștergere
     */
    _renderRulesList() {
        if (!this.activeRulesList) return;

        const activeCount = this.rules.filter(r => r.enabled !== false).length;
        if (this.rulesCountBadge) {
            this.rulesCountBadge.textContent = `${activeCount} active / ${this.rules.length} total`;
        }

        if (this.rules.length === 0) {
            this.activeRulesList.innerHTML = '<p class="placeholder">Nicio regulă definită. Se vor utiliza regulile implicite Conway B3/S23.</p>';
            return;
        }

        let html = '';
        this.rules.forEach((rule, idx) => {
            const isEnabled = rule.enabled !== false;
            let details = '';

            if (rule.pattern_conditions && rule.pattern_conditions.length > 0) {
                const condsStr = rule.pattern_conditions.map(c => {
                    const sx = c.dx >= 0 ? `+${c.dx}` : c.dx;
                    const sy = c.dy >= 0 ? `+${c.dy}` : c.dy;
                    return `[x${sx}, y${sy}]=${c.state}`;
                }).join(', ');
                details += `<div><strong>Vecini:</strong> <code>${condsStr}</code></div>`;
            }

            if (rule.count_conditions && rule.count_conditions.length > 0) {
                const cc = rule.count_conditions[0];
                details += `<div><strong>Contor vecini:</strong> între ${cc.min_count} și ${cc.max_count}</div>`;
            }

            if (rule.effects && rule.effects.length > 0) {
                const effStr = rule.effects.map(e => {
                    const sx = e.dx >= 0 ? `+${e.dx}` : e.dx;
                    const sy = e.dy >= 0 ? `+${e.dy}` : e.dy;
                    const actName = {
                        'set_1': 'devine 1 (aprins)',
                        'set_0': 'devine 0 (stins)',
                        'invert': 'invers (0 ↔ 1)',
                        'keep': 'se menține',
                    }[e.action] || e.action;
                    return `[x${sx}, y${sy}] → ${actName}`;
                }).join(', ');
                details += `<div><strong>Efect:</strong> ${effStr}</div>`;
            }

            const defaultBadge = rule.is_default ? '<span class="badge-default-tag">Default</span>' : '';

            html += `
                <div class="rule-card ${isEnabled ? '' : 'rule-disabled'} ${rule.is_default ? 'rule-card-default' : ''}">
                    <div class="rule-card-header">
                        <label class="rule-toggle-label" title="Activează / Dezactivează această regulă">
                            <input type="checkbox" class="rule-toggle-checkbox" data-idx="${idx}" ${isEnabled ? 'checked' : ''}>
                            <span class="rule-title">${rule.name || `Regula ${idx + 1}`} ${defaultBadge}</span>
                        </label>
                        <button class="btn-delete-rule" data-idx="${idx}" title="Șterge regula">✕</button>
                    </div>
                    <div class="rule-card-body">
                        ${rule.description ? `<div class="rule-desc">${rule.description}</div>` : ''}
                        ${details}
                    </div>
                </div>
            `;
        });

        this.activeRulesList.innerHTML = html;

        // Evenimente toggle activ/inactiv
        this.activeRulesList.querySelectorAll('.rule-toggle-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                if (this.rules[i]) {
                    this.rules[i].enabled = e.target.checked;
                    this._renderRulesList();
                    this._applyRulesToServer();
                }
            });
        });

        // Evenimente ștergere
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
                const count = this.rules.filter(r => r.enabled !== false).length;
                this._showFeedback(`🚀 ${count} reguli sunt active pe simulator! Puteți rula (▶ Play / ⏭ Step).`, 'success');
            }
        } catch (err) {
            if (showFeedback) {
                this._showFeedback('Regulile sunt active local pe client.', 'success');
            }
        }
    }

    /**
     * Încarcă setul de reguli implicite (Conway's Game of Life)
     */
    async _loadDefaultRules() {
        this._loadPresetGoL(true);
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

        this._loadPresetGoL(false);
    }

    // ==========================================
    // Presetări Rapide
    // ==========================================
    _loadPresetGoL(feedback = true) {
        this.rules = [
            {
                name: 'GoL: Supraviețuire (2-3 vecini)',
                description: 'O celulă vie [x,y]=1 cu 2 sau 3 vecini vii rămâne vie',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 2, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
                is_default: true,
            },
            {
                name: 'GoL: Naștere (exact 3 vecini)',
                description: 'O celulă moartă [x,y]=0 cu exact 3 vecini devine vie',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 3, max_count: 3, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
                is_default: true,
            },
            {
                name: 'GoL: Subpopulare (<2 vecini)',
                description: 'O celulă vie [x,y]=1 cu 0 sau 1 vecin moare',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 1, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
                is_default: true,
            },
            {
                name: 'GoL: Suprapopulare (>3 vecini)',
                description: 'O celulă vie [x,y]=1 cu 4 sau mai mulți vecini moare',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 4, max_count: 8, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
                is_default: true,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        if (feedback) {
            this._showFeedback('⭐ S-au încărcat regulile Default (Conway\'s Game of Life B3/S23)!', 'success');
        }
    }

    _loadPresetInverter() {
        this.rules = [
            {
                name: 'Inversor Orizontal [x, y]',
                description: 'Dacă vecinii [x-1,y]=1 și [x+1,y]=1 ➔ inversează [x,y] și stinge vecinii',
                current_state: -1,
                pattern_conditions: [
                    { dx: -1, dy: 0, state: 1 },
                    { dx: 1, dy: 0, state: 1 },
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },
                    { dx: -1, dy: 0, action: 'set_0' },
                    { dx: 1, dy: 0, action: 'set_0' },
                ],
                enabled: true,
            },
            {
                name: 'Inversor Vertical [x, y]',
                description: 'Dacă vecinii [x,y-1]=1 și [x,y+1]=1 ➔ inversează [x,y]',
                current_state: -1,
                pattern_conditions: [
                    { dx: 0, dy: -1, state: 1 },
                    { dx: 0, dy: 1, state: 1 },
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },
                ],
                enabled: true,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback('🔄 S-a încărcat presetarea: Inversor [x, y] cu câmpuri multiple!', 'success');
    }

    _loadPresetSeeds() {
        this.rules = [
            {
                name: 'Seeds: Naștere (exact 2 vecini)',
                description: 'O celulă moartă devine vie dacă are exact 2 vecini vii',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 2, max_count: 2, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
            },
            {
                name: 'Seeds: Moarte imediată',
                description: 'Toate celulele vii mor la pasul următor',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 8, neighborhood: 'moore' }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback('🌱 S-a încărcat presetarea: Seeds (B2/S)!', 'success');
    }

    _loadPresetWave() {
        this.rules = [
            {
                name: 'Val Propagare Dreapta',
                description: 'Dacă vecinul din stânga [x-1,y]=1 ➔ aprinde [x,y] și stinge [x-1,y]',
                current_state: -1,
                pattern_conditions: [
                    { dx: -1, dy: 0, state: 1 },
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'set_1' },
                    { dx: -1, dy: 0, action: 'set_0' },
                ],
                enabled: true,
            },
        ];
        this._renderRulesList();
        this._applyRulesToServer();
        this._showFeedback('🌊 S-a încărcat presetarea: Val Propagare Dreapta!', 'success');
    }

    _showFeedback(msg, type = 'success') {
        if (!this.ruleFeedback) return;
        this.ruleFeedback.textContent = msg;
        this.ruleFeedback.className = `feedback ${type}`;
        this.ruleFeedback.classList.remove('hidden');

        setTimeout(() => {
            if (this.ruleFeedback) {
                this.ruleFeedback.classList.add('hidden');
            }
        }, 5000);
    }
}
