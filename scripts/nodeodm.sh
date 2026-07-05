#!/usr/bin/env bash
#
# Start/stop a local NodeODM worker for the Aernova 3D pipeline.
#
#   scripts/nodeodm.sh start [port]   # default port 3001
#   scripts/nodeodm.sh stop
#   scripts/nodeodm.sh logs
#
# After starting, set this in .env (the default 127.0.0.1:3000 points at the
# Next.js app, NOT a worker):
#   NODEODM_URL=http://127.0.0.1:3001
#
set -euo pipefail

NAME="aernova-nodeodm"
IMAGE="opendronemap/nodeodm"
CMD="${1:-start}"
PORT="${2:-3001}"

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker daemon is not running. Start Docker Desktop and retry." >&2
  exit 1
fi

case "$CMD" in
  start)
    if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
      echo "✓ $NAME is already running on http://127.0.0.1:$PORT"
      exit 0
    fi
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    echo "Pulling/starting $IMAGE ..."
    docker run -d --rm --name "$NAME" -p "$PORT:3000" "$IMAGE" >/dev/null
    echo "✓ NodeODM running at http://127.0.0.1:$PORT"
    echo "  Set in .env:  NODEODM_URL=http://127.0.0.1:$PORT"
    echo "  Health check: curl http://127.0.0.1:$PORT/info"
    ;;
  stop)
    docker rm -f "$NAME" >/dev/null 2>&1 && echo "✓ Stopped $NAME" || echo "Nothing to stop."
    ;;
  logs)
    docker logs -f "$NAME"
    ;;
  *)
    echo "Usage: scripts/nodeodm.sh [start|stop|logs] [port]" >&2
    exit 1
    ;;
esac
