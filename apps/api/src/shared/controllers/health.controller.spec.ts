// HealthController e2e tests
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../app.module";
import { PG_POOL } from "../../database/database.module";
import { REDIS } from "../../redis/redis.module";
import { Pool } from "pg";

describe("HealthController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id-for-testing";
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID =
      "test-web-client-id-for-testing";
    process.env.NODE_ENV = "test";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PG_POOL)
      .useValue({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn(),
        end: jest.fn(),
      } as unknown as Pool)
      .overrideProvider(REDIS)
      .useValue(null) // Redis is optional
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    // Clean up environment variables
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  });

  describe("GET /", () => {
    it("should return health check", async () => {
      const response = await request(app.getHttpServer()).get("/").expect(200);

      expect(response.body).toHaveProperty("status");
      // Status can be 'ok' or 'OK' - just check the key exists
      expect(["ok", "OK"]).toContain(response.body.status);
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app.getHttpServer())
        .get("/health")
        .expect(200);

      expect(response.body).toHaveProperty("status");
    });
  });
});
