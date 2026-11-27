#!/usr/bin/env bash
# Clone and build pbrt-v4 (CPU build) into third_party/.
# Optional: PBRT_REF=<tag-or-commit> ./setup.sh to pin a version.
set -euo pipefail
cd "$(dirname "$0")"

TP=third_party
mkdir -p "$TP"

if [ ! -d "$TP/pbrt-v4" ]; then
  git clone --recursive https://github.com/mmp/pbrt-v4.git "$TP/pbrt-v4"
fi
if [ -n "${PBRT_REF:-}" ]; then
  git -C "$TP/pbrt-v4" checkout "$PBRT_REF"
  git -C "$TP/pbrt-v4" submodule update --init --recursive
fi

if [ ! -d "$TP/pbrt-v4-scenes" ]; then
  git clone https://github.com/mmp/pbrt-v4-scenes.git "$TP/pbrt-v4-scenes"
fi

cmake -S "$TP/pbrt-v4" -B "$TP/pbrt-v4/build" -DCMAKE_BUILD_TYPE=Release
cmake --build "$TP/pbrt-v4/build" -j"$(nproc 2>/dev/null || sysctl -n hw.ncpu)"

echo "pbrt built: $TP/pbrt-v4/build/pbrt"
git -C "$TP/pbrt-v4" log -1 --format='commit %h (%cd)'
