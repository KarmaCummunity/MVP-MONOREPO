/**
 * סקריפט לבדיקת חיבור Redis בפרודקשן
 * שימוש: npx ts-node check-redis-production.ts
 */

import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkRedisConnection() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🔍 בודק חיבור Redis בפרודקשן');
  console.log('═══════════════════════════════════════════════════════════\n');

  const redisUrl = process.env.REDIS_URL || process.env.REDIS_PUBLIC_URL;
  const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'unknown';

  console.log(`📍 סביבה: ${environment.toUpperCase()}`);
  
  if (!redisUrl) {
    console.error('❌ REDIS_URL לא מוגדר!');
    console.log('\n💡 הוסף REDIS_URL למשתני הסביבה ב-Railway:');
    console.log('   1. פתח את השירות ב-Railway Dashboard');
    console.log('   2. לך ל-Variables');
    console.log('   3. ודא שיש Redis plugin מחובר');
    process.exit(1);
  }

  // Mask password for display
  const maskedUrl = redisUrl.replace(/:([^@]+)@/, ':****@');
  console.log(`🔗 Redis URL: ${maskedUrl}\n`);

  // Check if URL looks like production or development
  if (redisUrl.includes('deQMolmzgWZsqeAkiEpZPFvejfGjenEm')) {
    console.log('✅ Redis URL נראה כמו של PRODUCTION (סיסמה: deQMolmzgWZ...)');
  } else if (redisUrl.includes('ggCVffISJOmdiIHAXBSQpsQCPfaFbaOR')) {
    console.log('✅ Redis URL נראה כמו של DEVELOPMENT (סיסמה: ggCVffISJOm...)');
    if (environment === 'production') {
      console.warn('⚠️  אזהרה: אתה בסביבת PRODUCTION אבל Redis נראה כמו של DEVELOPMENT!');
    }
  } else {
    console.log('ℹ️  לא מזהה את ה-Redis (Redis חדש או לא מוכר)');
  }

  console.log('\n─────────────────────────────────────────────────────────\n');

  try {
    // Parse URL to check for TLS
    let enableTls = false;
    try {
      const parsed = new URL(redisUrl);
      enableTls = parsed.protocol === 'rediss:';
      console.log(`🔒 TLS: ${enableTls ? 'Enabled (rediss://)' : 'Disabled (redis://)'}`);
    } catch (e) {
      console.log('⚠️  לא מצליח לפרסר את ה-URL, אבל ממשיך...');
    }

    // Create Redis client
    console.log('\n🔌 מתחבר ל-Redis...');
    const redis = new Redis(redisUrl, {
      tls: enableTls ? {} : undefined,
      connectTimeout: 15000,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.error('❌ נכשל לאחר 3 ניסיונות');
          return null;
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`   ⏳ ניסיון ${times}, ממתין ${delay}ms...`);
        return delay;
      },
      enableOfflineQueue: false,
    });

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout after 15 seconds'));
      }, 15000);

      redis.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      redis.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log('✅ התחברות הצליחה!\n');

    // Run tests
    console.log('─────────────────────────────────────────────────────────\n');
    console.log('🧪 בודק פעולות Redis:\n');

    // Test 1: PING
    console.log('1️⃣  בודק PING...');
    const pong = await redis.ping();
    console.log(`   ✅ PING → ${pong}\n`);

    // Test 2: INFO
    console.log('2️⃣  בודק INFO...');
    const info = await redis.info('server');
    const redisVersion = info.match(/redis_version:([^\r\n]+)/)?.[1];
    const uptime = info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1];
    console.log(`   ✅ גרסה: ${redisVersion || 'unknown'}`);
    console.log(`   ✅ Uptime: ${uptime ? Math.floor(Number(uptime) / 60) + ' דקות' : 'unknown'}\n`);

    // Test 3: SET/GET
    console.log('3️⃣  בודק SET/GET...');
    const testKey = `test:${Date.now()}`;
    const testValue = { message: 'Hello from production check!', timestamp: new Date().toISOString() };
    await redis.set(testKey, JSON.stringify(testValue), 'EX', 60);
    console.log(`   ✅ SET ${testKey}`);
    
    const retrieved = await redis.get(testKey);
    const parsed = JSON.parse(retrieved || '{}');
    console.log(`   ✅ GET ${testKey}`);
    console.log(`   📦 Value: ${parsed.message}\n`);

    // Test 4: DELETE
    console.log('4️⃣  בודק DELETE...');
    const deleted = await redis.del(testKey);
    console.log(`   ✅ מחיקה הצליחה (${deleted} keys deleted)\n`);

    // Test 5: Database size
    console.log('5️⃣  בודק גודל מסד נתונים...');
    const dbsize = await redis.dbsize();
    console.log(`   ✅ מספר keys ב-Redis: ${dbsize}\n`);

    // Test 6: Get some keys (if any)
    if (dbsize > 0) {
      console.log('6️⃣  בודק keys קיימים...');
      const sampleKeys = await redis.keys('*');
      const displayKeys = sampleKeys.slice(0, 10);
      console.log(`   📋 דוגמאות של keys (${displayKeys.length} מתוך ${sampleKeys.length}):`);
      displayKeys.forEach((key, i) => {
        console.log(`      ${i + 1}. ${key}`);
      });
      if (sampleKeys.length > 10) {
        console.log(`      ... ועוד ${sampleKeys.length - 10} keys`);
      }
      console.log('');
    }

    // Test 7: Memory info
    console.log('7️⃣  בודק שימוש ב-Memory...');
    const memoryInfo = await redis.info('memory');
    const usedMemory = memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1];
    const maxMemory = memoryInfo.match(/maxmemory_human:([^\r\n]+)/)?.[1];
    console.log(`   💾 שימוש נוכחי: ${usedMemory || 'unknown'}`);
    console.log(`   💾 מקסימום: ${maxMemory || 'no limit'}\n`);

    // Close connection
    await redis.quit();
    console.log('─────────────────────────────────────────────────────────\n');
    console.log('✅ כל הבדיקות עברו בהצלחה!');
    console.log('✅ Redis עובד תקין בפרודקשן\n');
    console.log('═══════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ שגיאה בחיבור ל-Redis:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
      if (error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    } else {
      console.error(error);
    }
    
    console.log('\n💡 פתרונות אפשריים:');
    console.log('   1. ודא ש-REDIS_URL מוגדר נכון ב-Railway');
    console.log('   2. בדוק שה-Redis plugin online ב-Railway Dashboard');
    console.log('   3. ודא שה-password נכון ב-URL');
    console.log('   4. בדוק שה-host והפורט נגישים');
    console.log('   5. אם יש TLS, ודא שה-URL מתחיל ב-rediss://');
    
    process.exit(1);
  }
}

// Run the check
checkRedisConnection().catch(console.error);

