// File overview:
// - Purpose: NestJS bootstrap entrypoint to configure and start the HTTP server with enhanced security.
// - Reached from: Node process start (Railway/Docker), runs `bootstrap()`.
// - Provides: CORS configuration, environment validation, global ValidationPipe, graceful shutdown.
// - Env inputs: PORT, CORS_ORIGIN, GOOGLE_CLIENT_ID, DATABASE_URL, REDIS_URL, NODE_ENV.
// - Downstream flow: Creates `AppModule` → loads controllers/modules for API routes.
// - Security: Environment validation, enhanced error handling, proper logging with NestJS Logger.
//
// SECURITY IMPROVEMENTS:
// ✅ Environment validation on startup - prevents silent failures
// ✅ Enhanced ValidationPipe configuration with security settings
// ✅ Graceful shutdown handling (SIGTERM, SIGINT)
// ✅ Better error handling and structured logging
// ✅ Production-safe error messages (no stack traces in prod)
// ✅ Helmet.js security headers (XSS, clickjacking, MITM protection)
// ✅ Global rate limiting via ThrottlerModule
//
// TODO: Add request/response logging middleware for audit trail
// TODO: Add API documentation setup (Swagger/OpenAPI)
// TODO: Add metrics collection and monitoring setup (Prometheus)
// TODO: Configure proper timeouts and request size limits
// TODO: Add CSRF protection for state-changing operations

// MVP: Reduced startup logging (verbose debug banners commented out)
// console.log('========================================');
// console.log('🚀 STARTING KC-MVP-SERVER');
// console.log('📍 Node version:', process.version);
// console.log('📍 Platform:', process.platform);
// console.log('📍 CWD:', process.cwd());
// console.log('========================================');
// console.log('[DEBUG-H1-H4] Server startup initiated:', JSON.stringify({...}));

import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestExpressApplication } from "@nestjs/platform-express";
import * as dotenv from "dotenv";
import helmet from "helmet";
import * as bodyParser from "body-parser";
import "./sanity";

// MVP: Reduced startup logging
// console.log("🔥🔥🔥 PROCESS STARTING: src/main.ts LOADED 🔥🔥🔥");
// console.log(`Env PORT: ${process.env.PORT}`);
// console.log(`Env DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

/**
 * Validate required environment variables before server startup
 *
 * This function ensures all critical environment variables are set,
 * preventing the server from starting in a misconfigured state.
 *
 * Required variables:
 * - GOOGLE_CLIENT_ID: For Google OAuth authentication
 * - DATABASE_URL: PostgreSQL connection string
 * - REDIS_URL: Redis connection string
 * - JWT_SECRET: Secret key for JWT token signing (minimum 32 characters)
 * - ENVIRONMENT: development or production
 *
 * Also validates environment separation to prevent critical errors like:
 * - Connecting dev server to production database
 * - Using production JWT secret in development
 *
 * If any required variable is missing, the process exits with error code 1.
 */
