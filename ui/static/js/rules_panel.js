/**
 * CelLab Rules Panel — Format Prestabilit de Reguli & Presetări Rapide Randomizate.
 *
 * Format Prestabilit:
 * [x,y] : IF [x+dx,y+dy]=stare, ... THEN [x+dx,y+dy] -> actiune
 */

const NEIGHBOR_OPTIONS = [
    { val: '-1,0', label: '[x-1, y] (Left)' },
    { val: '1,0', label: '[x+1, y] (Right)' },
    { val: '0,-1', label: '[x, y-1] (Up)' },
    { val: '0,1', label: '[x, y+1] (Down)' },
    { val: '-1,-1', label: '[x-1, y-1] (Upper left)' },
    { val: '1,-1', label: '[x+1, y-1] (Upper right)' },
    { val: '-1,1', label: '[x-1, y+1] (Lower left)' },
    { val: '1,1', label: '[x+1, y+1] (Lower right)' }
];

class RulesPanel {
    constructor() {
        this.rules = [];
        window.rulesPanel = this;

        // Stare internă pentru Constructorul de Reguli în stil Scratch
        this.scratchBlocks = {
            centerState: -1,
            conditions: [
                { dx: -1, dy: 0, state: 1 },
                { dx: 1, dy: 0, state: 1 }
            ],
            actions: [
                { dx: 0, dy: 0, action: 'invert' }
            ]
        };

        this._bindElements();
        this._bindEvents();
        this._initScratchBuilder();
        this._loadDefaultGoL(false);
    }

    _bindElements() {
        // Câmp introducere regulă în format prestabilit
        this.ruleFormatInput = document.getElementById('rule-format-input');
        this.btnAddFormatRule = document.getElementById('btn-add-format-rule');
        this.formatTemplateChips = document.querySelectorAll('.btn-format-chip');

        // Constructor de reguli în stil Scratch
        this.btnToggleScratch = document.getElementById('btn-toggle-scratch');
        this.scratchBuilderPanel = document.getElementById('scratch-builder-panel');
        this.btnCloseScratch = document.getElementById('btn-close-scratch');
        this.scratchCenterState = document.getElementById('scratch-center-state');
        this.scratchConditionsList = document.getElementById('scratch-conditions-list');
        this.btnScratchAddCond = document.getElementById('btn-scratch-add-cond');
        this.scratchActionsList = document.getElementById('scratch-actions-list');
        this.btnScratchAddAction = document.getElementById('btn-scratch-add-action');
        this.scratchCodePreview = document.getElementById('scratch-code-preview');
        this.btnScratchApplyRule = document.getElementById('btn-scratch-apply-rule');
        this.btnScratchCopyInput = document.getElementById('btn-scratch-copy-input');

        // Presetări rapide randomizate
        this.btnPresetGolRandom = document.getElementById('btn-preset-gol-random');
        this.btnPresetInvertRandom = document.getElementById('btn-preset-invert-random');
        this.btnPresetWaveRandom = document.getElementById('btn-preset-wave-random');
        this.btnPresetSeedsRandom = document.getElementById('btn-preset-seeds-random');
        this.btnPresetChaosRandom = document.getElementById('btn-preset-chaos-random');

        // Listă reguli active
        this.activeRulesList = document.getElementById('active-rules-list');
        this.rulesCountBadge = document.getElementById('rules-count-badge');
        this.btnClearRules = document.getElementById('btn-clear-rules');
        this.ruleFeedback = document.getElementById('rule-feedback');
        this.ruleInputFeedback = document.getElementById('rule-input-feedback');
    }

