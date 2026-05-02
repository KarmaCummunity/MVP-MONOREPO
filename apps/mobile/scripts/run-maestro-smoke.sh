#!/usr/bin/env bash
# Runs Maestro smoke flow against an already-installed dev build (Expo dev client / prebuild).
# Prerequisites: simulator/emulator booted; app installed; Maestro CLI on PATH (~/.maestro/bin).
# Optional: INSTALL_MAESTRO=1 to bootstrap CLI via official installer (macOS/Linux).
set -euo pipefail

THIS_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$(cd "$THIS_DIR/.." && pwd)"
cd "$CLIENT_DIR"

if ! command -v maestro >/dev/null 2>&1; then
  if [[ "${INSTALL_MAESTRO:-}" == "1" ]]; then
    echo "Installing Maestro CLI (official installer)..."
    curl -fsSL "https://get.maestro.mobile.dev" | bash
    export PATH="${PATH}:${HOME}/.maestro/bin"
  fi
fi

if ! command -v maestro >/dev/null 2>&1; then
  echo "Maestro CLI not found. Install:"
  echo "  curl -fsSL \"https://get.maestro.mobile.dev\" | bash"
  echo "Then add ~/.maestro/bin to PATH, or run with:"
  echo "  INSTALL_MAESTRO=1 npm run e2e:maestro --workspace @kc/mobile"
  exit 127
fi

FLOW="${FLOW:-.maestro/flows/smoke.yaml}"
echo "Running Maestro: $FLOW"
exec maestro test "$FLOW"
