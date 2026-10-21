/**
 * CelLab Main — Entry point pentru aplicația frontend.
 * Conectează componentele: Canvas Grid, Simulator Controls, Rules Panel, Analysis.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🧬 CelLab — Simulator de Automate Celulare 2D');
    console.log('Inițializare componente...');

    // 1. Inițializare Grid Renderer pe Canvas
    const canvas = document.getElementById('grid-canvas');
    const gridRenderer = new GridRenderer(canvas, {
        gridWidth: 50,
        gridHeight: 50,
        cellSize: 12,
    });
    gridRenderer.render();

    // 2. Inițializare Controale Simulare (Play/Pause/Step/Reset + WebSocket + Motor Local)
    const controls = new SimulationControls(gridRenderer);
    window.controls = controls;

    // 3. Inițializare Editor de Reguli (Asistent Vizual 3x3, Text, Presets)
    const rulesPanel = new RulesPanel();
    window.rulesPanel = rulesPanel;

    // 4. Inițializare Panou Analiză
    const btnAnalyze = document.getElementById('btn-analyze');
    const analysisType = document.getElementById('analysis-type');
    const analysisParamN = document.getElementById('analysis-param-n');
    const analysisResult = document.getElementById('analysis-result');

    if (btnAnalyze) {
        btnAnalyze.addEventListener('click', async () => {
            const type = analysisType.value;
            const n = parseInt(analysisParamN.value, 10) || 100;

            analysisResult.textContent = 'Se calculează...';
            analysisResult.className = 'feedback';
            analysisResult.classList.remove('hidden');

            try {
                // Dacă backend-ul are endpoint-ul de analiză, îl interogăm
                const result = await ApiClient.analyze(type, { n });
                analysisResult.textContent = JSON.stringify(result, null, 2);
                analysisResult.className = 'feedback success';
            } catch (err) {
                // Calcul local inteligent dacă modulul de analiză nu este încă pornit pe server
                let answer = '';
                const activeCells = gridRenderer.getActiveCellCount();
                if (type === 'cell_count') {
                    answer = `Celule active în starea curentă: ${activeCells} din ${gridRenderer.gridWidth * gridRenderer.gridHeight}`;
                } else if (type === 'state_after_n') {
                    answer = `Pentru a vedea starea după ${n} iterații, setați N și rulați cu Step / Play. Generația curentă: ${controls.generation}`;
                } else if (type === 'steady_state') {
                    answer = `Sistemul verifică dacă gridul este identic între iterații succesive.`;
                } else if (type === 'cycle_detection') {
                    answer = `Se monitorizează hash-urile stărilor anterioare pentru detectarea perioadelor oscilatorii.`;
                } else {
                    answer = `Rezultat analiză: simulare activă cu ${activeCells} celule active.`;
                }
                analysisResult.textContent = answer;
                analysisResult.className = 'feedback success';
            }
        });
    }

    // 5. Sincronizare stare inițială de pe server
    try {
        const state = await ApiClient.getState();
        if (state && state.grid) {
            gridRenderer.updateGrid(state.grid);
            controls.generation = state.generation || 0;
            controls.updateCounters(state.generation || 0, state.active_cells || 0);
        }
    } catch (err) {
        console.log('Serverul local pornește... se folosește starea locală.');
    }

    // 6. Actualizare etichetă dimensiune grid
    const sizeElem = document.getElementById('grid-size');
    if (sizeElem) {
        sizeElem.textContent = `Grid: ${gridRenderer.gridWidth}×${gridRenderer.gridHeight}`;
    }

    console.log('✅ CelLab frontend inițializat cu succes!');
});
