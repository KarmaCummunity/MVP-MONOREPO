# File overview:
# - Purpose: Multi-stage Dockerfile to build and run the NestJS server on Railway/containers.
# - Context: Designed for monorepo - Railway builds from root, this file is in apps/api
# - Notes: Copies monorepo structure, installs deps, builds api workspace, runs from dist

FROM node:20
WORKDIR /app

LABEL Name="kc-mvp-server" Version="1.3.0"

# Copy all package.json files for monorepo workspaces
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install all dependencies from root (monorepo approach)
RUN npm ci --include=dev && npm cache clean --force

# Copy entire monorepo source
COPY . .

# Build the API workspace from root using workspace command
RUN npm run build --workspace @kc/api

# Verify build succeeded
RUN test -f ./apps/api/dist/main.js || (echo "ERROR: apps/api/dist/main.js missing after build" && ls -la apps/api/ && exit 1)

# Clean dev dependencies after build to reduce image size
RUN npm prune --production

# Set working directory to api app for runtime
WORKDIR /app/apps/api

# Expose port
EXPOSE 3001

# Start command (runs from /app/apps/api so dist/main.js is correct path)
CMD ["node", "dist/main.js"]

