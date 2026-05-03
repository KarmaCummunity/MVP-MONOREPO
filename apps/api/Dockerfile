# File overview:
# - Purpose: Multi-stage Dockerfile to build and run the NestJS server on Railway/containers.
# - Context: Designed for monorepo - Railway builds from root, this file is in apps/api
# - Notes: Copies monorepo structure, installs deps, builds api workspace, runs from dist
# dockerfile-utils: ignore (IDE parser false positive on `FROM node:<numeric-tag> AS`)

FROM node:20 AS builder
WORKDIR /app

# Copy all package.json files for monorepo workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

# Install all dependencies (including dev deps for build)
RUN npm ci --include=dev

# Copy entire monorepo source
COPY . .

# Build shared workspace types first (api depends on generated dist declarations)
RUN npm run build --workspace @kc/shared-types

# Build the API workspace from root using workspace command
RUN npm run build --workspace @kc/api

# Verify build succeeded
RUN test -f ./apps/api/dist/main.js || \
  (echo "ERROR: apps/api/dist/main.js missing after build" && ls -la apps/api/ && exit 1)

# Production stage
FROM node:20
WORKDIR /app

# Ensure runtime is treated as production when variables are omitted from Railway (CORS defaults, Nest behavior).
ENV NODE_ENV=production

LABEL Name="kc-mvp-server" Version="1.5.0"

# Copy package files for production install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/shared-types/tsconfig.json ./packages/shared-types/tsconfig.json
COPY packages/shared-types/src ./packages/shared-types/src

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder (includes SQL files via nest-cli.json assets)
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Ensure database directory exists and copy SQL schema files
RUN mkdir -p ./apps/api/src/database
COPY --from=builder /app/apps/api/src/database/*.sql ./apps/api/src/database/

# Verify SQL files were copied
RUN ls -la ./apps/api/dist/database/ && ls -la ./apps/api/src/database/ || echo "⚠️ SQL files location check"

# Expose port
EXPOSE 3001

# Start command from root (so node_modules are accessible)
CMD ["node", "apps/api/dist/main.js"]

