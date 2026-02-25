#!/bin/sh
# Restore placeholders in index.html after build (for next build)

set -e

echo "Restoring build placeholders in web/index.html..."

# Restore web/index.html template placeholders
if [ -f "web/index.html" ]; then
  # Alpine Linux uses BusyBox sed (no -i with backup)
  sed -i 's/content="[0-9]*"/content="__BUILD_TIMESTAMP__"/g' "web/index.html"
  sed -i 's/<meta name="app-version" content="[^"]*" \/>/<meta name="app-version" content="__APP_VERSION__" \/>/g' "web/index.html"
  echo "✓ Placeholders restored in web/index.html"
fi

echo "Placeholders restored successfully!"

