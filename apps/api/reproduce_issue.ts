
import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function reproduce() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // The query from database.init.ts, but with newlines replaced by spaces to simulate minification/stripping
        // Original query:
        /*
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
        */

        // Simulating the fix: removing the comment
        const query = `DO $$ BEGIN IF NOT EXISTS ( SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'firebase_uid' ) THEN ALTER TABLE user_profiles ADD COLUMN firebase_uid TEXT; IF NOT EXISTS ( SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_firebase_uid_key' ) THEN ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_firebase_uid_key UNIQUE (firebase_uid); END IF; END IF; END $$ ;`;

        console.log('Executing query...');
        await client.query(query);
        console.log('Query executed successfully (Unexpected if hypothesis is correct)');

    } catch (err: any) {
        console.error('Caught expected error:', err.message);
        if (err.message.includes('unterminated dollar-quoted string')) {
            console.log('✅ SUCCESS: Reproduction confirmed! The error matches production logs.');
        } else {
            console.log('❌ FAILED: Error differs from production logs.');
        }
    } finally {
        await client.end();
    }
}

reproduce();
