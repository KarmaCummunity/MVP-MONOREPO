
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Checking chat_messages schema...');

    const res = await pool.query(`
    SELECT column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_name = 'chat_messages'
  `);

    res.rows.forEach(row => {
        console.log(`${row.column_name}: ${row.data_type} (${row.udt_name})`);
    });

    await app.close();
}

bootstrap();
