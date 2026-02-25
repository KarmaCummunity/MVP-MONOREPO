// Run migration script to deduplicate conversations
// Usage: npx ts-node run-dedupe-migration.ts

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });

    try {
        console.log('🔄 Starting conversation deduplication migration...\n');

        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'src', 'database', 'migration-dedupe-conversations.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Execute the migration
        await pool.query(migrationSQL);

        console.log('\n✅ Migration completed successfully!');
        console.log('📊 Check the output above for details on:');
        console.log('   - Number of duplicate conversations merged');
        console.log('   - Number of conversations with sorted participants');
        console.log('   - Verification results');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
