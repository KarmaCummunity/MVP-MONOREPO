#!/usr/bin/env bash
# =============================================================================
# Pre-push Sonar check: run Sonar locally and block push only if BLOCKER/CRITICAL/HIGH
# issues exist in SonarCloud for the API project. Quality Gate failures (e.g. coverage)
# do not block when there are no blocking issues.
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
SONAR_LOCAL_EXIT=0
npm run sonar:local > "$SONAR_LOG" 2>&1 || SONAR_LOCAL_EXIT=$?
cd "$REPO_ROOT"

echo ""
echo "Checking SonarCloud for BLOCKER/CRITICAL/HIGH issues..."
echo ""

export SONAR_TOKEN
if node scripts/sonar-analysis/check-sonar-blocker-critical.js "$API_PROJECT_KEY"; then
  if [[ "$SONAR_LOCAL_EXIT" -ne 0 ]]; then
    echo ""
    echo "⚠️  Sonar scan or Quality Gate failed (no BLOCKER/CRITICAL/HIGH issues - push allowed)."
    echo "   Last 40 lines of scan output:"
    echo "   ---"
    tail -n 40 "$SONAR_LOG" | sed 's/^/   /'
    echo "   ---"
    echo "   Consider fixing the above (e.g. tests, coverage) or run: git push --no-verify to skip this check."
  else
    echo "✅ No BLOCKER/CRITICAL/HIGH issues - safe to push."
  fi
  exit 0
else
  echo ""
  echo "❌ Push blocked by Sonar. Fix the issues above or use: git push --no-verify"
  exit 1
fi
