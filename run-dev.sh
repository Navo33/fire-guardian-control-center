#!/usr/bin/env bash
set -euo pipefail

# run-dev.sh - start backend and frontend in separate terminal windows (dev mode)
# Falls back to backgrounded processes with logs if no graphical terminal is available.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PATH="$SCRIPT_DIR/backend"
FRONTEND_PATH="$SCRIPT_DIR/frontend"

open_in_terminal() {
  target_dir="$1"
  title="$2"

  # Try several common terminal emulators.
  if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal -- bash -lc "printf '\\033]0;%s\\033\\' \"$title\"; cd \"$target_dir\" && npm run dev; exec bash" &
    return 0
  fi

  if command -v kitty >/dev/null 2>&1; then
    kitty --title "$title" bash -lc "cd \"$target_dir\" && npm run dev; exec bash" &
    return 0
  fi

  if command -v alacritty >/dev/null 2>&1; then
    alacritty -t "$title" -e bash -lc "cd \"$target_dir\" && npm run dev; exec bash" &
    return 0
  fi

  if command -v konsole >/dev/null 2>&1; then
    konsole --new-tab -p tabtitle="$title" -e bash -lc "cd \"$target_dir\" && npm run dev; exec bash" &
    return 0
  fi

  if command -v xfce4-terminal >/dev/null 2>&1; then
    xfce4-terminal --title="$title" -e "bash -lc 'cd \"$target_dir\" && npm run dev; exec bash'" &
    return 0
  fi

  if command -v xterm >/dev/null 2>&1; then
    xterm -T "$title" -e "bash -lc 'cd \"$target_dir\" && npm run dev; exec bash'" &
    return 0
  fi

  # No GUI terminal found — run in background and write logs.
  mkdir -p "$SCRIPT_DIR/logs"
  safe_title=$(echo "$title" | tr ' ' '_' | tr -cd '[:alnum:]_-')
  logfile="$SCRIPT_DIR/logs/${safe_title}.log"
  (cd "$target_dir" && npm run dev) >"$logfile" 2>&1 &
  echo "Started $title in background; logs -> $logfile"
}

echo "Starting Backend (dev mode)..."
open_in_terminal "$BACKEND_PATH" "FireGuardian - Backend"

sleep 2

echo "Starting Frontend (dev mode)..."
open_in_terminal "$FRONTEND_PATH" "FireGuardian - Frontend"

echo "Done. If terminals didn't open, check the logs/ directory for output."
