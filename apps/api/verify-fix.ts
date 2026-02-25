
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Verifying fix...');

    // Get a valid user ID
    const userRes = await pool.query('SELECT id FROM user_profiles LIMIT 1');
    if (userRes.rows.length === 0) {
        console.log('No users found, cannot verify.');
        await app.close();
        return;
    }
    const userId = userRes.rows[0].id; // UUID
    console.log(`Testing with user ID: ${userId}`);

    try {
        const query = `
        SELECT 
          cc.*,
          cm.content as last_message_content,
          cm.message_type as last_message_type,
          cm.created_at as last_message_time,
          CASE 
            WHEN cm.sender_id IS NULL THEN 'ללא שם'
            ELSE COALESCE(
              (SELECT name FROM user_profiles WHERE id::text = cm.sender_id LIMIT 1),
              'ללא שם'
            )
          END as last_sender_name,
          (
            SELECT COUNT(*)
            FROM chat_messages cm2
            WHERE cm2.conversation_id = cc.id 
              AND cm2.sender_id != $1
              AND cm2.is_deleted = false
              AND NOT EXISTS (
                SELECT 1 
                FROM message_read_receipts mrr
                WHERE mrr.message_id = cm2.id 
                AND mrr.user_id = $1
              )
          ) as unread_count
        FROM chat_conversations cc
        LEFT JOIN chat_messages cm ON cc.last_message_id = cm.id
        WHERE $1::uuid = ANY(cc.participants::uuid[])
        ORDER BY cc.last_message_at DESC
    `;

        const res = await pool.query(query, [userId]);
        console.log(`✅ Query executed successfully! Returned ${res.rows.length} rows.`);
    } catch (error) {
        console.error('❌ Query failed:', error);
    }

    await app.close();
}

bootstrap();
