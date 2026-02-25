// File overview:
// - Purpose: NestJS bootstrap entrypoint to configure and start the HTTP server.
// - Reached from: Node process start (Railway/Docker), runs `bootstrap()`.
// - Provides: CORS configuration (origin from env), global ValidationPipe, loads dotenv.
// - Env inputs: PORT, CORS_ORIGIN and DB/Redis envs used indirectly by modules.
// - Downstream flow: Creates `AppModule` → loads controllers/modules for API routes.

// SECURITY IMPROVEMENTS ADDED:
// - Environment validation on startup
// - Enhanced ValidationPipe configuration
// - Graceful shutdown handling
// - Better error handling and logging

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import * as dotenv from "dotenv";

// Validate required environment variables
function validateEnvironment() {
  const logger = new Logger("Bootstrap");

  const required = [
    { key: "GOOGLE_CLIENT_ID", fallback: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" },
    { key: "DATABASE_URL", fallback: null },
    { key: "REDIS_URL", fallback: null },
  ];

  const missing = [];

  for (const { key, fallback } of required) {
    if (!process.env[key]) {
      if (fallback && process.env[fallback]) {
        logger.warn(`Using ${fallback} as fallback for ${key}`);
        process.env[key] = process.env[fallback];
      } else {
        missing.push(key);
      }
    }
  }

  if (missing.length > 0) {
    logger.error(
      `Missing REQUIRED environment variables: ${missing.join(", ")}`,
    );
    logger.error("Set these variables or the server will not work properly");
    process.exit(1);
  }

  logger.log("✅ Environment validation passed");
}

async function bootstrap() {
  const logger = new Logger("Bootstrap");

  try {
    dotenv.config();
    validateEnvironment();

    logger.log("🚀 Starting Karma Community Server...");

    const app = await NestFactory.create(AppModule, { cors: false });
    const port = Number(process.env.PORT || 3001);

    const corsOrigin = process.env.CORS_ORIGIN || "*";
    app.enableCors({
      origin:
        corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim()),
      credentials: true,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Auth-Token",
        "Origin",
        "Accept",
      ],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    logger.log(`🌐 CORS enabled for origins: ${corsOrigin}`);

    // Extra CORS fallback middleware (handles proxies not honoring default CORS)
    const defaultOrigins = [
      "https://karma-community-kc.com",
      "https://www.karma-community-kc.com",
      "http://localhost:19006",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];
    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim())
      : defaultOrigins;
    app.use(
      (
        req: import("express").Request,
        res: import("express").Response,
        next: import("express").NextFunction,
      ) => {
        const origin = req.headers.origin;
        if (origin && (allowedOrigins.includes(origin) || corsOrigin === "*")) {
          res.header("Access-Control-Allow-Origin", origin);
          res.header("Vary", "Origin");
        }
        res.header("Access-Control-Allow-Credentials", "true");
        res.header(
          "Access-Control-Allow-Methods",
          "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
        );
        res.header(
          "Access-Control-Allow-Headers",
          "Content-Type, Authorization, X-Requested-With, X-Auth-Token, Origin, Accept",
        );
        if (req.method === "OPTIONS") {
          return res.sendStatus(204);
        }
        next();
      },
    );

    // Enhanced validation pipe with security settings
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: process.env.NODE_ENV === "production",
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.listen(port, "0.0.0.0");

    logger.log(`🚀 Karma Community Server running on port ${port}`);
    logger.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.log(`🔒 Google OAuth configured: ${!!process.env.GOOGLE_CLIENT_ID}`);
  } catch (error) {
    if (error instanceof Error) {
      logger.error("❌ Failed to start server:", error.message);
      if (error.stack && process.env.NODE_ENV === "development") {
        logger.error(error.stack);
      }
    } else {
      logger.error("❌ Failed to start server: Unknown error", error);
    }
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error("Unhandled bootstrap error:", error);
  process.exit(1);
});

// Graceful shutdown handling
process.on("SIGTERM", () => {
  const logger = new Logger("Shutdown");
  logger.log("🛑 SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  const logger = new Logger("Shutdown");
  logger.log("🛑 SIGINT received, shutting down gracefully");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  const logger = new Logger("Error");
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  const logger = new Logger("Error");
  logger.error("Uncaught Exception:", error.message);
  if (error.stack) {
    logger.error(error.stack);
  }
  process.exit(1);
});
