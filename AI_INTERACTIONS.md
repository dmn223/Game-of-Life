# CelLab — Jurnal de Interacțiuni AI (Audit Log)

> Acest fișier documentează toate interacțiunile echipei cu asistentul AI pe parcursul dezvoltării proiectului CelLab.

---

### [2026-10-10 / Pasul 1] - Autor: Membru 1

**Prompt Utilizator:**

Cerere de planificare tehnică inițială (Iterația 1) pentru proiectul CelLab — sistem Python pentru descrierea, validarea și simularea automatelor celulare 2D pe baza specificațiilor în limbaj natural. Cerințe specifice:
1. Crearea fișierului `AI_INTERACTIONS.md`
2. Arhitectură modulară + împărțire sarcini pe 3 membri
3. Recomandare bibliotecă UI (comparație Pygame vs PyQt vs Web UI)
4. Schema formală Pydantic pentru regulile automatelor celulare
5. Structura de directoare și fișiere

Context: echipă de 3 persoane, depozit Git clonat local, abordare iterativă (doar planificare în această etapă).

**Răspuns / Acțiuni AI:**

1. **Fișier creat:** `AI_INTERACTIONS.md` — jurnalul curent de interacțiuni
2. **Arhitectură modulară propusă** cu 5 pachete decuplate:
   - `models/` — schema Pydantic comună (contractul între module)
   - `nlp_parser/` — parsare limbaj natural → spec formal (Membru 1)
   - `simulation_engine/` — motor de simulare NumPy (Membru 2)
   - `analysis/` — cele 5 întrebări obligatorii de analiză (Membru 2)
   - `ui/` — interfață web FastAPI + Canvas (Membru 3)
3. **Recomandare UI:** FastAPI (backend) + Vanilla JS / HTML Canvas (frontend) — cea mai apropiată experiență de playgameoflife.com, separare naturală backend/frontend, WebSocket pentru streaming generații
4. **Schema Pydantic definită:** `CellularAutomatonSpec` cu modele pentru `CellState`, `TransitionCondition`, `GridConfig`, enum-uri `NeighborhoodType` și `BoundaryCondition`, plus validare semantică cu `field_validator`
5. **Structura completă de directoare propusă** cu ~30 fișiere organizate pe module independente
6. **Diagrame create:** arhitectură modulară (graph) + flux principal (sequence diagram)
7. **Draft `requirements.txt`** cu dependențele de bază: fastapi, uvicorn, pydantic v2, numpy, websockets, pytest

**Fișiere create/modificate:**
- `AI_INTERACTIONS.md` (nou)

---

### [2026-10-10 / Pasul 2] - Autor: Membru 1 / Echipa CelLab

**Prompt Utilizator:**

Aprobarea planului și continuarea implementării (scaffolding complet al proiectului, structură modulară, fișiere de cod și rulare teste/demo).

**Răspuns / Acțiuni AI:**

1. **Scaffold complet generat pe 5 module decuplate conform arhitecturii:**
   - **`models/` (Contract comun):** `models/spec.py` (CellularAutomatonSpec, CellState, TransitionCondition, GridConfig), `models/examples/game_of_life.json`
   - **`nlp_parser/` (Membru 1):** `parser.py`, `tokenizer.py`, `rule_extractor.py`, `validator.py`, template prompturi LLM
   - **`simulation_engine/` (Membru 2):** `engine.py` (clasa Simulator), `grid.py` (matrice NumPy), `neighbors.py` (convoluție Moore/Von Neumann), `transitions.py`
   - **`analysis/` (Membru 2):** `analyzer.py`, `state_query.py` (Q1), `steady_state.py` (Q2), `pattern_search.py` (Q3), `cell_counter.py` (Q4), `cycle_detector.py` (Q5)
   - **`ui/` (Membru 3):** backend FastAPI (`app.py`, `api/routes.py`, `api/websocket.py`) + frontend web modern cu HTML5 Canvas (`index.html`, `style.css`, `grid.js`, `controls.js`, `rules_panel.js`, `api_client.js`, `main.js`) inspirat din playgameoflife.com
   - **Configurare:** `.gitignore`, `requirements.txt`, `pyproject.toml`, `README.md`
   - **Scripturi utilitare:** `scripts/demo.py` (validare CLI), `scripts/run_dev.py` (server uvicorn)
   - **Suite de teste:** `test_models.py`, `test_simulation.py`, `test_analysis.py`, `test_nlp_parser.py`, `test_api.py`

2. **Validare & Execuție:**
   - Rulat `scripts/demo.py` — validat exportul JSON și schema Pydantic pe Game of Life.
   - Rulat suita pytest: **18 teste trecute cu succes**, 4 teste skipped (așteaptă implementarea componentelor specifice).
   - Corectat compatibilitatea de codare consolă Windows (cp1252 → UTF-8).

