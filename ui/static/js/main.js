/**
 * CelLab Main — Entry point pentru aplicația frontend.
 *
 * Inițializează toate componentele și le conectează.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🧬 CelLab — Simulator de Automate Celulare 2D');
    console.log('Inițializare componente...');

    // 1. Inițializare Grid Renderer
    const canvas = document.getElementById('grid-canvas');
    const gridRenderer = new GridRenderer(canvas, {
        gridWidth: 50,
        gridHeight: 50,
        cellSize: 12,
    });
    gridRenderer.render();

    // 2. Inițializare Controale
    const controls = new SimulationControls(gridRenderer);

    // 3. Inițializare Panou Reguli
    const rulesPanel = new RulesPanel();

    // 4. Inițializare Panou Analiză
    const btnAnalyze = document.getElementById('btn-analyze');
    const analysisType = document.getElementById('analysis-type');
    const analysisParamN = document.getElementById('analysis-param-n');
    const analysisResult = document.getElementById('analysis-result');

    btnAnalyze.addEventListener('click', async () => {
        const type = analysisType.value;
        const n = parseInt(analysisParamN.value) || 100;

        try {
            const result = await ApiClient.analyze(type, { n });
            analysisResult.textContent = JSON.stringify(result, null, 2);
            analysisResult.className = 'feedback success';
        } catch (err) {
            analysisResult.textContent = `Eroare: ${err.message}`;
            analysisResult.className = 'feedback error';
        }
    });

    // 5. Actualizare info grid size
    document.getElementById('grid-size').textContent =
        `Grid: ${gridRenderer.gridWidth}×${gridRenderer.gridHeight}`;

    console.log('✅ CelLab inițializat cu succes!');
});
