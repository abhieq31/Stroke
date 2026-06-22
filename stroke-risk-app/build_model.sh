#!/usr/bin/env bash
# One command: train -> calibrate -> export -> verify -> sync into the web app.
# No manual copy steps. Run from anywhere:  ./stroke-risk-app/build_model.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$HERE/.venv/bin/python"
WEB="$HERE/../strokeguard/src/lib/ml"

[ -x "$PY" ] || PY="python3"

echo "▸ Training (tune + calibrate)…"
"$PY" "$HERE/model/train.py"

echo "▸ Exporting portable model + self-checking against scikit-learn…"
"$PY" "$HERE/model/export_web.py"

echo "▸ Syncing into the web app…"
cp "$HERE/model/model.web.json" "$WEB/model.json"
cp "$HERE/model/metrics.json"   "$WEB/metrics.json"

echo "✓ Done. model.json + metrics.json updated in strokeguard/src/lib/ml/"
