// Test database helper - יצירת test database נפרד
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

/**
 * יצירת test database connection
 * חשוב: זה database נפרד לחלוטין מ-production ו-development!
 */
export async function createTestDatabase(): Promise<Pool> {
  const testDbUrl = process.env.TEST_DATABASE_URL || 
    'postgresql://kc:kc_password@localhost:5432/kc_test_db';
  
  const pool = new Pool({ connectionString: testDbUrl });
  
  // בדיקה שהחיבור עובד
  try {
    await pool.query('SELECT 1');
    console.log('✅ Test database connected');
  } catch (error) {
    console.error('❌ Failed to connect to test database:', error);
    throw error;
  }
  
  return pool;
}

/**
 * ניקוי test database - מחיקת כל הטבלאות
 * חשוב: זה לא מוחק את ה-database עצמו, רק את הטבלאות!
 */
export async function cleanupTestDatabase(pool: Pool): Promise<void> {
  try {
    // מחיקת כל הטבלאות
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    console.log('✅ Test database cleaned');
  } catch (error) {
    console.error('❌ Failed to cleanup test database:', error);
    throw error;
  }
}

/**
 * סגירת חיבור ל-test database
 */
export async function closeTestDatabase(pool: Pool): Promise<void> {
  await pool.end();
  console.log('✅ Test database connection closed');
}

/**
 * הרצת schema.sql על test database
 * זה יוצר את כל הטבלאות הנדרשות
 */
export async function initializeTestDatabaseSchema(pool: Pool): Promise<void> {
  const schemaPath = path.join(__dirname, '../../src/database/schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  
  const schema = fs.readFileSync(schemaPath, 'utf8');
  
  // הרצת ה-schema
  await pool.query(schema);
  console.log('✅ Test database schema initialized');
}


