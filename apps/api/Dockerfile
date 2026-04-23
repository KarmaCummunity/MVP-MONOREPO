# File overview:
# - Purpose: Multi-stage Dockerfile to build and run the NestJS server on Railway/containers.
# - Context: Designed for monorepo - Railway builds from root, this file is in apps/api
# - Notes: Copies monorepo structure, installs deps, builds api workspace, runs from dist

FROM node:20
WORKDIR /app

LABEL Name="kc-mvp-server" Version="1.2.0"

# Copy root package.json and workspace package files
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/

# Install all dependencies (including dev deps for build)
RUN npm ci --include=dev && npm cache clean --force

# Copy entire monorepo
COPY . .

# Build the API workspace
WORKDIR /app/apps/api
RUN rm -f *.tsbuildinfo && npm run build

# Verify build succeeded
RUN test -f ./dist/main.js || (echo "ERROR: dist/main.js missing after build" && exit 1)

# Copy schema files to dist
RUN npm run copy:schema || (mkdir -p dist/database && cp -f src/database/*.sql dist/database/ 2>/dev/null || true)

# Clean dev dependencies after build to reduce image size
RUN cd /app && npm prune --production

# Expose port
EXPOSE 3001

# Start command
CMD ["node", "dist/main.js"]

