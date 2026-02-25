#!/bin/bash
# =============================================================================
# Snyk Delta Check - Only New Issues
# =============================================================================
# This script compares current Snyk scan with baseline to find only NEW issues
# 
# Usage: ./scripts/check-snyk-delta.sh
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BASELINE_FILE="$PROJECT_DIR/.snyk-baseline.json"
CURRENT_FILE="$PROJECT_DIR/.snyk-current.json"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Snyk Delta Check - Detecting Only New Issues${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""

cd "$PROJECT_DIR"

# Check if snyk is installed
if ! command -v snyk >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Snyk CLI not installed${NC}"
    echo "Install with: npm install -g snyk"
    exit 0
fi

# Check if authenticated
if [ -z "$SNYK_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  SNYK_TOKEN not set${NC}"
    echo "Run: snyk auth"
    exit 0
fi

# =============================================================================
# 1. Run Current Scan
# =============================================================================
echo "Running Snyk scan..."

# Scan dependencies
snyk test --json > "$CURRENT_FILE" 2>&1 || true

# Scan code (SAST)
snyk code test --json > "${CURRENT_FILE}.code" 2>&1 || true

# =============================================================================
# 2. Compare with Baseline
# =============================================================================
if [ ! -f "$BASELINE_FILE" ]; then
    echo -e "${YELLOW}⚠️  No baseline found - creating baseline${NC}"
    cp "$CURRENT_FILE" "$BASELINE_FILE"
    
    # Count issues in baseline
    if command -v jq >/dev/null 2>&1; then
        TOTAL_ISSUES=$(jq '[.vulnerabilities[]? | select(.severity == "high" or .severity == "critical")] | length' "$BASELINE_FILE")
        echo -e "${BLUE}Baseline created with $TOTAL_ISSUES high/critical issues${NC}"
        echo "This will be used to detect new issues in future scans"
    fi
    
    exit 0
fi

echo "Comparing with baseline..."

if ! command -v jq >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  jq not installed - cannot compare JSON${NC}"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 0
fi

# Extract high/critical vulnerabilities from baseline
BASELINE_ISSUES=$(jq -r '[.vulnerabilities[]? | select(.severity == "high" or .severity == "critical") | .id] | sort | unique | .[]' "$BASELINE_FILE" 2>/dev/null || echo "")

# Extract high/critical vulnerabilities from current scan
CURRENT_ISSUES=$(jq -r '[.vulnerabilities[]? | select(.severity == "high" or .severity == "critical") | .id] | sort | unique | .[]' "$CURRENT_FILE" 2>/dev/null || echo "")

# Find new issues (in current but not in baseline)
NEW_ISSUES=$(comm -13 <(echo "$BASELINE_ISSUES" | sort) <(echo "$CURRENT_ISSUES" | sort))

# =============================================================================
# 3. Report Results
# =============================================================================
BASELINE_COUNT=$(echo "$BASELINE_ISSUES" | grep -c "SNYK-" || echo "0")
CURRENT_COUNT=$(echo "$CURRENT_ISSUES" | grep -c "SNYK-" || echo "0")
NEW_COUNT=$(echo "$NEW_ISSUES" | grep -c "SNYK-" || echo "0")

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Results:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Baseline high/critical issues: $BASELINE_COUNT"
echo "Current high/critical issues:  $CURRENT_COUNT"
echo "New high/critical issues:      $NEW_COUNT"
echo ""

if [ "$NEW_COUNT" -gt 0 ]; then
    echo -e "${RED}❌ Found $NEW_COUNT new high/critical security issue(s):${NC}"
    echo ""
    
    # Show details of new issues
    for issue_id in $NEW_ISSUES; do
        ISSUE_DETAIL=$(jq -r ".vulnerabilities[]? | select(.id == \"$issue_id\") | \"\(.severity | ascii_upcase): \(.title) - \(.packageName)@\(.version)\"" "$CURRENT_FILE" | head -1)
        echo -e "  ${RED}•${NC} $ISSUE_DETAIL"
        echo -e "    ID: $issue_id"
    done
    
    echo ""
    echo -e "${YELLOW}Run 'snyk test' for full details${NC}"
    echo -e "${YELLOW}Run 'snyk wizard' for guided fixes${NC}"
    
    # Cleanup
    rm -f "$CURRENT_FILE" "${CURRENT_FILE}.code"
    
    exit 1
else
    if [ "$CURRENT_COUNT" -eq 0 ]; then
        echo -e "${GREEN}✅ No high/critical security vulnerabilities${NC}"
    else
        echo -e "${GREEN}✅ No NEW high/critical vulnerabilities${NC}"
        echo -e "${BLUE}ℹ️  Baseline issues remain but no new issues introduced${NC}"
    fi
    
    # Cleanup
    rm -f "$CURRENT_FILE" "${CURRENT_FILE}.code"
    
    exit 0
fi
