# File overview:
# - Purpose: Multi-stage Dockerfile to build and run the NestJS server on Railway/containers.
# - Context: Designed for monorepo - Railway builds from root, this file is in apps/api
# - Notes: Copies monorepo structure, installs deps, builds api workspace, runs from dist

FROM node:20 AS builder
WORKDIR /app

# Copy all package.json files for monorepo workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/*/package*.json ./packages/

# Install all dependencies (including dev deps for build)
RUN npm ci --include=dev

# Copy entire monorepo source
COPY . .

# Build the API workspace from root using workspace command
RUN npm run build --workspace @kc/api

# Verify build succeeded
RUN test -f ./apps/api/dist/main.js || (echo "ERROR: apps/api/dist/main.js missing after build" && ls -la apps/api/ && exit 1)

# Production stage
FROM node:20
WORKDIR /app

LABEL Name="kc-mvp-server" Version="1.4.0"

# Copy package files for production install
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/*/package*.json ./packages/

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/src/database/*.sql ./apps/api/dist/database/

# Set working directory to api app for runtime
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "dist/main.js"]

