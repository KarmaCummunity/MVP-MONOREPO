#!/bin/bash

# Script to display users and chats data from the database
# Usage: ./scripts/show-db-data.sh

echo "📊 הצגת נתונים מהדאטה בייס - יוזרים וצ'אטים"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker לא פועל. אנא הפעל את Docker Desktop תחילה.${NC}"
    exit 1
fi

# Check if postgres container is running
if ! docker-compose ps postgres | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  קונטיינר PostgreSQL לא פועל. מנסה להפעיל...${NC}"
    docker-compose up -d postgres
    sleep 3
fi

echo -e "${GREEN}✅ מתחבר לדאטה בייס...${NC}"
echo ""

# Function to run SQL query
run_query() {
    local query="$1"
    local title="$2"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}📋 $title${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    docker-compose exec -T postgres psql -U kc -d kc_db -c "$query"
    
    echo ""
}

# 1. Users data
run_query "
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
    SUM(karma_points) as total_karma_points,
    AVG(karma_points)::INTEGER as avg_karma_points
FROM user_profiles;
" "📊 סטטיסטיקות יוזרים - סיכום כללי"

run_query "
SELECT 
    id,
    name,
    email,
    city,
    karma_points,
    is_active,
    join_date,
    last_active,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 20;
" "👥 יוזרים - 20 האחרונים"

# 2. Chat conversations
run_query "
SELECT 
    COUNT(*) as total_conversations,
    COUNT(CASE WHEN type = 'direct' THEN 1 END) as direct_chats,
    COUNT(CASE WHEN type = 'group' THEN 1 END) as group_chats
FROM chat_conversations;
" "💬 סטטיסטיקות שיחות - סיכום כללי"

run_query "
SELECT 
    cc.id,
    cc.title,
    cc.type,
    array_length(cc.participants, 1) as participants_count,
    cc.participants,
    cc.last_message_at,
    cc.created_at,
    cm.content as last_message_content,
    cm.sender_id as last_sender_id
FROM chat_conversations cc
LEFT JOIN chat_messages cm ON cc.last_message_id = cm.id
ORDER BY cc.last_message_at DESC NULLS LAST
LIMIT 20;
" "💬 שיחות - 20 האחרונות"

# 3. Chat messages
run_query "
SELECT 
    COUNT(*) as total_messages,
    COUNT(CASE WHEN message_type = 'text' THEN 1 END) as text_messages,
    COUNT(CASE WHEN message_type = 'image' THEN 1 END) as image_messages,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_messages
FROM chat_messages;
" "📨 סטטיסטיקות הודעות - סיכום כללי"

run_query "
SELECT 
    cm.id,
    cm.conversation_id,
    cm.sender_id,
    LEFT(cm.content, 50) as message_preview,
    cm.message_type,
    cm.is_deleted,
    cm.created_at
FROM chat_messages cm
WHERE cm.is_deleted = false
ORDER BY cm.created_at DESC
LIMIT 20;
" "📨 הודעות - 20 האחרונות"

# 4. Messages per conversation
run_query "
SELECT 
    cc.id as conversation_id,
    cc.title,
    cc.type,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_time
FROM chat_conversations cc
LEFT JOIN chat_messages cm ON cc.id = cm.conversation_id
GROUP BY cc.id, cc.title, cc.type
ORDER BY message_count DESC, last_message_time DESC NULLS LAST
LIMIT 20;
" "📊 שיחות לפי מספר הודעות"

# 5. Active users in chats
run_query "
SELECT 
    up.id,
    up.name,
    up.email,
    COUNT(DISTINCT cc.id) as conversations_count,
    COUNT(cm.id) as messages_sent
FROM user_profiles up
LEFT JOIN chat_conversations cc ON up.id = ANY(cc.participants)
LEFT JOIN chat_messages cm ON up.id = cm.sender_id
GROUP BY up.id, up.name, up.email
HAVING COUNT(DISTINCT cc.id) > 0 OR COUNT(cm.id) > 0
ORDER BY messages_sent DESC, conversations_count DESC
LIMIT 20;
" "👤 יוזרים פעילים בצ'אטים"

# 6. Read receipts statistics
run_query "
SELECT 
    COUNT(*) as total_read_receipts,
    COUNT(DISTINCT message_id) as messages_read,
    COUNT(DISTINCT user_id) as users_who_read
FROM message_read_receipts;
" "✅ סטטיסטיקות אישורי קריאה"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ סיום הצגת הנתונים${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"





