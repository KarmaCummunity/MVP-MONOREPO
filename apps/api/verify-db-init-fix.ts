import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';


// Try to load .env from current working directory
const envPath = path.resolve(process.cwd(), '.env');
console.log(`Loading .env from: ${envPath}`);

if (require('fs').existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('.env file found and loaded.');
} else {
    console.log('❌ .env file NOT found at expected path.');
}


let poolConfig;

if (process.env.DATABASE_URL) {
    const connectionString = process.env.DATABASE_URL;
    const sslFlag = process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
    const sslEnabled = (sslFlag && /^(1|true|require)$/i.test(sslFlag)) || /sslmode=require/i.test(connectionString);

    poolConfig = {
        connectionString,
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    };
} else {
    // Fall back to discrete env vars
    const host = process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost';
    const port = Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432);
    const user = process.env.POSTGRES_USER || process.env.PGUSER || 'kc';
    const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || 'kc_password';
    const database = process.env.POSTGRES_DB || process.env.PGDATABASE || 'kc_db';
    const sslFlag = process.env.PG_SSL || process.env.POSTGRES_SSL || process.env.PGSSLMODE;
    const sslEnabled = sslFlag ? /^(1|true|require)$/i.test(sslFlag) : false;

    console.log(`Using discrete config: host=${host}, port=${port}, user=${user}, db=${database}`);

    poolConfig = {
        host,
        port,
        user,
        password,
        database,
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    };
}

const pool = new Pool(poolConfig);


async function run() {
    try {
        console.log('Connecting to database...');
        const client = await pool.connect();
        console.log('✅ Connected to database.');

        console.log('Testing DO $$ block syntax (the one that failed)...');

        // This is the exact block that was failing, with the fix applied (END $$ ;)
        const query = `
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid'
          ) THEN
            ALTER TABLE user_profiles ADD COLUMN firebase_uid TEXT;
            -- Add unique constraint if not exists
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint 
              WHERE conname = 'user_profiles_firebase_uid_key'
            ) THEN
              ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_firebase_uid_key UNIQUE (firebase_uid);
            END IF;
          END IF;
        END $$ ;
    `;

        await client.query(query);
        console.log('✅ DO $$ block executed successfully!');

        // Also test the index creation block
        console.log('Testing index creation DO $$ block...');
        const query2 = `
        DO $$ 
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid'
          ) THEN
            CREATE INDEX IF NOT EXISTS idx_user_profiles_firebase_uid ON user_profiles (firebase_uid) WHERE firebase_uid IS NOT NULL;
          END IF;
        END $$ ;
    `;
        await client.query(query2);
        console.log('✅ Index creation DO $$ block executed successfully!');

        client.release();
        await pool.end();
        console.log('🎉 Verification passed: The syntax fix works.');
    } catch (err) {
        console.error('❌ Verification failed:', err);
        process.exit(1);
    }
}

run();
