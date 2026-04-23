# Frontend Dockerfile (Expo Web static build served by Nginx)
# Built from monorepo root - Railway uses apps/mobile/Dockerfile

# 1) Build static web with Expo
FROM node:20-alpine as webbuild
WORKDIR /app

# Copy monorepo package files
COPY package*.json ./
COPY apps/mobile/package*.json ./apps/mobile/

# Install dependencies
RUN npm ci --legacy-peer-deps || npm install --no-audit --no-fund --legacy-peer-deps

# Copy mobile app source
COPY apps/mobile ./apps/mobile

# Set working directory to mobile app
WORKDIR /app/apps/mobile

# Expo web export (defaults ensure production works on Railway even without build args)
ARG EXPO_PUBLIC_API_BASE_URL=/
ARG EXPO_PUBLIC_USE_BACKEND=1
ARG EXPO_PUBLIC_USE_FIRESTORE=0
ARG EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=""
ARG EXPO_PUBLIC_FIREBASE_API_KEY=""
ARG EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=""
ARG EXPO_PUBLIC_FIREBASE_PROJECT_ID=""

ENV EXPO_NO_TELEMETRY=1 \
    EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL} \
    EXPO_PUBLIC_USE_BACKEND=${EXPO_PUBLIC_USE_BACKEND} \
    EXPO_PUBLIC_USE_FIRESTORE=${EXPO_PUBLIC_USE_FIRESTORE} \
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID} \
    EXPO_PUBLIC_FIREBASE_API_KEY=${EXPO_PUBLIC_FIREBASE_API_KEY} \
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=${EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN} \
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=${EXPO_PUBLIC_FIREBASE_PROJECT_ID}

# Update build version before export
RUN chmod +x scripts/update-build-version.sh && sh scripts/update-build-version.sh || true

# Run Expo export
RUN npx --yes expo@latest export --platform web || npx expo export --platform web

# Fix scrolling issue: inject CSS into generated index.html
RUN chmod +x scripts/fix-scroll-html.sh && sh scripts/fix-scroll-html.sh || true

# Restore placeholders (not critical if fails)
RUN chmod +x scripts/restore-build-placeholders.sh && sh scripts/restore-build-placeholders.sh || true

# 2) Nginx runtime to serve static files
FROM nginx:1.25-alpine as web

# Copy nginx config template and entrypoint to inject runtime BACKEND_BASE_URL
ENV BACKEND_BASE_URL="http://localhost:3001"
ENV NGINX_PORT=8080
ENV EXPO_PUBLIC_USE_BACKEND=1
ENV EXPO_PUBLIC_USE_FIRESTORE=0
COPY apps/mobile/web/nginx.conf /etc/nginx/templates/default.conf.template
RUN printf '#!/bin/sh\nset -e\n: "${BACKEND_BASE_URL:=http://localhost:3001}"\n: "${PORT:=8080}"\nexport NGINX_PORT="$PORT"\n\
  envsubst '\''$BACKEND_BASE_URL $NGINX_PORT'\'' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf\n\
  exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh

# Copy exported web static files from build stage
COPY --from=webbuild /app/apps/mobile/dist /usr/share/nginx/html

LABEL Name="kc-web" Version="2.0.0"
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]
