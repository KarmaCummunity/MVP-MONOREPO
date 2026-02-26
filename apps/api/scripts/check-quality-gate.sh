#!/bin/bash
# =============================================================================
# Quality Gate Check Script
# =============================================================================
# This script runs all quality checks locally before pushing code
# It mimics the CI/CD quality gate to catch issues early
#
# Usage: ./scripts/check-quality-gate.sh [base-branch]
# Example: ./scripts/check-quality-gate.sh main
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_BRANCH="${1:-main}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_LINES_ON_FAIL=40

# Load .env from project dir so SNYK_TOKEN and other vars are available
if [[ -f "$PROJECT_DIR/.env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "$PROJECT_DIR/.env"
    set +a
fi
TMP_OUTPUT=$(mktemp)
trap 'rm -f "$TMP_OUTPUT"' EXIT

# Track passed steps (to show on first failure)
PASSED_STEPS=()
ISSUES_FOUND=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Quality Gate Check - Local Validation               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# =============================================================================
# Run a check: on success add to PASSED_STEPS and print one line; on failure
# print passed checks, then failed check name, then output and exit 1.
# =============================================================================
run_check() {
    local step_name="$1"
    shift
    if "$@" > "$TMP_OUTPUT" 2>&1; then
        PASSED_STEPS+=("$step_name")
        echo -e "${GREEN}✅ $step_name${NC}"
        return 0
    else
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  FAILURE SUMMARY${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        if [[ ${#PASSED_STEPS[@]} -gt 0 ]]; then
            echo -e "${GREEN}Passed (${#PASSED_STEPS[@]}):${NC}"
            printf '  ✅ %s\n' "${PASSED_STEPS[@]}"
            echo ""
        fi
        echo -e "${RED}Failed: $step_name${NC}"
        echo ""
        echo -e "${YELLOW}--- Output (last ${LOG_LINES_ON_FAIL} lines) ---${NC}"
        tail -n "$LOG_LINES_ON_FAIL" "$TMP_OUTPUT" | sed 's/^/  /'
        echo -e "${YELLOW}---${NC}"
        echo ""
        echo "To fix: run the failing step manually (e.g. npm run lint, npm run typecheck, npm run build, npm test)."
        echo "To skip this check (not recommended): git push --no-verify"
        exit 1
    fi
}

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# =============================================================================
# 1. Get Changed Files
# =============================================================================
print_header "1️⃣  Detecting Changed Files"

cd "$PROJECT_DIR"

# Ensure we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

# Get the current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo "Base branch: $BASE_BRANCH"

# Get changed files compared to base branch
if git rev-parse --verify "$BASE_BRANCH" >/dev/null 2>&1; then
    CHANGED_FILES=$(git diff --name-only --diff-filter=ACMRT "$BASE_BRANCH"...HEAD | grep '\.ts$' | grep -v '\.spec\.ts$' | grep '^src/' || true)
else
    echo -e "${YELLOW}⚠️  Base branch '$BASE_BRANCH' not found locally. Using uncommitted changes.${NC}"
    CHANGED_FILES=$(git diff --name-only HEAD | grep '\.ts$' | grep -v '\.spec\.ts$' | grep '^src/' || true)
fi

if [[ -z "$CHANGED_FILES" ]]; then
    echo -e "${GREEN}✅ No TypeScript files changed${NC}"
    CHANGED_FILE_COUNT=0
else
    CHANGED_FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
    echo -e "${GREEN}Found $CHANGED_FILE_COUNT changed TypeScript file(s):${NC}"
    echo "$CHANGED_FILES" | sed 's/^/  - /'
fi

# =============================================================================
# 2. ESLint - Full Project
# =============================================================================
print_header "2️⃣  ESLint (full project)"
run_check "ESLint (full project)" npm run lint

# =============================================================================
# 3. TypeScript Check (noEmit)
# =============================================================================
print_header "3️⃣  TypeScript (noEmit)"
run_check "TypeScript (noEmit)" npm run typecheck

# =============================================================================
# 4. TypeScript Compilation
# =============================================================================
print_header "4️⃣  TypeScript compilation"
run_check "TypeScript compilation" npm run build

# =============================================================================
# 5. Run Tests
# =============================================================================
print_header "5️⃣  Tests"
export NODE_ENV=test
export JWT_SECRET="test-jwt-secret-32-chars-minimum!!"
export GOOGLE_CLIENT_ID="test-google-client-id"
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="test-web-client-id"
run_check "Tests" npm run test:cov
if [[ -f "coverage/coverage-summary.json" ]] && command_exists jq; then
    echo "  Coverage: $(jq -r '.total | "Lines \(.lines.pct)% | Branches \(.branches.pct)%"' coverage/coverage-summary.json)"
fi

# =============================================================================
# 6. Snyk Security Check (if available)
# Uses SNYK_TOKEN if set (CI), otherwise Snyk CLI config from `snyk auth` (local).
# To get a token: https://app.snyk.io/account → Personal access tokens
# =============================================================================
print_header "6️⃣  Snyk (security)"

if ! command_exists snyk; then
    echo -e "${YELLOW}⏭️  Snyk CLI not installed - skipped${NC}"
elif [[ -z "$SNYK_TOKEN" ]] && ! snyk whoami &>/dev/null; then
    echo -e "${YELLOW}⏭️  Snyk not authenticated - run 'snyk auth' or set SNYK_TOKEN (see app.snyk.io/account) - skipped${NC}"
else
    run_check "Snyk" bash -c "snyk test --severity-threshold=high --fail-on=upgradable && (! snyk code test --severity-threshold=high 2>&1 | grep -q '✗')"
fi

# =============================================================================
# 7. Check for Sensitive Data
# =============================================================================
print_header "7️⃣  Scanning for Sensitive Data"

if [[ "$CHANGED_FILE_COUNT" -eq 0 ]]; then
    echo -e "${GREEN}✅ Skipping - no files to check${NC}"
else
    SENSITIVE_PATTERNS=(
        "password.*=.*['\"][^'\"]{8,}"
        "api[_-]?key.*=.*['\"][^'\"]{8,}"
        "secret.*=.*['\"][^'\"]{8,}"
        "token.*=.*['\"][^'\"]{20,}"
        "BEGIN.*PRIVATE.*KEY"
    )

    SENSITIVE_FOUND=0
    for pattern in "${SENSITIVE_PATTERNS[@]}"; do
        if echo "$CHANGED_FILES" | xargs grep -iE "$pattern" 2>/dev/null; then
            SENSITIVE_FOUND=1
        fi
    done

    if [[ $SENSITIVE_FOUND -eq 1 ]]; then
        echo -e "${RED}❌ Potential sensitive data found in changed files${NC}"
        echo -e "${YELLOW}Please remove hardcoded secrets before committing${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No sensitive data detected${NC}"
    fi
fi

# =============================================================================
# 8. Check TODO Comments in Changed Files
# =============================================================================
print_header "8️⃣  Checking for TODO Comments"

if [[ "$CHANGED_FILE_COUNT" -eq 0 ]]; then
    TODO_COUNT=0
else
    TODO_COUNT=$(echo "$CHANGED_FILES" | xargs grep -n "TODO\|FIXME\|XXX\|HACK" 2>/dev/null | wc -l | tr -d ' ')
fi

if [[ "$TODO_COUNT" -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments in changed files${NC}"
    echo "$CHANGED_FILES" | xargs grep -n "TODO\|FIXME\|XXX\|HACK" 2>/dev/null | head -5
    if [[ "$TODO_COUNT" -gt 5 ]]; then
        echo "  ... and $((TODO_COUNT - 5)) more"
    fi
else
    echo -e "${GREEN}✅ No TODO comments in changed files${NC}"
fi

# =============================================================================
# Final Summary
# =============================================================================
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                        FINAL SUMMARY                           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ $ISSUES_FOUND -eq 0 ]]; then
    echo -e "${GREEN}✅ Quality Gate PASSED${NC}"
    echo ""
    echo -e "${GREEN}All checks passed successfully:${NC}"
    echo -e "  ✅ ESLint (full project)"
    echo -e "  ✅ TypeScript (noEmit)"
    echo -e "  ✅ No compilation errors"
    echo -e "  ✅ All tests passing"
    echo -e "  ✅ No new security vulnerabilities"
    echo -e "  ✅ No sensitive data detected"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Quality Gate FAILED${NC}"
    echo ""
    echo -e "${RED}Found $ISSUES_FOUND issue(s) that need to be fixed:${NC}"
    echo ""
    echo -e "${YELLOW}Please fix the issues above before pushing your code.${NC}"
    echo ""
    echo "Common fixes:"
    echo "  • Linting: npm run lint -- --fix"
    echo "  • Tests: npm test"
    echo "  • Security: snyk test"
    echo ""
    exit 1
    echo -e "${GREEN}Your code is ready to push! 🚀${NC}"

fi
