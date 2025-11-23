# 🚀 Upgrade Guide: OPS-Agent-Desktop v2.0

This guide details the comprehensive modernization and feature additions for OPS-Agent-Desktop Version 2.0.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Breaking Changes](#breaking-changes)
3. [New Features](#new-features)
4. [Migration Steps](#migration-steps)
5. [Configuration Changes](#configuration-changes)
6. [Database Setup](#database-setup)
7. [Docker Deployment](#docker-deployment)
8. [Development Workflow](#development-workflow)

---

## Overview

Version 2.0 transforms OPS-Agent-Desktop from an MVP to a production-ready platform with:

- ✅ **Database Persistence** (PostgreSQL + Prisma)
- ✅ **Authentication & RBAC** (JWT-based with OAuth support)
- ✅ **WebSocket Communication** (replaces polling)
- ✅ **Docker Containerization** (full stack deployment)
- ✅ **Security Hardening** (rate limiting, input validation, CORS)
- ✅ **Structured Logging** (Winston with correlation IDs)
- ✅ **Testing Infrastructure** (Vitest, React Testing Library)
- ✅ **Code Quality Tools** (ESLint, Prettier, Husky)
- ✅ **CI/CD Pipeline** (GitHub Actions)

---

## Breaking Changes

### 1. Environment Configuration Required

**Before:** No environment variables needed
**After:** Must create `.env` file with required configuration

```bash
cp .env.example .env
# Edit .env with your values
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - At least 32 characters
- `REFRESH_TOKEN_SECRET` - At least 32 characters

### 2. Database Required

**Before:** In-memory Map storage
**After:** PostgreSQL database with Prisma ORM

**Migration:** Run database migrations before starting the server
```bash
cd backend
npm run prisma:migrate
```

### 3. Authentication Required

**Before:** No authentication
**After:** JWT authentication on most endpoints

**Migration:**
- Frontend must include `Authorization: Bearer <token>` header
- Use `/api/auth/register` and `/api/auth/login` endpoints

### 4. API Changes

#### Mission Creation
**Before:**
```typescript
POST /api/missions
{ "prompt": "Diagnose errors" }
```

**After:**
```typescript
POST /api/missions
Authorization: Bearer <token>
{
  "prompt": "Diagnose errors",
  "dashboardUrl": "http://...", // optional
  "priority": "NORMAL"           // optional
}
```

#### Mission Retrieval
**Before:**
```typescript
GET /api/missions/:id/stream
```

**After (HTTP still supported):**
```typescript
GET /api/missions/:id
Authorization: Bearer <token>
```

**Preferred (WebSocket):**
```typescript
// Connect to WebSocket
const socket = io('http://localhost:3001', {
  auth: { token: accessToken }
});

// Subscribe to mission updates
socket.emit('mission:subscribe', missionId);
socket.on('mission:update', (data) => { ... });
```

### 5. CORS Configuration

**Before:** All origins allowed
**After:** Only configured origins in `ALLOWED_ORIGINS`

Update your `.env`:
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8080
```

---

## New Features

### 1. Authentication & Authorization

#### User Registration
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "name": "John Doe"
}
```

#### User Login
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": { ... }
}
```

#### Token Refresh
```bash
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}
```

### 2. Role-Based Access Control (RBAC)

**Roles:**
- `ADMIN` - Full system access
- `OPERATOR` - Create and manage own missions
- `VIEWER` - Read-only access

**Example:**
```typescript
// Only admins can delete missions
DELETE /api/missions/:id
Authorization: Bearer <admin-token>
```

### 3. Real-Time WebSocket Communication

**Frontend Connection:**
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: accessToken }
});

// Subscribe to mission updates
socket.emit('mission:subscribe', missionId);

socket.on('mission:update', (mission) => {
  console.log('Mission updated:', mission);
});

socket.on('mission:step', (step) => {
  console.log('New step:', step);
});

socket.on('mission:status', ({ status }) => {
  console.log('Status changed:', status);
});
```

### 4. Approval Workflow

```typescript
// Create approval request
POST /api/approvals
{
  "missionId": "uuid",
  "actionType": "restart_service",
  "actionDetails": { "service": "checkout-api" },
  "riskLevel": "HIGH"
}

// Respond to approval
PATCH /api/approvals/:id/respond
{
  "status": "APPROVED",
  "notes": "Approved after review"
}
```

### 5. Mission Templates

```typescript
// Create template
POST /api/mission-templates
{
  "name": "Database Troubleshooting",
  "description": "Diagnose database connection issues",
  "category": "database",
  "promptTemplate": "Diagnose {{database}} connection pool exhaustion",
  "tags": ["database", "performance"]
}

// Use template
POST /api/missions/from-template/:templateId
{
  "variables": {
    "database": "checkout-db-primary"
  }
}
```

### 6. Structured Logging

**All logs now include:**
- Timestamp
- Log level (error, warn, info, debug)
- Correlation ID (for request tracing)
- Context (service, userId, missionId)

**Example:**
```json
{
  "timestamp": "2025-01-23T10:30:45.123Z",
  "level": "info",
  "message": "Mission created",
  "correlationId": "abc-123-def",
  "userId": "user-uuid",
  "missionId": "mission-uuid"
}
```

### 7. Rate Limiting

**Limits:**
- General API: 100 requests/minute
- Authentication: 5 attempts/15 minutes
- Mission creation: 10 missions/hour (configurable)

**Response (429 Too Many Requests):**
```json
{
  "error": "Too many requests, please try again later"
}
```

---

## Migration Steps

### Step 1: Backup Existing Data

If you have important missions from the old version, they're in-memory only and will be lost. No migration path available from MVP.

### Step 2: Install Dependencies

```bash
# Root
npm install

# This will install all workspace dependencies including new ones:
# - @prisma/client, prisma
# - zod, dotenv, bcrypt, jsonwebtoken
# - socket.io, winston, helmet
# - Testing libraries (vitest, @testing-library/react)
```

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ops_agent_desktop

# Security
JWT_SECRET=your-secret-key-change-this-in-production-min-32-chars
REFRESH_TOKEN_SECRET=your-refresh-token-secret-min-32-chars

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Step 4: Setup Database

```bash
# Start PostgreSQL (via Docker or local)
docker run -d \
  --name ops-agent-postgres \
  -e POSTGRES_DB=ops_agent_desktop \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine

# Run migrations
cd backend
npm run prisma:migrate
```

### Step 5: Optional Services

```bash
# Redis (for caching and queues)
docker run -d \
  --name ops-agent-redis \
  -p 6379:6379 \
  redis:7-alpine

# MinIO (for S3-compatible screenshot storage)
docker run -d \
  --name ops-agent-minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  minio/minio server /data --console-address ":9001"
```

### Step 6: Start Application

```bash
# Development mode
npm run dev

# Or with Docker Compose (recommended)
docker-compose up
```

### Step 7: Create Admin User

```bash
# Register first user (will be OPERATOR by default)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "SecurePassword123",
    "name": "Admin User"
  }'

# Promote to ADMIN via database
docker exec -it ops-agent-postgres psql -U postgres ops_agent_desktop
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

---

## Configuration Changes

### New package.json Scripts

**Root:**
```json
{
  "test": "Run all tests",
  "lint": "Run ESLint on all workspaces",
  "lint:fix": "Auto-fix linting issues",
  "format": "Format code with Prettier",
  "prepare": "Setup Husky git hooks"
}
```

**Backend:**
```json
{
  "test": "Run Vitest tests",
  "test:coverage": "Generate coverage report",
  "lint": "Run ESLint",
  "prisma:migrate": "Run database migrations",
  "prisma:studio": "Open Prisma Studio UI",
  "db:seed": "Seed database with sample data"
}
```

### New TypeScript Configurations

**Stricter compiler options:**
- `noUncheckedIndexedAccess`: true
- `strict`: true
- Better type safety

### ESLint & Prettier

Pre-commit hooks now enforce:
- No console.log (use logger instead)
- Consistent formatting
- TypeScript type checking

---

## Database Setup

### Schema Overview

**Main tables:**
- `users` - Authentication and authorization
- `missions` - Mission data (persistent)
- `mission_steps` - Execution steps
- `approvals` - Approval workflow
- `audit_logs` - Security and compliance
- `mission_templates` - Reusable templates
- `dashboard_configs` - Dashboard adapters
- `refresh_tokens` - JWT refresh tokens

### Prisma Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create migration
npm run prisma:migrate -- --name add_new_field

# Apply migrations
npm run prisma:migrate

# Open Prisma Studio (GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Seed database
npm run db:seed
```

---

## Docker Deployment

### Quick Start

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

### Production Deployment

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start with production config
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Accessing Services

- Frontend: http://localhost:8080
- Backend API: http://localhost:3001
- Mock Dashboard: http://localhost:5174
- MinIO Console: http://localhost:9001
- Prisma Studio: `npm run prisma:studio` (backend)

---

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run backend tests with coverage
cd backend && npm run test:coverage

# Run frontend tests in watch mode
cd frontend && npm run test:watch

# Run E2E tests (future)
npm run test:e2e
```

### Code Quality

```bash
# Lint all code
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format all code
npm run format

# Type check
npm run type-check
```

### Git Hooks

Pre-commit hooks (via Husky) automatically:
- Run ESLint and fix issues
- Format code with Prettier
- Run TypeScript type check

### Debugging

**Backend:**
```bash
# Enable debug logs
LOG_LEVEL=debug npm run dev:backend
```

**Database queries:**
```bash
# Prisma query logging
# Logs are automatically enabled in development
```

**WebSocket:**
```bash
# Monitor WebSocket events in browser console
socket.on('connect', () => console.log('Connected'));
socket.onAny((event, ...args) => console.log(event, args));
```

---

## Troubleshooting

### Database Connection Failed

**Error:** `Can't reach database server`

**Solution:**
```bash
# Check DATABASE_URL in .env
# Ensure PostgreSQL is running
docker ps | grep postgres

# Test connection
docker exec -it ops-agent-postgres psql -U postgres ops_agent_desktop
```

### JWT Secret Too Short

**Error:** `JWT_SECRET must be at least 32 characters`

**Solution:**
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=<generated-secret>
```

### Port Already in Use

**Error:** `EADDRINUSE: address already in use`

**Solution:**
```bash
# Find and kill process using port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port in .env
PORT=3002
```

### WebSocket Connection Failed

**Error:** `WebSocket connection failed`

**Solution:**
1. Ensure backend is running
2. Check ALLOWED_ORIGINS includes frontend URL
3. Verify token is valid and not expired

### Prisma Client Not Generated

**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
cd backend
npm run prisma:generate
```

---

## Next Steps

### Recommended Actions

1. **Enable Feature Flags** - Gradually enable new features in `.env`:
   ```env
   ENABLE_WEBSOCKET=true
   ENABLE_MULTI_MISSION=true
   ```

2. **Setup Monitoring** - Configure OpenTelemetry:
   ```env
   ENABLE_TELEMETRY=true
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   ```

3. **Configure LLM** - Add API key for mission planning:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ENABLE_LLM_PLANNING=true
   ```

4. **Setup External Integrations**:
   - AutoRCA-Core URL
   - Secure-MCP-Gateway URL
   - Real dashboard adapters (Grafana, Datadog)

5. **Production Checklist**:
   - [ ] Use strong JWT secrets
   - [ ] Enable HTTPS
   - [ ] Configure proper CORS origins
   - [ ] Setup database backups
   - [ ] Configure log aggregation
   - [ ] Enable monitoring and alerts
   - [ ] Review and adjust rate limits
   - [ ] Setup secrets vault (Vault, AWS Secrets Manager)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/nik-kale/OPS-Agent-Desktop/issues
- Documentation: See README.md and code comments
- Logs: Check `logs/` directory for detailed error logs

---

**Version:** 2.0.0
**Last Updated:** 2025-01-23
