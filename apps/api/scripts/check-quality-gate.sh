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

set -e  # Exit on error

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

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Quality Gate Check - Local Validation               ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Track overall status
ISSUES_FOUND=0

# =============================================================================
# Function: Print section header
# =============================================================================
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# Function: Check if command exists
# =============================================================================
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

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${GREEN}✅ No TypeScript files changed${NC}"
    CHANGED_FILE_COUNT=0
else
    CHANGED_FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
    echo -e "${GREEN}Found $CHANGED_FILE_COUNT changed TypeScript file(s):${NC}"
    echo "$CHANGED_FILES" | sed 's/^/  - /'
fi

# =============================================================================
# 2. ESLint Check - Only Changed Files
# =============================================================================
print_header "2️⃣  Running ESLint on Changed Files"

if [ "$CHANGED_FILE_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ Skipping - no files to check${NC}"
else
    echo "Running ESLint..."
    
    # Convert changed files to space-separated list
    FILES_TO_LINT=$(echo "$CHANGED_FILES" | tr '\n' ' ')
    
    if npm run lint -- $FILES_TO_LINT 2>&1; then
        echo -e "${GREEN}✅ ESLint passed - no issues in changed files${NC}"
    else
        echo -e "${RED}❌ ESLint found issues in changed files${NC}"
        echo -e "${YELLOW}Run 'npm run lint -- --fix' to auto-fix some issues${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

# =============================================================================
# 3. TypeScript Compilation Check
# =============================================================================
print_header "3️⃣  Checking TypeScript Compilation"

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ TypeScript compilation successful${NC}"
else
    echo -e "${RED}❌ TypeScript compilation failed${NC}"
    echo "Run 'npm run build' to see detailed errors"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# =============================================================================
# 4. Run Tests
# =============================================================================
print_header "4️⃣  Running Tests"

export NODE_ENV=test
export JWT_SECRET="test-jwt-secret-32-chars-minimum!!"
export GOOGLE_CLIENT_ID="test-google-client-id"
export EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="test-web-client-id"

if npm run test:cov > /dev/null 2>&1; then
    echo -e "${GREEN}✅ All tests passed${NC}"
    
    # Show coverage summary if available
    if [ -f "coverage/coverage-summary.json" ]; then
        echo ""
        echo "Coverage Summary:"
        if command_exists jq; then
            jq -r '.total | "  Lines: \(.lines.pct)% | Statements: \(.statements.pct)% | Functions: \(.functions.pct)% | Branches: \(.branches.pct)%"' coverage/coverage-summary.json
        fi
    fi
else
    echo -e "${RED}❌ Tests failed${NC}"
    echo "Run 'npm test' to see detailed errors"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# =============================================================================
# 5. Snyk Security Check (if available)
# =============================================================================
print_header "5️⃣  Checking for Security Vulnerabilities (Snyk)"

if ! command_exists snyk; then
    echo -e "${YELLOW}⚠️  Snyk CLI not installed - skipping security scan${NC}"
    echo "Install with: npm install -g snyk"
elif [ -z "$SNYK_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SNYK_TOKEN not set - skipping authenticated scan${NC}"
    echo "Set SNYK_TOKEN environment variable or run: snyk auth"
else
    echo "Running Snyk security scan..."
    
    # Run Snyk test with high severity threshold
    if snyk test --severity-threshold=high --fail-on=upgradable 2>&1; then
        echo -e "${GREEN}✅ No high/critical security vulnerabilities found${NC}"
    else
        echo -e "${RED}❌ High/critical security vulnerabilities found${NC}"
        echo -e "${YELLOW}Run 'snyk test' for detailed report${NC}"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
    
    # Run Snyk Code (SAST)
    if snyk code test --severity-threshold=high 2>&1 | grep -q "✗"; then
        echo -e "${YELLOW}⚠️  Snyk Code found potential security issues${NC}"
        echo "Run 'snyk code test' for detailed report"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
fi

# =============================================================================
# 6. Check for Sensitive Data
# =============================================================================
print_header "6️⃣  Scanning for Sensitive Data"

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

if [ $SENSITIVE_FOUND -eq 1 ]; then
    echo -e "${RED}❌ Potential sensitive data found in changed files${NC}"
    echo -e "${YELLOW}Please remove hardcoded secrets before committing${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ No sensitive data detected${NC}"
fi

# =============================================================================
# 7. Check TODO Comments in Changed Files
# =============================================================================
print_header "7️⃣  Checking for TODO Comments"

if [ "$CHANGED_FILE_COUNT" -eq 0 ]; then
    TODO_COUNT=0
else
    TODO_COUNT=$(echo "$CHANGED_FILES" | xargs grep -n "TODO\|FIXME\|XXX\|HACK" 2>/dev/null | wc -l | tr -d ' ')
fi

if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments in changed files${NC}"
    echo "$CHANGED_FILES" | xargs grep -n "TODO\|FIXME\|XXX\|HACK" 2>/dev/null | head -5
    if [ "$TODO_COUNT" -gt 5 ]; then
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

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Quality Gate PASSED${NC}"
    echo ""
    echo -e "${GREEN}All checks passed successfully:${NC}"
    echo -e "  ✅ No new linting errors"
    echo -e "  ✅ No compilation errors"
    echo -e "  ✅ All tests passing"
    echo -e "  ✅ No new security vulnerabilities"
    echo -e "  ✅ No sensitive data detected"
    echo ""
    echo -e "${GREEN}Your code is ready to push! 🚀${NC}"
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
fi
