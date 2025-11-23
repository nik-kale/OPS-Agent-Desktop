# Multi-stage build for Mock Ops Dashboard
FROM node:18-alpine AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY mock-app/package.json ./mock-app/

RUN npm ci --workspace=mock-app

# Build application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mock-app/node_modules ./mock-app/node_modules

COPY mock-app ./mock-app
COPY package.json ./

WORKDIR /app/mock-app
RUN npm run build

# Production image - serve with nginx
FROM nginx:alpine AS runner

COPY mock-app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/mock-app/dist /usr/share/nginx/html

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8081/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