**Fișiere create/modificate:**
- Toate cele 47 de fișiere din modulele `models/`, `nlp_parser/`, `simulation_engine/`, `analysis/`, `ui/`, `tests/`, `scripts/`
- `AI_INTERACTIONS.md` (actualizat cu Pasul 2)

---

### [2026-10-10 / Pasul 3] - Autor: Membru 1 / Echipa CelLab

**Prompt Utilizator:**

Cerere de efectuare commit pentru toate fișierele create și push pe GitHub pe branch-ul curent (`cellab_initial_project_setup`).

**Răspuns / Acțiuni AI:**

1. **Pregătire depozit Git:**
   - Adăugate toate fișierele noi (`models/`, `nlp_parser/`, `simulation_engine/`, `analysis/`, `ui/`, `tests/`, `scripts/`, fișiere de configurare și documentație).
   - Verificat starea cu `git status`.
2. **Commit & Push:**
   - Realizat commit-ul inițial cu mesaj structurat conform convențiilor de proiect: `feat: initial project setup and architecture scaffold for CelLab`.
   - Efectuat `git push -u origin cellab_initial_project_setup` către depozitul remote de pe GitHub.

**Fișiere create/modificate:**
- `AI_INTERACTIONS.md` (actualizat cu Pasul 3)

---

### [2026-10-13 / Pasul 4] - Autor: Membru 1 / Echipa CelLab

**Prompt Utilizator:**

Întrebare privind pașii de clonare și configurare a depozitului public pe un alt dispozitiv.

**Răspuns / Acțiuni AI:**

1. **Ghidare clonare depozit:**
   - Furnizat comenzi Git pentru clonarea branch-ului de lucru (`cellab_initial_project_setup`).
   - Instrucțiuni de configurare a mediului virtual Python (`venv`) și instalare a dependențelor din `requirements.txt`.
   - Instrucțiuni de validare locală prin rularea `scripts/demo.py` și `pytest`.
2. **Actualizare Audit Log:**
   - Actualizat `AI_INTERACTIONS.md` cu Pasul 4.

**Fișiere create/modificate:**
- `AI_INTERACTIONS.md` (actualizat cu Pasul 4)

---

### [2026-10-13 / Pasul 5] - Autor: Echipa CelLab

**Prompt Utilizator:**

„Cum ai răspunde la aceste întrebări? Să dai o soluție cât mai eficientă, să răspunzi în limbaj natural, nu intra prea mult în detaliu.”

- *What is the state after N iterations?*
- *When does the system reach a stable state? (no changes will occur in future generations)*
- *Does a particular configuration ever occur?*
- *How many cells of type X exist after N iterations?*
- *Does the simulation enter a cycle? (a repeating sequence of states)*

Solicitare ulterioară: publicarea răspunsurilor pe GitHub în `AI_INTERACTIONS.md`.

**Răspuns / Acțiuni AI:**

Aș folosi o singură simulare, cu actualizarea simultană a celulelor la fiecare generație, și aș reutiliza rezultatele pentru toate întrebările:

1. **Care este starea după N iterații?**
   Simulez până la generația N. Dacă detectez un ciclu înainte, calculez direct ce stare din ciclu corespunde lui N, evitând iterațiile inutile.

2. **Când ajunge sistemul într-o stare stabilă?**
   Compar fiecare generație cu precedenta. Prima generație identică cu cea anterioară indică stabilizarea, presupunând reguli deterministe care nu se schimbă în timp.

3. **Apare vreodată o anumită configurație?**
   Verific configurația în starea inițială și după fiecare iterație. Dacă sistemul se stabilizează sau încheie un ciclu fără să o întâlnească, pot spune că nu va apărea. Dacă ating doar o limită de simulare, răspunsul este „nu a apărut în intervalul verificat”.

4. **Câte celule de tip X există după N iterații?**
   Obțin starea de la generația N și număr celulele de tip X printr-o operație NumPy asupra întregii grile.

5. **Intră simularea într-un ciclu?**
   Păstrez o amprentă (*hash*) pentru fiecare stare, împreună cu generația ei. Când o amprentă reapare, verific că stările sunt identice; diferența dintre generații este lungimea ciclului. O stare stabilă este un ciclu de lungime 1.

Pentru eficiență, păstrez doar starea curentă și informațiile necesare întrebărilor cerute. Detectarea ciclurilor permite oprirea timpurie și calcularea rapidă a rezultatelor pentru valori mari ale lui N.

**Fișiere create/modificate:**
- `AI_INTERACTIONS.md` (actualizat cu Pasul 5)

---