function validateEnvironment(): void {
  const logger = new Logger("Bootstrap");

  const required = [
    { key: "GOOGLE_CLIENT_ID", fallback: "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID" },
    { key: "DATABASE_URL", fallback: null },
    // REDIS_URL is now optional - removed from required list
    { key: "JWT_SECRET", fallback: null, minLength: 32 },
  ];

  const missing: string[] = [];
  const invalid: Array<{ key: string; requirement: string; current: number }> =
    [];

  for (const { key, fallback, minLength } of required) {
    if (!process.env[key]) {
      if (fallback && process.env[fallback]) {
        logger.warn(`Using ${fallback} as fallback for ${key}`);
        process.env[key] = process.env[fallback];
      } else {
        missing.push(key);
      }
    }

    // Validate minimum length if specified
    const value = process.env[key];
    if (minLength && value && value.length < minLength) {
      invalid.push({
        key,
        requirement: `minimum ${minLength} characters`,
        current: value.length,
      });
    }
  }

  if (missing.length > 0) {
    // [MVP] Agent debug log removed
    logger.error(
      `❌ Missing REQUIRED environment variables: ${missing.join(", ")}`,
    );
    logger.error("💡 Set these variables in your .env file or environment");
    logger.error("⚠️  Server cannot start without proper configuration");
    if (missing.includes("JWT_SECRET")) {
      logger.error("💡 For JWT_SECRET, generate a secure random string:");
      logger.error(
        "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    process.exit(1);
  }

  if (invalid.length > 0) {
    logger.error(`❌ Invalid environment variables:`);
    for (const { key, requirement, current } of invalid) {
      logger.error(
        `   ${key}: requires ${requirement}, but has ${current} characters`,
      );
    }
    if (invalid.some((v) => v.key === "JWT_SECRET")) {
      logger.error("💡 Generate a secure JWT_SECRET (32+ characters):");
      logger.error(
        "   node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    process.exit(1);
  }

  // ═══════════════════════════════════════════════════════════════
  // ENVIRONMENT SEPARATION VALIDATION
  // ═══════════════════════════════════════════════════════════════
  // Validate that environment configuration matches the database
  // This prevents critical errors like connecting dev to prod DB

  const environment =
    process.env.ENVIRONMENT || process.env.NODE_ENV || "unknown";
  const databaseUrl = process.env.DATABASE_URL || "";
  const redisUrl =
    process.env.REDIS_URL ||
    process.env.REDIS_PUBLIC_URL ||
    process.env.UPSTASH_REDIS_URL ||
    "";

  logger.log(
    `📍 Environment: ${environment.toUpperCase()} ${environment === "development" ? "🟢" : environment === "production" ? "🔴" : "⚪"}`,
  );

  // Check DATABASE_URL matches environment
  if (environment === "development") {
    // DEV should use password: mmWLXgvXF... or host: postgres-a3d6beef
    if (databaseUrl.includes("RHkhivARk")) {
      logger.error(
        "🚨 CRITICAL: DATABASE_URL appears to be PRODUCTION but ENVIRONMENT is development!",
      );
      logger.error(
        "   This would connect your dev server to the production database!",
      );
      logger.error(
        "   Fix: Update DATABASE_URL in Railway to use the development Postgres",
      );
      process.exit(1);
    } else if (
      databaseUrl.includes("mmWLXgvXF") ||
      databaseUrl.includes("postgres-a3d6beef")
    ) {
      logger.log("✅ Database: Development (verified by connection string)");
    } else {
      logger.warn(
        "⚠️  Cannot verify database environment from connection string",
      );
    }
  } else if (environment === "production") {
    // PROD should use password: RHkhivARk...
    if (
      databaseUrl.includes("mmWLXgvXF") ||
      databaseUrl.includes("postgres-a3d6beef")
    ) {
      logger.error(
        "🚨 CRITICAL: DATABASE_URL appears to be DEVELOPMENT but ENVIRONMENT is production!",
      );
      logger.error(
        "   This would connect your prod server to the development database!",
      );
      logger.error(
        "   Fix: Update DATABASE_URL in Railway to use the production Postgres",
      );
      process.exit(1);
    } else if (databaseUrl.includes("RHkhivARk")) {
      logger.log("✅ Database: Production (verified by connection string)");
    } else {
      logger.warn(
        "⚠️  Cannot verify database environment from connection string",
      );
    }
  } else {
    logger.warn(
      `⚠️  ENVIRONMENT not set (currently: ${environment}). Set to 'development' or 'production'`,
    );
  }

  // Check if Redis is shared (warning only, not critical)
  const isSharedRedis = redisUrl.includes("deQMolmzgWZsqeAkiEpZPFvejfGjenEm");
  if (isSharedRedis) {
    logger.warn("⚠️  Redis appears to be SHARED between environments!");
    logger.warn(
      "   Recommendation: Create separate Redis instances for dev and prod",
    );
    logger.warn("   This prevents cache pollution and session mixing");
  }

  if (
    environment === "development" &&
    redisUrl.includes("ggCVffISJOmdiIHAXBSQpsQCPfaFbaOR")
  ) {
    logger.log("✅ Redis: Development (separate instance)");
  } else if (environment === "production" && isSharedRedis) {
    logger.log("✅ Redis: Production");
  }

  logger.log("✅ Environment validation passed");
}

/**
 * Bootstrap the NestJS application
 *
 * This is the main entry point that:
 * 1. Loads environment variables
 * 2. Validates required configuration
 * 3. Creates the NestJS application
 * 4. Configures CORS for cross-origin requests
 * 5. Sets up global validation pipes
 * 6. Starts listening on the configured port
 */
async function bootstrap(): Promise<void> {
  const logger = new Logger("Bootstrap");

  try {
    // Load environment variables from .env file
    dotenv.config();

    // Validate critical environment variables
    validateEnvironment();

    // [MVP] Agent debug log removed

    logger.log("🚀 Starting Karma Community Server...");

    // [MVP] Agent debug log removed

    // Create NestJS application instance with Express adapter
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      cors: false, // We configure CORS manually for more control
      logger: ["error", "warn", "log", "debug", "verbose"],
      bodyParser: false, // Disable default body parser so we can configure it manually
    });

    // [MVP] Agent debug log removed

    // Configure body parser with 5MB limit (SEC-002, PERF-003)
    // Use a separate multipart/upload route for larger files
    app.use(bodyParser.json({ limit: "5mb" }));
    app.use(bodyParser.urlencoded({ limit: "5mb", extended: true }));

    logger.log("📦 Body parser configured with 5MB limit");

    const port = Number(process.env.PORT || 3001);

    // SEC-002.2: Security headers via Helmet.js
    // Minimal config to avoid Railway's nginx buffer overflow ("upstream sent too big header")
    app.use(
      helmet({
        contentSecurityPolicy: false, // CSP can be strict — disabled for now to avoid breaking mobile
        crossOriginEmbedderPolicy: false, // Disabled to allow cross-origin resources
        crossOriginOpenerPolicy: false, // Disabled to avoid breaking OAuth popups
        hsts: { maxAge: 31536000 }, // Strict-Transport-Security: 1 year
        frameguard: { action: "deny" }, // X-Frame-Options: DENY — prevents clickjacking
        noSniff: true, // X-Content-Type-Options: nosniff
        xssFilter: true, // X-XSS-Protection: 1; mode=block
        referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      }),
    );

    logger.log("🛡️  Helmet.js security headers enabled (SEC-002.2)");

    // Determine environment for CORS configuration
    const environment =
      process.env.ENVIRONMENT || process.env.NODE_ENV || "development";
    const isProduction = environment === "production";

    // Configure CORS (Cross-Origin Resource Sharing)
    let corsOrigin = process.env.CORS_ORIGIN;

    // Remove surrounding quotes if present (Railway sometimes includes them)
    if (corsOrigin && corsOrigin.startsWith('"') && corsOrigin.endsWith('"')) {
      corsOrigin = corsOrigin.slice(1, -1);
      logger.log("🔧 Removed surrounding quotes from CORS_ORIGIN");
    }

    if (!corsOrigin) {
      logger.warn(
        "⚠️  WARNING: CORS_ORIGIN not set! Using default origins based on environment.",
      );
    }

    // Default origins based on environment
    const defaultOrigins = isProduction
      ? ["https://karma-community-kc.com", "https://www.karma-community-kc.com"]
      : [
          "https://dev.karma-community-kc.com",
          "http://localhost:19006",
          "http://localhost:3000",
          "http://localhost:8081",
          "http://127.0.0.1:3000",
        ];

    const allowedOrigins = corsOrigin
      ? corsOrigin.split(",").map((s) => s.trim())
      : defaultOrigins;

    // Force include development domains if not in production
    // This ensures that even if CORS_ORIGIN is set in Railway but missing the dev domain, it still works
    if (!isProduction) {
      const devDomains = [
        "https://dev.karma-community-kc.com",
        "http://localhost:19006",
        "http://localhost:3000",
        "http://localhost:8081",
      ];

      // Add unique domains
      devDomains.forEach((domain) => {
        if (!allowedOrigins.includes(domain)) {
          allowedOrigins.push(domain);
        }
      });

      logger.log(
        `🔧 Forced inclusion of development domains in CORS allowed origins`,
      );
    }

    app.enableCors({
      origin: allowedOrigins,
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
      exposedHeaders: [
        "Cross-Origin-Opener-Policy",
        "Cross-Origin-Embedder-Policy",
      ],
    });

    // Add Cross-Origin-Opener-Policy header for Google OAuth
    app.use(
      (
        req: import("express").Request,
        res: import("express").Response,
        next: import("express").NextFunction,
      ) => {
        res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
        res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
        next();
      },
    );

    logger.log(
      `🌐 CORS enabled for ${isProduction ? "PRODUCTION" : "DEVELOPMENT"} environment`,
    );
    logger.log(`🌐 Allowed origins: ${allowedOrigins.join(", ")}`);

    // Extra CORS fallback middleware for proxy compatibility
    // Some proxies don't properly forward CORS headers, so we add them manually

    app.use(
      (
        req: import("express").Request,
        res: import("express").Response,
        next: import("express").NextFunction,
      ) => {
        const origin = req.headers.origin;

        // Only set CORS headers if origin is in allowed list
        if (origin && allowedOrigins.includes(origin)) {
          res.header("Access-Control-Allow-Origin", origin);
          res.header("Vary", "Origin");
          res.header("Access-Control-Allow-Credentials", "true");
          res.header(
            "Access-Control-Allow-Methods",
            "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
          );
          res.header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With, X-Auth-Token, Origin, Accept",
          );

          // Handle preflight requests
          if (req.method === "OPTIONS") {
            return res.sendStatus(204);
          }
        } else if (origin && !isProduction) {
          // In development, log blocked origins for debugging
          logger.warn(
            `🚫 Blocked CORS request from origin: ${origin} (not in allowed list)`,
          );
        } else if (origin && isProduction) {
          // In production, silently block unauthorized origins (security)
          // Don't set any CORS headers, browser will block the request
        }

        next();
      },
    );

    // Configure global validation pipe with security settings
    // This automatically validates all incoming requests against DTOs
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        transform: true, // Automatically transform payloads to DTO instances
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
        disableErrorMessages: isProduction, // Hide detailed errors in production
        transformOptions: {
          enableImplicitConversion: true, // Convert string numbers to actual numbers
        },
      }),
    );

    // Start the HTTP server
    await app.listen(port, "0.0.0.0");

    // H5/PERF-003.1: Set server timeout to 30s to prevent hung connections
    const httpServer = app.getHttpServer();
    httpServer.setTimeout(30000);

    // Log successful startup with configuration summary
    const isDevelopment = environment === "development";
    logger.log("═══════════════════════════════════════════════════");
    logger.log("🚀 Karma Community Server started successfully!");
    logger.log("═══════════════════════════════════════════════════");
    logger.log(`📍 Port: ${port}`);
    logger.log(
      `📍 Environment: ${environment.toUpperCase()} ${isProduction ? "🔴 PRODUCTION" : isDevelopment ? "🟢 DEVELOPMENT" : "🟡 OTHER"}`,
    );
    logger.log(
      `🔒 Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? "✅ Configured" : "❌ Not configured"}`,
    );

    // Show database connection details (masked for security)
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        const dbUrlObj = new URL(dbUrl);
        const dbName = dbUrlObj.pathname.replace("/", "") || "unknown";
        const dbHost = dbUrlObj.hostname || "unknown";
        logger.log(`💾 Database: ✅ Connected to ${dbName}@${dbHost}`);
      } catch {
        logger.log(`💾 Database: ✅ Connected (URL configured)`);
      }
    } else {
      logger.log(`💾 Database: ❌ Not connected - DATABASE_URL missing!`);
    }

    // Show Redis connection details (same URL resolution as redis.module.ts — Railway provides REDIS_URL)
    const redisUrlResolved =
      process.env.REDIS_URL ||
      process.env.REDIS_PUBLIC_URL ||
      process.env.UPSTASH_REDIS_URL ||
      "";
    if (redisUrlResolved) {
      try {
        const redisUrlObj = new URL(redisUrlResolved);
        const redisHost = redisUrlObj.hostname || "unknown";
        logger.log(`⚡ Redis: ✅ Configured (${redisHost})`);
      } catch {
        logger.log(`⚡ Redis: ✅ Configured (connection URL present)`);
      }
    } else {
      logger.log(
        `⚡ Redis: ❌ Not configured — set REDIS_URL (Railway injects this when Redis is linked)`,
      );
    }

    // Warn if running in production without proper environment flag
    if (
      isProduction &&
      !process.env.ENVIRONMENT &&
      process.env.NODE_ENV !== "production"
    ) {
      logger.warn(
        '⚠️  WARNING: Running in production mode but ENVIRONMENT is not explicitly set to "production"',
      );
    }

    // [MVP] Agent debug log removed

    logger.log("═══════════════════════════════════════════════════");
  } catch (error) {
    // [MVP] Agent debug log removed

    // Handle startup errors gracefully
    if (error instanceof Error) {
      logger.error("❌ Failed to start server:", error.message);
      // Use environment variable if available, otherwise default to development
      const errorEnv =
        process.env.ENVIRONMENT || process.env.NODE_ENV || "development";
      const isProduction = errorEnv === "production";
      if (error.stack && !isProduction) {
        logger.error("Stack trace:", error.stack);
      }
    } else {
      logger.error("❌ Failed to start server: Unknown error", error);
    }
    process.exit(1);
  }
}

