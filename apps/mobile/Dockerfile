# Web frontend Dockerfile — KC Vision Web (Vite static SPA + Nginx)
# Historical path: apps/mobile/Dockerfile (Railway / CI).
#
# Build context MUST be the monorepo root (`.`). If the platform sets Root Directory
# to apps/mobile only, COPY apps/kc-vision-web/... fails — clear Root Directory and
# set dockerfilePath to apps/mobile/Dockerfile instead (see apps/mobile/railway.toml).

FROM node:20-alpine AS webbuild
WORKDIR /app/apps/kc-vision-web

COPY apps/kc-vision-web/package.json ./
RUN npm install --legacy-peer-deps

COPY apps/kc-vision-web ./
# PRD viewer uses import.meta.glob from monorepo docs/ (see PRDViewerPage.tsx).
# Local dev has the full repo; Docker previously copied only apps/kc-vision-web, so
# production builds bundled zero markdown files. Mirror the path Vite resolves to:
# .../src/modules/prd -> ../../../../.. -> /app, then docs/SSOT/PRD_HE_V2.
COPY docs/SSOT/PRD_HE_V2 /app/docs/SSOT/PRD_HE_V2
RUN npm run build

FROM nginx:1.25-alpine AS web

ENV BACKEND_BASE_URL="http://localhost:3001"
ENV NGINX_PORT=8080
ENV EXPO_PUBLIC_USE_BACKEND=1
ENV EXPO_PUBLIC_USE_FIRESTORE=0

COPY apps/mobile/web/nginx.conf /etc/nginx/templates/default.conf.template
RUN printf '#!/bin/sh\nset -e\n: "${BACKEND_BASE_URL:=http://localhost:3001}"\n: "${PORT:=8080}"\nexport NGINX_PORT="$PORT"\n\
  envsubst '\''$BACKEND_BASE_URL $NGINX_PORT'\'' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf\n\
  exec nginx -g "daemon off;"\n' > /docker-entrypoint.sh \
  && chmod +x /docker-entrypoint.sh

COPY --from=webbuild /app/apps/kc-vision-web/dist /usr/share/nginx/html

LABEL Name="kc-vision-web" Version="1.0.0"
EXPOSE 8080
CMD ["/docker-entrypoint.sh"]

