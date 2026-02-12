#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PIDDIR="$ROOT/.pids"

if [ ! -d "$PIDDIR" ]; then
  echo "No PID directory found: $PIDDIR"
  exit 0
fi

echo "Stopping services..."
for pidfile in "$PIDDIR"/*.pid; do
  [ -e "$pidfile" ] || continue
  name="$(basename "$pidfile" .pid)"
  pid="$(cat "$pidfile" || true)"
  if [ -n "${pid:-}" ] && kill -0 "$pid" >/dev/null 2>&1; then
    echo " - $name (pid $pid)"
    kill "$pid" || true
  else
    echo " - $name (pid not running)"
  fi
  rm -f "$pidfile"
done

echo "Done."
