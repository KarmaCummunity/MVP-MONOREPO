# File overview:
# - Purpose: Multi-stage Dockerfile to build and run the NestJS server on Railway/containers.
# - Stages: builder (tsc), deps (prod node_modules), runner (start dist).
# - Notes: Copies `schema.sql` into dist for runtime schema bootstrap.

# Simple single-stage Dockerfile (lint-friendly)
FROM node:20
WORKDIR /app

# NODE_ENV will be set by Railway environment variables
# Don't hardcode it here to allow dev/prod separation
LABEL Name="kc-mvp-server" Version="1.1.0"

COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force

COPY . .

# Build: prefer nest build via npm script; fallback to tsc
RUN rm -f *.tsbuildinfo && (npm run build || npx tsc -p tsconfig.build.json)

# Clean dev dependencies after build to reduce image size
RUN npm prune --production

# Ensure dist exists and include SQL schema into dist
RUN test -f ./dist/main.js || (echo "dist/main.js missing" && exit 1)
RUN mkdir -p dist/database && cp -f src/database/schema.sql dist/database/ || true

# Expose is optional for Railway, but helps locally
EXPOSE 3001

# Standard start command
CMD ["node", "dist/main.js"]

