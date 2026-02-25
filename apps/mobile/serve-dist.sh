#!/bin/bash
echo "🌐 Serving production build from dist/ on http://localhost:8080"
echo "   This is what Railway will serve in production"
echo ""
python3 -m http.server 8080 --directory dist
