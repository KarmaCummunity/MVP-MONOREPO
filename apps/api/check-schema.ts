
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Checking column types...');

    const tables = ['chat_messages', 'chat_conversations', 'user_profiles'];

    for (const table of tables) {
        console.log(`\n--- ${table} ---`);
        const res = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = $1
    `, [table]);

        res.rows.forEach(row => {
            console.log(`${row.column_name}: ${row.data_type} (${row.udt_name})`);
        });
    }

    await app.close();
}

bootstrap();