    _bindEvents() {
        // Șabloane 1-click în format prestabilit
        this.formatTemplateChips.forEach(chip => {
            chip.addEventListener('click', () => {
                if (this.ruleFormatInput) {
                    this.ruleFormatInput.value = chip.dataset.rule;
                    this.ruleFormatInput.focus();
                }
            });
        });

        // Adăugare regulă scrisă în format prestabilit
        if (this.btnAddFormatRule) {
            this.btnAddFormatRule.addEventListener('click', () => this._addRuleFromFormatInput());
        }

        // Deschidere / Închidere Constructor Scratch
        if (this.btnToggleScratch) {
            this.btnToggleScratch.addEventListener('click', () => {
                if (this.scratchBuilderPanel) {
                    this.scratchBuilderPanel.classList.toggle('hidden');
                    if (!this.scratchBuilderPanel.classList.contains('hidden')) {
                        this._updateScratchPreview();
                    }
                }
            });
        }
        if (this.btnCloseScratch) {
            this.btnCloseScratch.addEventListener('click', () => {
                if (this.scratchBuilderPanel) {
                    this.scratchBuilderPanel.classList.add('hidden');
                }
            });
        }

        // Evenimente blocuri Scratch
        if (this.scratchCenterState) {
            this.scratchCenterState.addEventListener('change', (e) => {
                this.scratchBlocks.centerState = parseInt(e.target.value, 10);
                this._updateScratchPreview();
            });
        }
        if (this.btnScratchAddCond) {
            this.btnScratchAddCond.addEventListener('click', () => {
                const used = new Set(this.scratchBlocks.conditions.map(({ dx, dy }) => `${dx},${dy}`));
                const available = NEIGHBOR_OPTIONS.find(option => !used.has(option.val));
                if (!available) return;
                const [dx, dy] = available.val.split(',').map(Number);
                this.scratchBlocks.conditions.push({ dx, dy, state: 1 });
                this._renderScratchConditions();
                this._updateScratchPreview();
            });
        }
        if (this.btnScratchAddAction) {
            this.btnScratchAddAction.addEventListener('click', () => {
                this.scratchBlocks.actions.push({ dx: 1, dy: 0, action: 'set_0' });
                this._renderScratchActions();
                this._updateScratchPreview();
            });
        }
        if (this.btnScratchApplyRule) {
            this.btnScratchApplyRule.addEventListener('click', () => this._applyScratchRule());
        }
        if (this.btnScratchCopyInput) {
            this.btnScratchCopyInput.addEventListener('click', () => {
                const code = this._getScratchCode();
                if (this.ruleFormatInput) {
                    this.ruleFormatInput.value = code;
                    this.ruleFormatInput.focus();
                    this._showFeedback('The rule was copied to the text field.', 'success');
                }
            });
        }

        // Presetări Rapide Randomizate (1-Click)
        if (this.btnPresetGolRandom) {
            this.btnPresetGolRandom.addEventListener('click', () => this.presetGolRandom());
        }
        if (this.btnPresetInvertRandom) {
            this.btnPresetInvertRandom.addEventListener('click', () => this.presetInvertRandom());
        }
        if (this.btnPresetWaveRandom) {
            this.btnPresetWaveRandom.addEventListener('click', () => this.presetWaveRandom());
        }
        if (this.btnPresetSeedsRandom) {
            this.btnPresetSeedsRandom.addEventListener('click', () => this.presetSeedsRandom());
        }
        if (this.btnPresetChaosRandom) {
            this.btnPresetChaosRandom.addEventListener('click', () => this.presetChaosRandom());
        }

        // Șterge toate regulile
        if (this.btnClearRules) {
            this.btnClearRules.addEventListener('click', () => {
                this.rules = [];
                this._onRulesUpdated();
                this._showFeedback('All rules removed. Cells stay unchanged when no rules are active.', 'warning');
            });
        }
    }

