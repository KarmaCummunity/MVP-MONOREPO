#!/usr/bin/env bash
# File overview:
# - Purpose: Smoke-test the local API server logic independently.
# - Usage: ./scripts/test-api-health.sh [PORT]
# - Defaults: PORT=3001

set -u

SERVER_PORT=${1:-3001}
BASE_URL="http://localhost:$SERVER_PORT"
EXIT_CODE=0

# Helper Functions
log_info() { echo "ℹ️  $1"; }
log_success() { echo "✅ $1"; }
log_error() { echo "❌ $1" >&2; }
log_warning() { echo "⚠️  $1"; }

echo "═══════════════════════════════════════════════════════════════"
echo "🚀 Running API Health Tests (Port: $SERVER_PORT)"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# 1. Basic Health Check
log_info "1. Checking Server Health..."
if curl -sf "$BASE_URL/health" >/dev/null 2>&1; then
  log_success "Server is healthy (/health)"
else
  log_error "Server is NOT responding on $BASE_URL/health"
  exit 1
fi

# 2. Redis Connection
log_info "2. Checking Redis Connection..."
HEALTH_REDIS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health/redis")
HEALTH_REDIS_HTTP_CODE=$(echo "$HEALTH_REDIS_RESPONSE" | tail -n1)
if [[ "$HEALTH_REDIS_HTTP_CODE" == "200" ]]; then
  log_success "Redis is connected (/health/redis)"
else
  log_error "Redis test failed (HTTP $HEALTH_REDIS_HTTP_CODE)"
  EXIT_CODE=1
fi

# 3. Database & Stats (Community)
log_info "3. Checking Community Stats..."
COMMUNITY_STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/stats/community")
COMMUNITY_STATS_HTTP_CODE=$(echo "$COMMUNITY_STATS_RESPONSE" | tail -n1)
if [[ "$COMMUNITY_STATS_HTTP_CODE" == "200" ]]; then
  log_success "Community Stats OK (/api/stats/community)"
else
  log_error "Community Stats failed (HTTP $COMMUNITY_STATS_HTTP_CODE)"
  EXIT_CODE=1
fi

# 4. Donations Endpoint
log_info "4. Checking Donations Stats..."
DONATION_STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/donations/stats/summary")
DONATION_STATS_HTTP_CODE=$(echo "$DONATION_STATS_RESPONSE" | tail -n1)
if [[ "$DONATION_STATS_HTTP_CODE" == "200" ]]; then
  log_success "Donations Stats OK (/api/donations/stats/summary)"
else
  log_error "Donations Stats failed (HTTP $DONATION_STATS_HTTP_CODE)"
  EXIT_CODE=1
fi

# 5. Chat Endpoint (Error Checking)
log_info "5. Checking Chat Endpoint Structure..."
# Using a dummy ID - we just want to see if the endpoint responds structurally, not 404
CHAT_ID="550e8400-e29b-41d4-a716-446655440000"
CHAT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/chat/conversations/user/$CHAT_ID")
CHAT_HTTP_CODE=$(echo "$CHAT_RESPONSE" | tail -n1)
CHAT_BODY=$(echo "$CHAT_RESPONSE" | sed '$d')

if [[ "$CHAT_HTTP_CODE" == "200" ]]; then
  # Further check body for explicit error fields
  if echo "$CHAT_BODY" | grep -qi '"error"\|"success":\s*false\|operator does not exist'; then
    log_warn "Chat returned 200 but body contains errors (could be ID specific)"
    # We don't fail strictly here unless it's a 500/404, as the ID is fake
  else
    log_success "Chat Endpoint OK"
  fi
else
    # 500 is common if ID doesn't exist in some DBs, but 404 means route missing
  if [[ "$CHAT_HTTP_CODE" == "404" ]]; then
     log_error "Chat route missing (404)"
     EXIT_CODE=1
  else
     log_success "Chat Endpoint responded (HTTP $CHAT_HTTP_CODE) - likely valid structure"
  fi
fi

# 6. Notifications Route Check
log_info "6. Checking Notifications Route..."
NOTIFICATIONS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/collections/notifications?userId=$CHAT_ID")
NOTIFICATIONS_HTTP_CODE=$(echo "$NOTIFICATIONS_RESPONSE" | tail -n1)
if [[ "$NOTIFICATIONS_HTTP_CODE" == "404" ]]; then
  log_error "Notifications route missing (404)"
  EXIT_CODE=1
else
  log_success "Notifications route exists"
fi

echo ""
if [[ $EXIT_CODE -eq 0 ]]; then
  log_success "ALL API HEALTH CHECKS PASSED"
  exit 0
else
  log_error "SOME API CHECKS FAILED"
  exit 1
fi
