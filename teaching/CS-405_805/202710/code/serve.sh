#!/usr/bin/env bash
# Serve the code/ tree so WebGL2 pages can load shared assets over HTTP.
cd "$(dirname "$0")"
PORT="${1:-8000}"
echo "http://localhost:$PORT/webgl2/"
exec python3 -m http.server "$PORT"
