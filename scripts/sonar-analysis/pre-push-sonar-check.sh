#!/usr/bin/env bash
# =============================================================================
# Pre-push Sonar check: run Sonar locally and block push if BLOCKER/CRITICAL
# issues are found in SonarCloud for the API project.
#
# Requires: SONAR_TOKEN (SonarCloud → My Account → Security)
# Usage: from repo root: ./scripts/sonar-analysis/pre-push-sonar-check.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_PROJECT_KEY="KarmaCummunity_KC-MVP-server"

cd "$REPO_ROOT"

if [[ -z "${SONAR_TOKEN:-}" ]]; then
  echo "⚠️  SONAR_TOKEN not set - skipping pre-push Sonar check."
  echo "   Set SONAR_TOKEN to run Sonar locally and block push on BLOCKER/CRITICAL issues."
  echo "   Get token: SonarCloud → My Account → Security"
  exit 0
fi

echo ""
echo "Running Sonar scan for API (tests + sonar-scanner)..."
echo ""

cd apps/api
npm run sonar:local
cd "$REPO_ROOT"

echo ""
echo "Checking SonarCloud for BLOCKER/CRITICAL issues..."
echo ""

export SONAR_TOKEN
if node scripts/sonar-analysis/check-sonar-blocker-critical.js "$API_PROJECT_KEY"; then
  echo "✅ No BLOCKER/CRITICAL issues - safe to push."
  exit 0
else
  echo ""
  echo "❌ Push blocked: fix BLOCKER/CRITICAL issues above or use: git push --no-verify"
  exit 1
fi
