#!/bin/bash
# Start Expo with completely clean cache

echo "🧹 Cleaning all caches..."
rm -rf .expo
rm -rf dist
rm -rf node_modules/.cache
watchman watch-del-all 2>/dev/null || true

echo "🚀 Starting Expo with clean cache..."
echo "   Dev server will start on http://localhost:8081"
echo ""
npx expo start --web --clear --port 8081

