#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STACK="$ROOT/Fx/fandomx_pilot_stack"
LOGDIR="$ROOT/.logs"
PIDDIR="$ROOT/.pids"

mkdir -p "$LOGDIR" "$PIDDIR"

echo "Repo root: $ROOT"
echo "Stack:     $STACK"
echo "Logs:      $LOGDIR"

start_python_service () {
  local name="$1"
  local dir="$2"
  local port="$3"

  echo "Starting $name on port $port..."
  pushd "$dir" >/dev/null

  if [ ! -d ".venv" ]; then
    python3 -m venv .venv
  fi
  source .venv/bin/activate
  pip -q install -U pip >/dev/null
  # If you have pyproject.toml and want to use it, swap the next line to: pip install -e .
  pip -q install fastapi uvicorn >/dev/null

  # Try common app entrypoints
  local app_target="app.api:app"
  python -c "import importlib; importlib.import_module('app.api')" 2>/dev/null || app_target="app:app"

  nohup uvicorn "$app_target" --host 0.0.0.0 --port "$port" > "$LOGDIR/$name.log" 2>&1 &
  echo $! > "$PIDDIR/$name.pid"

  deactivate || true
  popd >/dev/null
}

start_node_service () {
  local name="$1"
  local dir="$2"
  local port_hint="$3"

  echo "Starting $name (node) ..."
  pushd "$dir" >/dev/null

  if [ -f package-lock.json ] || [ -f package.json ]; then
    npm install --silent
  fi

  # Prefer dev script, else start script, else node src/index.js
  if node -e "const p=require('./package.json'); process.exit(p.scripts&&p.scripts.dev?0:1)"; then
    nohup npm run dev --silent > "$LOGDIR/$name.log" 2>&1 &
  elif node -e "const p=require('./package.json'); process.exit(p.scripts&&p.scripts.start?0:1)"; then
    nohup npm start --silent > "$LOGDIR/$name.log" 2>&1 &
  else
    nohup node src/index.js > "$LOGDIR/$name.log" 2>&1 &
  fi

  echo $! > "$PIDDIR/$name.pid"

  popd >/dev/null
  echo "$name started (check $LOGDIR/$name.log). Port hint: $port_hint"
}

health_check () {
  local url="$1"
  local name="$2"
  echo -n "Checking $name... "
  for i in {1..30}; do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OK ($url)"
      return 0
    fi
    sleep 1
  done
  echo "NOT READY ($url). Check logs."
  return 1
}

# Start services
start_node_service "orchestrator" "$STACK/services/orchestrator" "see service log"
start_python_service "entitlements" "$STACK/services/entitlements" "8001"
start_python_service "rewards"      "$STACK/services/rewards"      "8002"

echo
echo "PIDs saved to $PIDDIR"
echo "Logs saved to $LOGDIR"
echo

# Try health checks (adjust endpoints if different)
health_check "http://localhost:8001/health" "entitlements" || true
health_check "http://localhost:8002/health" "rewards" || true

echo
echo "All services launched."
echo "Tail logs:  tail -f $LOGDIR/*.log"
echo "Stop all:   bash scripts/dev_down.sh"