    /**
     * Parsează un șir conform Formatului Prestabilit:
     * [x,y] : IF [x-1,y]=1, [x+1,y]=1 THEN [x,y] -> 1, [x+1,y] -> 0
     */
    parsePredefinedRule(text, errors = []) {
        const clean = text.trim();
        if (!clean) return null;

        // Accept English syntax and legacy Romanian delimiters.
        const parts = clean.split(/ATUNCI|THEN|SA\s+AIBA\s+LOC|=>/i);
        const ifPart = parts[0] || '';
        const thenPart = parts[1] || '';

        // 1. Verificare stare curentă din antet: [x,y]=1 sau [x,y]=0
        let currentState = -1;
        const centerMatch = ifPart.match(/\[\s*x\s*,\s*y\s*\]\s*=\s*([01])/i);
        if (centerMatch) {
            currentState = parseInt(centerMatch[1], 10);
        }

        // 2. Extragere condiții vecini [x+dx, y+dy]=stare
        const patternConds = [];
        const usedNeighbors = new Set();
        const coordRegex = /\[\s*x\s*([+-]\s*\d+)?\s*,\s*y\s*([+-]\s*\d+)?\s*\](?:\s*=\s*([01]))?/gi;
        let m;

        // Read conditions after the header separator when present.
        const condSub = ifPart.includes(':') ? ifPart.split(':')[1] : ifPart;

        while ((m = coordRegex.exec(condSub)) !== null) {
            const dx = m[1] ? parseInt(m[1].replace(/\s+/g, ''), 10) : 0;
            const dy = m[2] ? parseInt(m[2].replace(/\s+/g, ''), 10) : 0;
            const state = m[3] !== undefined ? parseInt(m[3], 10) : 1;
            if (dx === 0 && dy === 0) continue; // centrul a fost deja citit
            const neighbor = `${dx},${dy}`;
            if (usedNeighbors.has(neighbor)) {
                errors.push(`Use ${this._formatCoord(dx, dy)} only once in the IF conditions.`);
                return null;
            }
            usedNeighbors.add(neighbor);
            patternConds.push({ dx, dy, state });
        }

        // 3. Extragere efecte THEN: [x+dx, y+dy] -> actiune
        const effects = [];
        const effRegex = /\[\s*x\s*([+-]\s*\d+)?\s*,\s*y\s*([+-]\s*\d+)?\s*\](?:\s*->|\s*devine|\s*se\s*transforma\s*in|\s*=\s*)?\s*([a-zA-Z0-9_]+)/gi;

        while ((m = effRegex.exec(thenPart)) !== null) {
            const dx = m[1] ? parseInt(m[1].replace(/\s+/g, ''), 10) : 0;
            const dy = m[2] ? parseInt(m[2].replace(/\s+/g, ''), 10) : 0;
            const actRaw = (m[3] || '1').toLowerCase();
            let action = 'set_1';
            if (actRaw === '0' || actRaw === 'stins' || actRaw === 'mort') action = 'set_0';
            else if (actRaw === 'invers' || actRaw === 'invert' || actRaw === 'toggle') action = 'invert';
            else if (actRaw === 'keep' || actRaw === 'mentine') action = 'keep';

            effects.push({ dx, dy, action });
        }

        // Dacă nu s-a specificat o țintă explicită în THEN, ținta implicită este [x,y]
        if (effects.length === 0) {
            let defAct = 'set_1';
            const lowerThen = thenPart.toLowerCase();
            if (lowerThen.includes('0') || lowerThen.includes('stins')) defAct = 'set_0';
            else if (lowerThen.includes('invers') || lowerThen.includes('invert')) defAct = 'invert';
            effects.push({ dx: 0, dy: 0, action: defAct });
        }

        if (patternConds.length === 0 && currentState === -1) {
            return null;
        }

        return {
            name: `Custom rule #${this.rules.length + 1}`,
            description: clean,
            current_state: currentState,
            pattern_conditions: patternConds,
            effects: effects,
            enabled: true,
        };
    }

    _addRuleFromFormatInput() {
        const raw = this.ruleFormatInput ? this.ruleFormatInput.value.trim() : '';
        if (!raw) {
            this._showFeedback('Enter a rule or choose an example above.', 'warning', this.ruleInputFeedback);
            return;
        }

        const errors = [];
        const parsed = this.parsePredefinedRule(raw, errors);
        if (!parsed) {
            this._showFeedback(errors[0] || 'Invalid format. Use: [x,y] : IF [x-1,y]=1 THEN [x,y] -> 1', 'error', this.ruleInputFeedback);
            return;
        }

        this.rules.push(parsed);
        this._onRulesUpdated();
        this._showFeedback('Rule added and enabled.', 'success', this.ruleInputFeedback);
        if (this.ruleFormatInput) this.ruleFormatInput.value = '';
    }

    _initScratchBuilder() {
        this._renderScratchConditions();
        this._renderScratchActions();
        this._updateScratchPreview();
    }

    _formatCoord(dx, dy) {
        if (dx === 0 && dy === 0) return '[x,y]';
        const xStr = dx > 0 ? `x+${dx}` : (dx < 0 ? `x${dx}` : 'x');
        const yStr = dy > 0 ? `y+${dy}` : (dy < 0 ? `y${dy}` : 'y');
        return `[${xStr},${yStr}]`;
    }

