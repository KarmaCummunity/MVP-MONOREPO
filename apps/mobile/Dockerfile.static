# Simple static HTML Dockerfile - NO EXPO BUILD
FROM nginx:1.25-alpine

# Copy static HTML directly
COPY public/ /usr/share/nginx/html/

# Create simple nginx config
RUN echo 'server { listen 8080; root /usr/share/nginx/html; index index.html; location / { try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

