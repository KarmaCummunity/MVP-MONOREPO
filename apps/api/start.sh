#!/bin/sh
echo "=================================================="
echo "🚀 STARTUP WRAPPER SCRIPT INITIATED"
echo "⏰ Time: $(date)"
echo "📍 PWD: $(pwd)"
echo "👤 User: $(whoami)"
echo "📦 Node: $(node --version)"
echo "=================================================="

# Print all env vars (careful with secrets in real logs, but we need debug now)
# echo "--- ENV VARS (Sanitized) ---"
# env | grep -v "KEY" | grep -v "SECRET" | grep -v "PASSWORD"
# echo "----------------------------"

echo "👉 Checking for minimal-server.js..."
ls -l minimal-server.js

echo "👉 Starting node process..."
node minimal-server.js &
PID=$!
echo "✅ Node process started with PID: $PID"

wait $PID
EXIT_CODE=$?
echo "❌ Node process exited with code: $EXIT_CODE"
exit $EXIT_CODE
