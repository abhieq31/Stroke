#!/usr/bin/env bash
# One command: train + calibrate + export + self-check EVERY condition, then
# sync the portable models into the web app. No manual copying.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PY="$HERE/.venv/bin/python"
WEB="$HERE/../strokeguard/src/lib/ml/models"
[ -x "$PY" ] || PY="python3"

echo "▸ Building all conditions (train → calibrate → export → verify)…"
( cd "$HERE" && "$PY" model/build.py "$@" )

echo "▸ Syncing portable models into the web app…"
mkdir -p "$WEB"
for f in "$HERE"/model/*.model.web.json; do
  cid="$(basename "$f" .model.web.json)"
  cp "$f" "$WEB/$cid.model.json"
  cp "$HERE/model/$cid.metrics.json" "$WEB/$cid.metrics.json"
  echo "    synced $cid"
done

echo "✓ Done. Models live in strokeguard/src/lib/ml/models/"
