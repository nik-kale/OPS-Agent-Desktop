# Multi-stage build for OPS-Agent-Desktop Backend
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/

# Install dependencies
RUN npm ci --workspace=backend

# Install Playwright browsers
RUN npx playwright install-deps chromium
RUN npx playwright install chromium

# Build the application
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copy source code
COPY backend ./backend
COPY package.json ./

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 opsagent

# Copy necessary files
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json
COPY --from=builder /app/backend/prisma ./prisma

# Copy Playwright browsers
COPY --from=deps /root/.cache/ms-playwright /home/opsagent/.cache/ms-playwright

# Create screenshots directory
RUN mkdir -p /app/screenshots && chown -R opsagent:nodejs /app/screenshots

# Set ownership
RUN chown -R opsagent:nodejs /app

# Switch to non-root user
USER opsagent

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if(r.statusCode===200) process.exit(0); process.exit(1);})"

# Start application
CMD ["node", "dist/index.js"]
