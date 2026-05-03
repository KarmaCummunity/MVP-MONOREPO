#!/bin/bash

# סקריפט מהיר לבדיקת Redis בפרודקשן דרך API

echo "═══════════════════════════════════════════════════════════"
echo "🔍 בודק Redis בפרודקשן דרך Health Endpoint"
echo "═══════════════════════════════════════════════════════════"
echo ""

# רשימת URLs אפשריים לבדיקה
URLS=(
  "https://kc-mvp-server-production.up.railway.app"
  "https://api.karma-community-kc.com"
  "https://karma-community-kc.com/api"
)

echo "📍 מנסה למצוא את ה-production server..."
echo ""

for URL in "${URLS[@]}"; do
  echo "🔍 בודק: $URL"
  
  # בדיקת health כללי
  HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/health" 2>/dev/null)
  HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
  BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ שרת מגיב (200 OK)"
    echo "   📦 תגובה: $BODY"
    
    # בדיקת Redis health
    echo ""
    echo "   🔍 בודק Redis health..."
    REDIS_RESPONSE=$(curl -s -w "\n%{http_code}" "$URL/health/redis" 2>/dev/null)
    REDIS_CODE=$(echo "$REDIS_RESPONSE" | tail -1)
    REDIS_BODY=$(echo "$REDIS_RESPONSE" | sed '$d')
    
    if [ "$REDIS_CODE" = "200" ]; then
      echo "   ✅ Redis endpoint מגיב (200 OK)"
      echo "   📦 תגובה: $REDIS_BODY"
      
      # בדיקה אם Redis עובד או לא
      if echo "$REDIS_BODY" | grep -q '"ok":true'; then
        echo ""
        echo "   ═══════════════════════════════════════"
        echo "   ✅ Redis עובד תקין בפרודקשן!"
        echo "   ═══════════════════════════════════════"
      elif echo "$REDIS_BODY" | grep -q '"ok":false'; then
        ERROR=$(echo "$REDIS_BODY" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
        echo ""
        echo "   ═══════════════════════════════════════"
        echo "   ❌ Redis לא עובד!"
        echo "   📝 שגיאה: $ERROR"
        echo "   ═══════════════════════════════════════"
      fi
    else
      echo "   ⚠️  Redis endpoint לא מגיב כראוי (HTTP $REDIS_CODE)"
    fi
    
    echo ""
    echo "─────────────────────────────────────────────────────────"
    break
  else
    echo "   ❌ שרת לא מגיב (HTTP $HTTP_CODE)"
  fi
  echo ""
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "💡 כדי לראות logs מלאים ב-Railway:"
echo "   1. פתח https://railway.app"
echo "   2. בחר adventurous-contentment"
echo "   3. בחר סביבת production (למעלה)"
echo "   4. פתח את השירות"
echo "   5. Deployments → View Logs"
echo "   6. חפש: 'Redis' או 'REDIS_URL'"
echo ""

