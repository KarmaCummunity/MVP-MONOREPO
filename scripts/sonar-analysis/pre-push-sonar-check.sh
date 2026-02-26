#!/usr/bin/env bash
# =============================================================================
# Pre-push Sonar check: run Sonar locally and block push if BLOCKER/CRITICAL/HIGH
# issues are found in SonarCloud for the API project. On failure, shows first 20 issues.
#
# Requires: SONAR_TOKEN (SonarCloud → My Account → Security)
# Usage: from repo root: ./scripts/sonar-analysis/pre-push-sonar-check.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_PROJECT_KEY="KarmaCummunity_KC-MVP-server"
SONAR_LOG=$(mktemp)
trap 'rm -f "$SONAR_LOG"' EXIT

cd "$REPO_ROOT"

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "⚠️  SONAR_TOKEN not set - skipping pre-push Sonar check."
  echo "   Set SONAR_TOKEN to run Sonar locally and block push on BLOCKER/CRITICAL/HIGH issues."
  echo "   Get token: SonarCloud → My Account → Security"
  exit 0
fi

echo ""
echo "Running Sonar scan for API (tests + sonar-scanner)..."
echo ""

cd apps/api
if ! npm run sonar:local > "$SONAR_LOG" 2>&1; then
  cd "$REPO_ROOT"
  echo ""
  echo "Sonar scan or Quality Gate failed. Showing first 20 BLOCKER/CRITICAL/HIGH issues:"
  echo ""
  export SONAR_TOKEN
  node scripts/sonar-analysis/check-sonar-blocker-critical.js "$API_PROJECT_KEY" || true
  echo ""
  echo "❌ Push blocked. Fix the issues above or use: git push --no-verify"
  exit 1
fi
cd "$REPO_ROOT"

echo ""
echo "Checking SonarCloud for BLOCKER/CRITICAL/HIGH issues..."
echo ""

export SONAR_TOKEN
if node scripts/sonar-analysis/check-sonar-blocker-critical.js "$API_PROJECT_KEY"; then
  echo "✅ No BLOCKER/CRITICAL/HIGH issues - safe to push."
  exit 0
else
  echo ""
  echo "❌ Push blocked: fix the issues above (first 20 shown) or use: git push --no-verify"
  exit 1
fi
