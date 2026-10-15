# Multi-stage build for OPS-Agent-Desktop Backend
# Debian rather than Alpine: Playwright's Chromium and its system
# dependencies are only supported on glibc distributions.
FROM node:22-bookworm-slim AS base

# Prisma's query and schema engines need OpenSSL, which the slim image omits
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies. npm workspaces hoist everything into /app/node_modules.
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json ./backend/

RUN npm ci --workspace=backend

# Build the application
FROM deps AS builder
WORKDIR /app

COPY backend ./backend

WORKDIR /app/backend
RUN npx prisma generate && npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs --create-home opsagent

# Copy necessary files (node_modules includes the generated Prisma client
# and the Prisma CLI used by `prisma migrate deploy` in docker-compose)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/prisma ./prisma

# Install Chromium and its system libraries where the opsagent user looks for them
RUN PLAYWRIGHT_BROWSERS_PATH=/home/opsagent/.cache/ms-playwright \
    npx playwright install --with-deps chromium \
  && rm -rf /var/lib/apt/lists/*

# Create screenshots and logs directories
RUN mkdir -p /app/screenshots /app/logs

# Set ownership of the paths the app writes to
RUN chown -R opsagent:nodejs /app/screenshots /app/logs /home/opsagent

# Switch to non-root user
USER opsagent

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if(r.statusCode===200) process.exit(0); process.exit(1);})"

# Start application
CMD ["node", "dist/index.js"]