    _renderScratchConditions() {
        if (!this.scratchConditionsList) return;
        const used = new Set(this.scratchBlocks.conditions.map(({ dx, dy }) => `${dx},${dy}`));
        if (this.btnScratchAddCond) {
            this.btnScratchAddCond.disabled = NEIGHBOR_OPTIONS.every(option => used.has(option.val));
        }
        if (this.scratchBlocks.conditions.length === 0) {
            this.scratchConditionsList.innerHTML = '<div class="scratch-empty-note">No neighbor conditions (always applies).</div>';
            return;
        }

        let html = '';
        this.scratchBlocks.conditions.forEach((cond, idx) => {
            const currentVal = `${cond.dx},${cond.dy}`;
            const optsHtml = NEIGHBOR_OPTIONS.map(opt =>
                `<option value="${opt.val}" ${opt.val === currentVal ? 'selected' : used.has(opt.val) ? 'disabled' : ''}>${opt.label}</option>`
            ).join('');

            html += `
                <div class="scratch-mini-block scratch-mini-cond">
                    <span class="scratch-mini-label">Neighbor:</span>
                    <select class="scratch-mini-select scratch-cond-coord" data-idx="${idx}">
                        ${optsHtml}
                    </select>
                    <span class="scratch-op">=</span>
                    <select class="scratch-mini-select scratch-cond-state" data-idx="${idx}">
                        <option value="1" ${cond.state === 1 ? 'selected' : ''}>1 (Alive)</option>
                        <option value="0" ${cond.state === 0 ? 'selected' : ''}>0 (Dead)</option>
                    </select>
                    <button type="button" class="scratch-btn-del-mini scratch-cond-del" data-idx="${idx}" title="Remove condition">✕</button>
                </div>
            `;
        });

        this.scratchConditionsList.innerHTML = html;

        // Atașare evenimente
        this.scratchConditionsList.querySelectorAll('.scratch-cond-coord').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                const [dx, dy] = e.target.value.split(',').map(Number);
                this.scratchBlocks.conditions[i].dx = dx;
                this.scratchBlocks.conditions[i].dy = dy;
                this._renderScratchConditions();
                this.scratchConditionsList.querySelector(`.scratch-cond-coord[data-idx="${i}"]`)?.focus();
                this._updateScratchPreview();
            });
        });

        this.scratchConditionsList.querySelectorAll('.scratch-cond-state').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                this.scratchBlocks.conditions[i].state = parseInt(e.target.value, 10);
                this._updateScratchPreview();
            });
        });

        this.scratchConditionsList.querySelectorAll('.scratch-cond-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.dataset.idx, 10);
                this.scratchBlocks.conditions.splice(i, 1);
                this._renderScratchConditions();
                this._updateScratchPreview();
            });
        });
    }

    _renderScratchActions() {
        if (!this.scratchActionsList) return;
        if (this.scratchBlocks.actions.length === 0) {
            this.scratchActionsList.innerHTML = '<div class="scratch-empty-note">No actions defined.</div>';
            return;
        }

        const targetOptions = [
            { val: '0,0', label: '[x, y] (Current cell)' },
            { val: '-1,0', label: '[x-1, y] (Left)' },
            { val: '1,0', label: '[x+1, y] (Right)' },
            { val: '0,-1', label: '[x, y-1] (Up)' },
            { val: '0,1', label: '[x, y+1] (Down)' },
            { val: '-1,-1', label: '[x-1, y-1] (Upper left)' },
            { val: '1,-1', label: '[x+1, y-1] (Upper right)' },
            { val: '-1,1', label: '[x-1, y+1] (Lower left)' },
            { val: '1,1', label: '[x+1, y+1] (Lower right)' }
        ];

        let html = '';
        this.scratchBlocks.actions.forEach((act, idx) => {
            const currentVal = `${act.dx},${act.dy}`;
            const optsHtml = targetOptions.map(opt =>
                `<option value="${opt.val}" ${opt.val === currentVal ? 'selected' : ''}>${opt.label}</option>`
            ).join('');

            html += `
                <div class="scratch-mini-block scratch-mini-action">
                    <span class="scratch-mini-label">Target:</span>
                    <select class="scratch-mini-select scratch-action-coord" data-idx="${idx}">
                        ${optsHtml}
                    </select>
                    <span class="scratch-op">➔</span>
                    <select class="scratch-mini-select scratch-action-type" data-idx="${idx}">
                        <option value="set_1" ${act.action === 'set_1' ? 'selected' : ''}>1 (On / Alive)</option>
                        <option value="set_0" ${act.action === 'set_0' ? 'selected' : ''}>0 (Off / Dead)</option>
                        <option value="invert" ${act.action === 'invert' ? 'selected' : ''}>invert (Toggle)</option>
                        <option value="keep" ${act.action === 'keep' ? 'selected' : ''}>keep (Unchanged)</option>
                    </select>
                    <button type="button" class="scratch-btn-del-mini scratch-action-del" data-idx="${idx}" title="Remove action">✕</button>
                </div>
            `;
        });

        this.scratchActionsList.innerHTML = html;

        // Atașare evenimente
        this.scratchActionsList.querySelectorAll('.scratch-action-coord').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                const [dx, dy] = e.target.value.split(',').map(Number);
                this.scratchBlocks.actions[i].dx = dx;
                this.scratchBlocks.actions[i].dy = dy;
                this._updateScratchPreview();
            });
        });

        this.scratchActionsList.querySelectorAll('.scratch-action-type').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                this.scratchBlocks.actions[i].action = e.target.value;
                this._updateScratchPreview();
            });
        });

        this.scratchActionsList.querySelectorAll('.scratch-action-del').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.dataset.idx, 10);
                this.scratchBlocks.actions.splice(i, 1);
                this._renderScratchActions();
                this._updateScratchPreview();
            });
        });
    }

    _getScratchCode() {
        let header = '[x,y]';
        if (this.scratchBlocks.centerState === 1) header = '[x,y]=1';
        else if (this.scratchBlocks.centerState === 0) header = '[x,y]=0';

        const condStrs = this.scratchBlocks.conditions.map(c => {
            return `${this._formatCoord(c.dx, c.dy)}=${c.state}`;
        });
        const condPart = condStrs.length > 0 ? condStrs.join(', ') : '[x-1,y]=1';

        const actStrs = this.scratchBlocks.actions.map(a => {
            let actWord = '1';
            if (a.action === 'set_0') actWord = '0';
            else if (a.action === 'invert') actWord = 'invert';
            else if (a.action === 'keep') actWord = 'keep';
            return `${this._formatCoord(a.dx, a.dy)} -> ${actWord}`;
        });
        const actPart = actStrs.length > 0 ? actStrs.join(', ') : '[x,y] -> 1';

        return `${header} : IF ${condPart} THEN ${actPart}`;
    }

    _updateScratchPreview() {
        if (this.scratchCodePreview) {
            this.scratchCodePreview.textContent = this._getScratchCode();
        }
    }

    _applyScratchRule() {
        const code = this._getScratchCode();
        const parsed = this.parsePredefinedRule(code);
        if (!parsed) {
            this._showFeedback('The generated rule is invalid.', 'error');
            return;
        }

        parsed.name = `Rule #${this.rules.length + 1}`;
        this.rules.push(parsed);
        this._onRulesUpdated();
        this._showFeedback(`Rule "${parsed.name}" added.`, 'success');
    }

    _onRulesUpdated() {
        this._renderRulesList();
        if (window.controls) {
            window.controls.clearCache(); // Golim cache-ul Hashmap când se schimbă regulile
            window.controls._resetGenerationHistoryFromCurrent();
        }
    }

    _renderRulesList() {
        if (!this.activeRulesList) return;

        const activeCount = this.rules.filter(r => r.enabled !== false).length;
        if (this.rulesCountBadge) {
            this.rulesCountBadge.textContent = `${activeCount} / ${this.rules.length}`;
        }

        if (this.rules.length === 0) {
            this.activeRulesList.innerHTML = '<p class="placeholder">No active rules. Cells will stay unchanged. Choose a preset or add a rule above.</p>';
            return;
        }

        let html = '';
        this.rules.forEach((rule, idx) => {
            const isEnabled = rule.enabled !== false;
            html += `
                <div class="rule-card ${isEnabled ? '' : 'rule-disabled'}">
                    <div class="rule-card-header">
                        <label class="rule-toggle-label">
                            <input type="checkbox" class="rule-toggle-checkbox" data-idx="${idx}" ${isEnabled ? 'checked' : ''}>
                            <span class="rule-title">${rule.name || `Rule ${idx + 1}`}</span>
                        </label>
                        <button class="btn-delete-rule" data-idx="${idx}" title="Remove rule">✕</button>
                    </div>
                    <div class="rule-card-body">
                        <code>${rule.description || ''}</code>
                    </div>
                </div>
            `;
        });

        this.activeRulesList.innerHTML = html;

        // Evenimente toggle
        this.activeRulesList.querySelectorAll('.rule-toggle-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const i = parseInt(e.target.dataset.idx, 10);
                if (this.rules[i]) {
                    this.rules[i].enabled = e.target.checked;
                    this._onRulesUpdated();
                }
            });
        });

        // Evenimente ștergere
        this.activeRulesList.querySelectorAll('.btn-delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(e.currentTarget.dataset.idx, 10);
                this.rules.splice(i, 1);
                this._onRulesUpdated();
            });
        });
    }

    // ==========================================
    // PRESETĂRI RAPIDE RANDOMIZATE (1-Click)
    // ==========================================
    _loadDefaultGoL(showFeedback = true) {
        this.rules = [
            {
                name: 'GoL: Survival (2–3 neighbors)',
                description: '[x,y]=1 : IF 2..3 live neighbors THEN [x,y] -> 1',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 2, max_count: 3 }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
            },
            {
                name: 'GoL: Birth (exactly 3 neighbors)',
                description: '[x,y]=0 : IF exactly 3 live neighbors THEN [x,y] -> 1',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 3, max_count: 3 }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
            },
            {
                name: 'GoL: Underpopulation (<2 neighbors)',
                description: '[x,y]=1 : IF <2 live neighbors THEN [x,y] -> 0',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 1 }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
            },
            {
                name: 'GoL: Overpopulation (>3 neighbors)',
                description: '[x,y]=1 : IF >3 live neighbors THEN [x,y] -> 0',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 4, max_count: 8 }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
            },
        ];
        this._onRulesUpdated();
        if (showFeedback) {
            this._showFeedback('Default Game of Life rules loaded.', 'success');
        }
    }

    /**
     * Preset 1: Conway Game of Life Randomizat (populează o supă celulară + planoare)
     */
    presetGolRandom() {
        this._loadDefaultGoL(false);
        if (window.controls) {
            window.controls.pause();
            const grid = window.controls.grid;
            grid.clear();

            // Supă celulară centrală
            grid.randomize(60, 0.3);

            // Adăugăm 3 planoare (gliders) fiecare cu o culoare genetică unică
            const addGlider = (gx, gy, color) => {
                const gCoords = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
                gCoords.forEach(([dx, dy]) => grid.setCell(gx + dx, gy + dy, 1, color));
            };
            addGlider(-40, -40, '#00e5ff'); // Cian electric
            addGlider(35, -35, '#ff007f');  // Roz magenta
            addGlider(-35, 35, '#ffea00');  // Galben solar

            grid.fitAll();
            window.controls.startNewConfiguration();
        }
        this._showFeedback('Game of Life preset loaded.', 'success');
    }

    /**
     * Preset 2: Inversor Orizontal Randomizat
     */
    presetInvertRandom() {
        this.rules = [
            {
                name: 'Horizontal inverter [x,y]',
                description: '[x,y] : IF [x-1,y]=1, [x+1,y]=1 THEN [x,y] -> invert, [x+1,y] -> 0',
                current_state: -1,
                pattern_conditions: [
                    { dx: -1, dy: 0, state: 1 },
                    { dx: 1, dy: 0, state: 1 }
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },
                    { dx: 1, dy: 0, action: 'set_0' }
                ],
                enabled: true,
            },
            {
                name: 'Vertical pulsar [x,y]',
                description: '[x,y] : IF [x,y-1]=1, [x,y+1]=1 THEN [x,y] -> invert',
                current_state: -1,
                pattern_conditions: [
                    { dx: 0, dy: -1, state: 1 },
                    { dx: 0, dy: 1, state: 1 }
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' }
                ],
                enabled: true,
            }
        ];
        this._onRulesUpdated();

        if (window.controls) {
            window.controls.pause();
            const grid = window.controls.grid;
            grid.clear();

            // Generăm linii și perechi orizontale randomizate cu culori contrastante
            for (let i = 0; i < 70; i++) {
                const rx = Math.floor((Math.random() - 0.5) * 80);
                const ry = Math.floor((Math.random() - 0.5) * 80);
                grid.setCell(rx - 1, ry, 1, '#00e5ff');
                grid.setCell(rx + 1, ry, 1, '#ff007f');
                if (Math.random() < 0.4) grid.setCell(rx, ry, 1, '#ffea00');
            }

            grid.fitAll();
            window.controls.startNewConfiguration();
        }
        this._showFeedback('Horizontal inverter preset loaded.', 'success');
    }

    /**
     * Preset 3: Rightward wave Randomizat
     */
    presetWaveRandom() {
        this.rules = [
            {
                name: 'Rightward wave',
                description: '[x,y] : IF [x-1,y]=1 THEN [x,y] -> 1, [x-1,y] -> 0',
                current_state: -1,
                pattern_conditions: [{ dx: -1, dy: 0, state: 1 }],
                effects: [
                    { dx: 0, dy: 0, action: 'set_1' },
                    { dx: -1, dy: 0, action: 'set_0' }
                ],
                enabled: true,
            }
        ];
        this._onRulesUpdated();

        if (window.controls) {
            window.controls.pause();
            const grid = window.controls.grid;
            grid.clear();

            // Generăm bariere verticale stânga cu culori genetice distincte
            for (let y = -40; y <= 40; y++) {
                if (Math.random() < 0.7) {
                    grid.setCell(-30, y, 1, '#00e5ff');
                }
                if (Math.random() < 0.5) {
                    grid.setCell(-10, y, 1, '#a855f7');
                }
            }

            grid.fitAll();
            window.controls.startNewConfiguration();
        }
        this._showFeedback('Rightward wave preset loaded.', 'success');
    }

    /**
     * Preset 4: Seeds B2/S Randomizat
     */
    presetSeedsRandom() {
        this.rules = [
            {
                name: 'Seeds: Birth (exactly 2 neighbors)',
                description: '[x,y]=0 : IF exactly 2 live neighbors THEN [x,y] -> 1',
                current_state: 0,
                count_conditions: [{ state: 1, min_count: 2, max_count: 2 }],
                effects: [{ dx: 0, dy: 0, action: 'set_1' }],
                enabled: true,
            },
            {
                name: 'Seeds: Immediate death',
                description: '[x,y]=1 : IF 0..8 neighbors THEN [x,y] -> 0',
                current_state: 1,
                count_conditions: [{ state: 1, min_count: 0, max_count: 8 }],
                effects: [{ dx: 0, dy: 0, action: 'set_0' }],
                enabled: true,
            }
        ];
        this._onRulesUpdated();

        if (window.controls) {
            window.controls.pause();
            const grid = window.controls.grid;
            grid.clear();

            // Generăm clustere mici de semințe disperse cu diversitate genetică
            const seedColors = ['#00ff88', '#00e5ff', '#ff007f', '#ffea00', '#a855f7'];
            for (let k = 0; k < 30; k++) {
                const cx = Math.floor((Math.random() - 0.5) * 70);
                const cy = Math.floor((Math.random() - 0.5) * 70);
                const c = seedColors[k % seedColors.length];
                grid.setCell(cx, cy, 1, c);
                grid.setCell(cx + 1, cy, 1, c);
                grid.setCell(cx, cy + 1, 1, c);
            }

            grid.fitAll();
            window.controls.startNewConfiguration();
        }
        this._showFeedback('Seeds preset loaded.', 'success');
    }

    /**
     * Preset 5: Haos Multi-Câmp Randomizat
     */
    presetChaosRandom() {
        this.rules = [
            {
                name: 'Simultaneous multi-cell chaos',
                description: '[x,y] : IF [x,y-1]=1, [x+1,y]=1 THEN [x,y] -> invert, [x-1,y] -> 1',
                current_state: -1,
                pattern_conditions: [
                    { dx: 0, dy: -1, state: 1 },
                    { dx: 1, dy: 0, state: 1 }
                ],
                effects: [
                    { dx: 0, dy: 0, action: 'invert' },
                    { dx: -1, dy: 0, action: 'set_1' }
                ],
                enabled: true,
            }
        ];
        this._onRulesUpdated();

        if (window.controls) {
            window.controls.pause();
            const grid = window.controls.grid;
            grid.clear();
            grid.randomize(45, 0.25);
            grid.fitAll();
            window.controls.startNewConfiguration();
        }
        this._showFeedback('Chaos preset loaded.', 'success');
    }

    _showFeedback(msg, type = 'success', target = this.ruleFeedback) {
        if (!target) return;
        target.textContent = msg;
        target.className = `feedback-msg ${type}`;

        setTimeout(() => {
            target.classList.add('hidden');
        }, 4000);
    }
}
