// File overview:
// - Purpose: Augment NodeJS.ProcessEnv typings for server env variables used across modules.
// - Reached from: TypeScript ambient declaration loaded globally by tsconfig.
// - Provides: Optional definitions for NODE_ENV, PORT, Postgres, Redis, and CORS envs.
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string;
    PORT?: string;
    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_PASSWORD?: string;
    CORS_ORIGIN?: string;
  }
}
