// Helper ליצירת NestJS app לבדיקות
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PG_POOL } from '../../src/database/database.module';
import { REDIS } from '../../src/redis/redis.module';
import { Pool } from 'pg';
import Redis from 'ioredis';

export interface TestAppOptions {
  testDb?: Pool;
  mockRedis?: Redis | null;
}

/**
 * יצירת NestJS app לבדיקות
 * עם אפשרות לספק test database ו-mock Redis
 */
export async function createTestApp(options: TestAppOptions = {}): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PG_POOL)
    .useValue(options.testDb || createMockPool())
    .overrideProvider(REDIS)
    .useValue(options.mockRedis !== undefined ? options.mockRedis : null)
    .compile();

  const app = moduleFixture.createNestApplication();
  
  // הוספת validation pipe (כמו ב-main.ts)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

/**
 * יצירת mock Pool (אם לא מספקים test database)
 */
function createMockPool(): Pool {
  // זה mock בסיסי - בבדיקות אמיתיות עדיף להשתמש ב-test database
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  } as unknown as Pool;
}


