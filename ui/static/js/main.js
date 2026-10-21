/**
 * CelLab Main — Entry point pentru aplicația CelLab cu Spațiu Infinit.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🧬 CelLab — Simulator de Automate Celulare 2D pe Spațiu Infinit');

    // 1. Inițializare Grid Renderer Infinit pe Canvas
    const canvas = document.getElementById('grid-canvas');
    if (!canvas) {
        console.error('Canvas elementul #grid-canvas nu a fost găsit!');
        return;
    }

    const gridRenderer = new InfiniteGridRenderer(canvas);
    window.gridRenderer = gridRenderer;

    // 2. Inițializare Controale Simulare cu Hashmap Memoization Cache
    const controls = new SimulationControls(gridRenderer);
    window.controls = controls;

    // 3. Inițializare Panou Reguli în Format Prestabilit
    const rulesPanel = new RulesPanel();
    window.rulesPanel = rulesPanel;

    // 4. Populare inițială automată cu presetul Conway Game of Life Randomizat
    setTimeout(() => {
        rulesPanel.presetGolRandom();
    }, 100);

    console.log('✅ CelLab inițializat cu succes!');
});
