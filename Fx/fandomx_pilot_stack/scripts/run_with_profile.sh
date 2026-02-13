#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
PID_FILE="$ROOT_DIR/.run_pids"

PROFILE="${1:-local}"
PROFILE_FILE="$ROOT_DIR/config/profile.${PROFILE}.env"

if [[ ! -f "$PROFILE_FILE" ]]; then
  echo "Missing profile file: $PROFILE_FILE"
  echo "Create it from:"
  echo "  $ROOT_DIR/config/profile.${PROFILE}.env.example"
  exit 1
fi

mkdir -p "$LOG_DIR"
: > "$PID_FILE"

set -a
source "$PROFILE_FILE"
set +a

if [[ ! -d "$ROOT_DIR/.venv" ]]; then
  echo "Missing python venv at $ROOT_DIR/.venv"
  exit 1
fi
source "$ROOT_DIR/.venv/bin/activate"

(
  cd "$ROOT_DIR/optimizer/service"
  nohup uvicorn app:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/optimizer.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

(
  cd "$ROOT_DIR/services/api-gateway"
  nohup npm start > "$LOG_DIR/api-gateway.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

(
  cd "$ROOT_DIR/services/orchestrator"
  nohup npm start > "$LOG_DIR/orchestrator.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

(
  cd "$ROOT_DIR/services/agents/live-moments"
  nohup uvicorn app.api:app --host 0.0.0.0 --port 8004 > "$LOG_DIR/live-moments.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

(
  cd "$ROOT_DIR/apps/club-console"
  nohup npx next dev -p 3001 > "$LOG_DIR/club-console.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

(
  cd "$ROOT_DIR/apps/brand-console"
  nohup npx next dev -p 3002 > "$LOG_DIR/brand-console.log" 2>&1 &
  echo $! >> "$PID_FILE"
)

echo "Started services with profile: $PROFILE"
echo "Profile file: $PROFILE_FILE"
echo "Logs: $LOG_DIR"
echo "Club UI:  http://localhost:3001"
echo "Brand UI: http://localhost:3002"
echo "To stop: bash $ROOT_DIR/scripts/stop_all_codespaces.sh"
