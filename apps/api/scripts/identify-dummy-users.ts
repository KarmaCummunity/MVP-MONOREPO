
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from '../src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Searching for dummy users...');
    const res = await pool.query(`
    SELECT id, name, email, firebase_uid, created_at FROM user_profiles 
    WHERE name IN ('Test User', 'Recovered User')
       OR name ILIKE '%test%'
       OR email ILIKE '%test%'
  `);

    if (res.rows.length > 0) {
        console.log('Found potential dummy users:');
        console.table(res.rows);
    } else {
        console.log('No dummy users found matching criteria.');
    }

    await app.close();
}

bootstrap();
