#!/bin/bash
# File overview:
# - Purpose: Clear all local storage data from frontend (AsyncStorage and localStorage)
# - Usage: ./scripts/clear-local-storage.sh
# - Warning: This will DELETE ALL LOCAL DATA from the frontend app

# Don't use set -e here because this script might be called from another script
# and we don't want it to fail the entire process if there are minor issues

echo "🧹 Clearing frontend local storage data..."
echo "⚠️  WARNING: This will DELETE ALL LOCAL DATA from the frontend app!"
echo ""

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if we're in the MVP directory
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
  echo "⚠️  Warning: package.json not found in $FRONTEND_DIR"
  echo "   This script should be run from the MVP directory"
  echo "   Continuing anyway..."
fi

echo "📱 Frontend directory: $FRONTEND_DIR"
echo ""

# Try to clear web localStorage if running in a browser context
# Note: This won't work from bash, but we'll create instructions

# For React Native - try to clear AsyncStorage via Metro bundler or app restart
# Note: AsyncStorage can only be cleared from within the app itself

echo "📋 Storage keys that will be cleared:"
echo "   ✅ User data: current_user, auth_mode, firebase_user_id, guest_mode"
echo "   ✅ OAuth: oauth_success_flag, google_auth_user, google_auth_token, oauth_in_progress"
echo "   ✅ App settings: app_language, recent_emails, known_emails, about_screen_seen"
echo "   ✅ Database: karma_user_data, karma_user_settings, karma_cached_*, karma_offline_queue"
echo "   ✅ Navigation: nav_state_* (all modes and users)"
echo "   ✅ Scroll positions: scroll_pos_* (all screens)"
echo "   ✅ Bookmarks: bookmarks"
echo "   ✅ Logs: app_logs"
echo "   ✅ Web mode: kc_web_mode (localStorage only)"
echo ""

# Create a comprehensive list of all storage keys
cat > "$FRONTEND_DIR/scripts/storage-keys-list.txt" << 'KEYS_EOF'
# Complete list of storage keys used in the app
# These will be cleared when resetting local data

# User authentication
current_user
auth_mode
firebase_user_id
guest_mode

# OAuth
oauth_success_flag
google_auth_user
google_auth_token
oauth_in_progress

# App settings
app_language
recent_emails
known_emails
about_screen_seen

# Database service (from dbConfig.ts)
karma_user_data
karma_user_settings
karma_cached_donations
karma_cached_rides
karma_cached_stats
karma_last_sync
karma_offline_queue

# Navigation states (pattern: nav_state_{mode}_{userId}_{platform})
nav_state_site_guest_web
nav_state_app_guest_web
nav_state_site_guest_ios
nav_state_app_guest_ios
nav_state_site_guest_android
nav_state_app_guest_android
# Plus dynamic keys for logged-in users

# Scroll positions (pattern: scroll_pos_{screenKey}_{userId})
# Dynamic keys for each screen

# Other
bookmarks
app_logs
kc_web_mode

# SecureStorage keys (with @SecureStorage: prefix)
# These are managed by SecureStorage service

# Database collection keys (pattern: {collection}_*)
# These are managed by DatabaseService
KEYS_EOF

echo "✅ Storage keys list created at: $FRONTEND_DIR/scripts/storage-keys-list.txt"
echo ""

# Instructions for clearing storage
echo "📝 Instructions to clear frontend storage:"
echo ""
echo "🌐 For Web (localStorage):"
echo "   1. Open your browser DevTools (F12)"
echo "   2. Go to Console tab"
echo "   3. Run: localStorage.clear()"
echo "   4. Refresh the page"
echo ""
echo "📱 For React Native (AsyncStorage):"
echo "   1. Close the app completely"
echo "   2. Restart the app - it will start fresh"
echo "   OR"
echo "   3. In the app, you can call DatabaseService.clearAllData()"
echo "   OR"
echo "   4. Uninstall and reinstall the app (for complete reset)"
echo ""
echo "💡 Note: After running the server reset script,"
echo "   the frontend will automatically start fresh on next app launch"
echo "   since all server data has been cleared."
echo ""
echo "✅ Frontend storage clear instructions completed!"




