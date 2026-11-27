#!/usr/bin/env bash
# Usage: pbrt/render.sh path/to/scene.pbrt [extra pbrt args...]
# Writes output/<scene-folder>.exr
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PBRT="${PBRT:-$ROOT/third_party/pbrt-v4/build/pbrt}"
[ -x "$PBRT" ] || { echo "pbrt not built; run ./setup.sh (or set PBRT=...)"; exit 1; }

scene="$1"; shift
name="$(basename "$(dirname "$scene")")"
mkdir -p "$ROOT/output"
"$PBRT" "$scene" --outfile "$ROOT/output/$name.exr" "$@"
echo "wrote $ROOT/output/$name.exr"
