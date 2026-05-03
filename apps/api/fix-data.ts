
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { Pool } from 'pg';
import { PG_POOL } from './src/database/database.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const pool = app.get<Pool>(PG_POOL);

    console.log('Fixing data issues...');

    // 1. Delete Test User
    console.log('Deleting "Test User"...');
    await pool.query(`
    DELETE FROM user_profiles 
    WHERE email = 'test@example.com' OR name = 'Test User'
  `);
    console.log('Test User deleted.');

    // 2. Insert missing user T00...
    console.log('Inserting missing user T00iUzrs15dNoVOLVFntzmgwJwz2...');
    const missingUid = 'T00iUzrs15dNoVOLVFntzmgwJwz2';

    // Check if exists again just in case
    const check = await pool.query('SELECT id FROM user_profiles WHERE firebase_uid = $1', [missingUid]);
    if (check.rows.length === 0) {
        await pool.query(`
      INSERT INTO user_profiles (
        firebase_uid, email, name, avatar_url, bio, 
        karma_points, join_date, is_active, last_active, 
        city, country, interests, roles, email_verified, settings
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, NOW(), $8, $9, $10, $11, $12, $13)
    `, [
            missingUid,
            'recovered_user@example.com',
            'Recovered User',
            'https://ui-avatars.com/api/?name=Recovered+User',
            'Automatically recovered user',
            0,
            true,
            'Tel Aviv',
            'Israel',
            [],
            ['user'],
            true,
            JSON.stringify({ language: 'he', darkMode: false })
        ]);
        console.log('Missing user inserted.');
    } else {
        console.log('User already exists (unexpected).');
    }

    await app.close();
}

bootstrap();