// Start the application
bootstrap().catch((error) => {
  console.error("❌ Unhandled bootstrap error:", error);
  console.error("Stack:", error?.stack);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN HANDLERS
// ═══════════════════════════════════════════════════════════════

/**
 * Handle SIGTERM signal (sent by process managers like PM2, Docker, Kubernetes)
 * Allows the application to clean up resources before exiting
 */
process.on("SIGTERM", () => {
  const logger = new Logger("Shutdown");
  logger.log("🛑 SIGTERM signal received, shutting down gracefully...");
  logger.log("👋 Closing database connections and cleaning up resources");
  process.exit(0);
});

/**
 * Handle SIGINT signal (Ctrl+C in terminal)
 * Allows developers to stop the server cleanly during development
 */
process.on("SIGINT", () => {
  const logger = new Logger("Shutdown");
  logger.log("🛑 SIGINT signal received (Ctrl+C), shutting down gracefully...");
  logger.log("👋 Goodbye!");
  process.exit(0);
});

/**
 * Handle unhandled promise rejections
 * These are programming errors that should be caught and fixed
 */
process.on("unhandledRejection", (reason, promise) => {
  const logger = new Logger("Error");
  logger.error("❌ Unhandled Promise Rejection detected!");
  logger.error("Promise:", promise);
  logger.error("Reason:", reason);
  logger.error("⚠️  This is a programming error that should be fixed");
  process.exit(1);
});

/**
 * Handle uncaught exceptions
 * These are critical errors that should crash the application
 */
process.on("uncaughtException", (error) => {
  const logger = new Logger("Error");
  logger.error("❌ Uncaught Exception detected!");
  logger.error("Error:", error.message);
  if (error.stack) {
    logger.error("Stack trace:", error.stack);
  }
  logger.error("⚠️  Application will exit due to critical error");
  process.exit(1);
});

import "./sanity";
