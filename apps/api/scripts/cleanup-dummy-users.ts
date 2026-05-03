
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from '../src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Deleting dummy users...');

    // Delete from user_profiles
    const res = await pool.query(`
    DELETE FROM user_profiles 
    WHERE name IN ('Test User', 'Recovered User')
       OR name ILIKE '%test%'
       OR email ILIKE '%test%'
    RETURNING id, name, email
  `);

    if ((res.rowCount ?? 0) > 0) {
        console.log(`Deleted ${res.rowCount} users:`);
        console.table(res.rows);
    } else {
        console.log('No users deleted.');
    }

    await app.close();
}

bootstrap();
