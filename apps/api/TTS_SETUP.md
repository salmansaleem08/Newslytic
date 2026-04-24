# TTS setup (virtual environment)

Use a Python virtual environment so deployment remains predictable.

## Local setup

```bash
cd apps/api
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

## Environment variables

- `TTS_PYTHON_BIN`  
  Path to python interpreter (defaults to `python`).
  Example on Windows with venv:
  - `TTS_PYTHON_BIN=apps/api/.venv/Scripts/python.exe`
- `TTS_PYTHON_BIN_NEWS_CASTER`  
  Optional per-feature override for AI News Caster.  
  Use this if future features require different python environments.
- `TTS_VOICE`  
  Defaults to `en-US-ChristopherNeural`.

The API route `/api/news-caster/today` invokes the python script `src/scripts/edge_tts_generate.py`.
