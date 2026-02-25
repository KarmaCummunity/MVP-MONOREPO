
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Checking for user T00iUzrs15dNoVOLVFntzmgwJwz2...');
    const res1 = await pool.query(`
    SELECT * FROM user_profiles 
    WHERE firebase_uid = $1 OR id::text = $1
  `, ['T00iUzrs15dNoVOLVFntzmgwJwz2']);

    if (res1.rows.length > 0) {
        console.log('User found:', res1.rows[0]);
    } else {
        console.log('User NOT found.');
    }

    console.log('\nChecking for "Test User"...');
    const res2 = await pool.query(`
    SELECT id, name, email, firebase_uid FROM user_profiles 
    WHERE name ILIKE '%test%' OR email ILIKE '%test%'
  `);

    if (res2.rows.length > 0) {
        console.log('Test users found:', res2.rows);
    } else {
        console.log('No test users found.');
    }

    await app.close();
}

bootstrap();
