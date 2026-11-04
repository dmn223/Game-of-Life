# CelLab

**Sistem bazat pe Python pentru descrierea, validarea și simularea automatelor celulare 2D pe baza specificațiilor în limbaj natural.**

## Caracteristici

- **Descriere în limbaj natural** — introduceți regulile automatului celular în text liber
- **Validare automată** — schema Pydantic validează corectitudinea regulilor
- **Simulare interactivă** — motor de simulare NumPy cu vizualizare în timp real
- **Analiză avansată** — detectare stări stabile, cicluri, pattern matching
- **Interfață web modernă** — grid Canvas interactiv, similar cu playgameoflife.com

## Instalare

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -e ".[dev]"
```

## Rulare

```bash
python scripts/run_dev.py
```

Deschideți `http://localhost:8000` în browser.

## Teste

```bash
pytest
```

## Licență

MIT
