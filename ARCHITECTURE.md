# 🏗️ Architecture Documentation - OPS-Agent-Desktop v2.0

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Flow](#data-flow)
5. [Security Architecture](#security-architecture)
6. [Scalability Considerations](#scalability-considerations)
7. [Integration Points](#integration-points)

---

## System Overview

OPS-Agent-Desktop v2.0 is a production-ready platform for AI-powered autonomous operations with a modern, scalable architecture.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React Frontend (Vite)                                    │  │
│  │  - Command Console UI                                     │  │
│  │  - Live Agent View                                        │  │
│  │  - WebSocket Client (Socket.io)                          │  │
│  │  - Authentication State Management                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS / WSS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Express.js Backend (TypeScript)                          │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Security Middleware Layer                         │  │  │
│  │  │  - Helmet (security headers)                       │  │  │
│  │  │  - CORS (origin validation)                        │  │  │
│  │  │  - Rate Limiting (express-rate-limit)             │  │  │
│  │  │  - Input Validation (Zod schemas)                 │  │  │
│  │  │  - Authentication (JWT verification)              │  │  │
│  │  │  - Logging (Winston + Correlation IDs)            │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  API Routes (REST + WebSocket)                     │  │  │
│  │  │  - /api/auth/* - Authentication endpoints         │  │  │
│  │  │  - /api/missions/* - Mission CRUD                 │  │  │
│  │  │  - /api/approvals/* - Approval workflow           │  │  │
│  │  │  - /api/templates/* - Mission templates           │  │  │
│  │  │  - /socket.io - WebSocket connections             │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Business Logic Layer                              │  │  │
│  │  │  - AuthService (JWT, OAuth, password hashing)     │  │  │
│  │  │  - MissionService (orchestration, state mgmt)     │  │  │
│  │  │  - BrowserAgent (Playwright automation)           │  │  │
│  │  │  - ApprovalService (workflow management)          │  │  │
│  │  │  - WebSocketServer (real-time messaging)          │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  Data Access Layer (Repository Pattern)            │  │  │
│  │  │  - MissionRepository                               │  │  │
│  │  │  - UserRepository                                  │  │  │
│  │  │  - ApprovalRepository                              │  │  │
│  │  │  - AuditLogRepository                              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  PostgreSQL     │  │  Redis          │  │  MinIO/S3       │ │
│  │  (Prisma ORM)   │  │  (Cache/Queue)  │  │  (Screenshots)  │ │
│  │                 │  │                 │  │                 │ │
│  │  - Users        │  │  - Sessions     │  │  - Images (PNG) │ │
│  │  - Missions     │  │  - Job Queue    │  │  - Videos       │ │
│  │  - Steps        │  │  - Rate Limits  │  │  - Retention    │ │
│  │  - Approvals    │  │  - Pub/Sub      │  │    30 days      │ │
│  │  - Audit Logs   │  │                 │  │                 │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │  AutoRCA-Core    │  │  Secure-MCP-     │  │  Dashboards  │ │
│  │  (RCA Engine)    │  │  Gateway         │  │  (Grafana,   │ │
│  │                  │  │  (Approvals)     │  │   Datadog)   │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Component        | Technology                     | Purpose                      |
| ---------------- | ------------------------------ | ---------------------------- |
| **Framework**    | React 18.2                     | UI component library         |
| **Build Tool**   | Vite 5.0                       | Fast dev server and bundler  |
| **Language**     | TypeScript 5.3                 | Type-safe development        |
| **WebSocket**    | Socket.io-client               | Real-time updates            |
| **Validation**   | Zod                            | Client-side input validation |
| **Sanitization** | DOMPurify                      | XSS prevention               |
| **Testing**      | Vitest + React Testing Library | Unit and component tests     |
| **Linting**      | ESLint + Prettier              | Code quality                 |

### Backend

| Component      | Technology                 | Purpose                    |
| -------------- | -------------------------- | -------------------------- |
| **Runtime**    | Node.js 18+                | JavaScript runtime         |
| **Framework**  | Express 4.18               | Web server                 |
| **Language**   | TypeScript 5.3             | Type-safe development      |
| **Database**   | PostgreSQL 16              | Primary data store         |
| **ORM**        | Prisma 5.8                 | Type-safe database access  |
| **Cache**      | Redis 7                    | Session and cache store    |
| **Queue**      | BullMQ                     | Job queue (future)         |
| **WebSocket**  | Socket.io                  | Real-time communication    |
| **Auth**       | JWT + bcrypt               | Authentication             |
| **Automation** | Playwright                 | Browser automation         |
| **Logging**    | Winston                    | Structured logging         |
| **Validation** | Zod                        | Input validation           |
| **Security**   | Helmet, express-rate-limit | Security middleware        |
| **Testing**    | Vitest + Supertest         | Unit and integration tests |

### Infrastructure

| Component            | Technology              | Purpose                       |
| -------------------- | ----------------------- | ----------------------------- |
| **Containerization** | Docker + Docker Compose | Deployment                    |
| **Reverse Proxy**    | Nginx                   | Static file serving, proxying |
| **Object Storage**   | MinIO (S3-compatible)   | Screenshot storage            |
| **CI/CD**            | GitHub Actions          | Automated testing and builds  |
| **Observability**    | OpenTelemetry (future)  | Distributed tracing           |

---

## Architecture Patterns

### 1. Repository Pattern

**Purpose:** Separate data access logic from business logic

**Implementation:**

```typescript
// Repository encapsulates database operations
export class MissionRepository {
  async create(data: CreateMissionData): Promise<Mission> {
    return prisma.mission.create({ data });
  }

  async findById(id: string): Promise<Mission | null> {
    return prisma.mission.findUnique({ where: { id } });
  }
}

// Service uses repository
export class MissionService {
  constructor(private repo: MissionRepository) {}

  async createMission(prompt: string, userId: string) {
    return this.repo.create({ prompt, userId });
  }
}
```

**Benefits:**

- Testable (can mock repository)
- Centralized data access
- Easy to switch databases

### 2. Middleware Pipeline

**Purpose:** Composable request processing

**Implementation:**

```typescript
app.use(helmet()); // Security headers
app.use(cors()); // CORS validation
app.use(express.json()); // JSON parsing
app.use(requestLogger); // Logging
app.use(generalRateLimiter); // Rate limiting
app.use(requireAuth); // Authentication
app.use(requireRole('OPERATOR')); // Authorization
app.use(routes); // Route handlers
app.use(errorHandler); // Error handling
```

**Benefits:**

- Separation of concerns
- Reusable middleware
- Clear request flow

### 3. WebSocket Event-Driven Architecture

**Purpose:** Real-time, bi-directional communication

**Implementation:**

```typescript
// Server emits events
wsServer.emitMissionUpdate(missionId, mission);
wsServer.emitMissionStep(missionId, step);

// Client subscribes to events
socket.emit('mission:subscribe', missionId);
socket.on('mission:update', handleUpdate);
```

**Benefits:**

- Low latency (no polling)
- Efficient resource usage
- Scalable (can use Redis adapter)

### 4. Service Layer Pattern

**Purpose:** Business logic encapsulation

**Layers:**

1. **Controllers** - HTTP request/response handling
2. **Services** - Business logic
3. **Repositories** - Data access

**Example:**

```typescript
// Controller
router.post('/missions', async (req, res) => {
  const mission = await missionService.create(req.body, req.user!.userId);
  res.json(mission);
});

// Service
class MissionService {
  async create(data: CreateMissionInput, userId: string) {
    const mission = await missionRepo.create({ ...data, userId });
    await browserAgent.executeMission(mission.id, data.prompt);
    return mission;
  }
}
```

### 5. Configuration Management

**Purpose:** Environment-based configuration

**Implementation:**

```typescript
// Validated configuration from .env
export const config = configSchema.parse({
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  // ... all other config
});
```

**Benefits:**

- Type-safe configuration
- Validation on startup
- Single source of truth

---

## Data Flow

### Mission Creation Flow

```
1. User submits mission prompt in frontend
   │
   ├──> Frontend validates input (Zod)
   │
   └──> POST /api/missions
        │
        ├──> Middleware pipeline:
        │    - Authentication (JWT verification)
        │    - Rate limiting (10 missions/hour)
        │    - Input validation (Zod schema)
        │    - Logging (correlation ID)
        │
        ├──> Mission Controller
        │    │
        │    └──> Mission Service
        │         │
        │         ├──> Mission Repository
        │         │    └──> Prisma → PostgreSQL
        │         │         (INSERT mission record)
        │         │
        │         ├──> Audit Log
        │         │    └──> (Log mission creation)
        │         │
        │         └──> Browser Agent (async)
        │              │
        │              ├──> Playwright launches browser
        │              │
        │              ├──> Navigate to dashboard
        │              │    └──> Screenshot captured
        │              │         └──> Saved to MinIO/S3
        │              │              └──> Mission Step created
        │              │                   └──> WebSocket emits step
        │              │
        │              ├──> Perform RCA (call AutoRCA-Core)
        │              │    └──> RCA Summary stored
        │              │         └──> WebSocket emits update
        │              │
        │              ├──> Request Approval (Secure-MCP-Gateway)
        │              │    └──> Approval record created
        │              │         └──> WebSocket emits approval request
        │              │
        │              └──> Execute action (if approved)
        │                   └──> Mission status updated
        │                        └──> WebSocket emits completion
        │
        └──> Response with mission ID
             │
             └──> Frontend subscribes to WebSocket
                  └──> Real-time updates displayed
```

### Authentication Flow

```
1. User registers
   │
   └──> POST /api/auth/register
        │
        ├──> Validate input (Zod)
        ├──> Hash password (bcrypt, 12 rounds)
        ├──> Create user in database
        └──> Return success (no auto-login)

2. User logs in
   │
   └──> POST /api/auth/login
        │
        ├──> Find user by email
        ├──> Verify password (bcrypt.compare)
        ├──> Generate JWT access token (24h expiry)
        ├──> Generate refresh token (7d expiry)
        ├──> Store refresh token in database
        ├──> Update lastLoginAt timestamp
        └──> Return { accessToken, refreshToken, user }

3. Authenticated request
   │
   └──> GET /api/missions (with Authorization header)
        │
        ├──> Extract Bearer token
        ├──> Verify JWT signature
        ├──> Check expiration
        ├──> Attach user to req.user
        └──> Process request

4. Token refresh
   │
   └──> POST /api/auth/refresh
        │
        ├──> Verify refresh token signature
        ├──> Check if revoked in database
        ├──> Revoke old refresh token
        ├──> Generate new access + refresh tokens
        └──> Return new tokens
```

---

## Security Architecture

### Defense in Depth

**Layer 1: Network**

- Docker network isolation
- Firewall rules (production)
- HTTPS/TLS encryption

**Layer 2: Application**

- Helmet (security headers)
- CORS (origin validation)
- Rate limiting (DDoS protection)
- Input validation (Zod schemas)
- XSS protection (DOMPurify)

**Layer 3: Authentication**

- JWT with strong secrets (32+ chars)
- Refresh token rotation
- Password hashing (bcrypt, 12 rounds)
- OAuth 2.0 support

**Layer 4: Authorization**

- Role-based access control (RBAC)
- Resource ownership checks
- Admin-only endpoints

**Layer 5: Data**

- Encrypted database connections
- Secure credential storage
- Audit logging (immutable)

### Threat Model

| Threat                | Mitigation                           |
| --------------------- | ------------------------------------ |
| **SQL Injection**     | Prisma parameterized queries         |
| **XSS**               | DOMPurify sanitization + CSP headers |
| **CSRF**              | CORS + SameSite cookies              |
| **Brute Force**       | Rate limiting (5 attempts/15min)     |
| **Token Theft**       | Short-lived JWTs + refresh rotation  |
| **MITM**              | HTTPS/TLS + HSTS headers             |
| **DoS**               | Rate limiting + request size limits  |
| **Session Hijacking** | Secure cookies + JWT expiration      |

### Audit Logging

**All actions logged:**

- User authentication (login, logout, failed attempts)
- Mission creation and updates
- Approval decisions
- Role changes
- Configuration changes

**Log fields:**

- Timestamp (ISO 8601)
- User ID
- IP address
- Action type
- Resource ID
- Success/failure
- Changes (before/after)

**Retention:** 90 days (configurable)

---

## Scalability Considerations

### Current Capacity

- **Concurrent missions:** 3 (configurable via `MAX_CONCURRENT_MISSIONS`)
- **Browser instances:** 5 (pooled)
- **WebSocket connections:** 1000+ (single instance)
- **Database:** Handles 100+ missions/day

### Horizontal Scaling (Future v3.0)

**Stateless Services:**

```
┌──────────────┐      ┌──────────────┐
│  Frontend    │      │  Frontend    │
│  Instance 1  │      │  Instance 2  │
└──────┬───────┘      └──────┬───────┘
       │                     │
       └─────────┬───────────┘
                 │
         ┌───────▼────────┐
         │  Load Balancer │
         │  (Nginx/HAProxy)│
         └───────┬────────┘
                 │
       ┌─────────┼─────────┐
       │         │         │
  ┌────▼───┐ ┌──▼────┐ ┌──▼────┐
  │Backend │ │Backend│ │Backend│
  │   1    │ │   2   │ │   3   │
  └────┬───┘ └───┬───┘ └───┬───┘
       │         │         │
       └─────────┼─────────┘
                 │
      ┌──────────┼──────────┐
      │          │          │
  ┌───▼───┐  ┌──▼───┐  ┌───▼───┐
  │Postgres│ │ Redis│  │ MinIO │
  │(Primary)│ │Cluster│ │Cluster│
  └────────┘ └──────┘  └───────┘
```

**Required changes:**

- Redis for session storage (not in-memory)
- Redis adapter for Socket.io (multi-instance)
- Shared PostgreSQL with connection pooling
- Browser worker nodes (separate pool)

### Database Scaling

**Current:**

- Single PostgreSQL instance
- Indexed queries (userId, status, createdAt)
- Connection pooling (Prisma default)

**Future:**

- Read replicas (for analytics)
- TimescaleDB extension (time-series data)
- Partitioning (by createdAt)
- Database sharding (by userId)

---

## Integration Points

### 1. AutoRCA-Core (Root Cause Analysis)

**Current:** Stubbed with mock data
**Future v3.0:** HTTP API integration

```typescript
// Integration point: backend/src/browser/browserAgent.ts:performRCA()
const rcaResult = await fetch(`${config.autorcaCoreUrl}/analyze`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    logs: extractedLogs,
    metrics: extractedMetrics,
    traces: extractedTraces,
    timeWindow: { start: incident.startTime, end: 'now' },
  }),
});

const rcaSummary = await rcaResult.json();
```

### 2. Secure-MCP-Gateway (Approval Workflow)

**Current:** Stubbed with mock approval
**Future v3.0:** HTTP API + WebSocket integration

```typescript
// Integration point: backend/src/browser/browserAgent.ts:proposeRemediation()
const remediation = await fetch(`${config.secureMcpGatewayUrl}/propose`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rcaSummary,
    availableActions: ['restart', 'scale', 'rollback'],
  }),
});

const proposal = await remediation.json();

if (proposal.approval_required) {
  // Create approval record and wait
  const approval = await approvalService.create({
    missionId,
    actionType: proposal.action,
    actionDetails: proposal.details,
  });

  // Wait for approval via WebSocket
  await approvalService.waitForApproval(approval.id);
}
```

### 3. Dashboard Adapters (v3.0)

**Pluggable architecture:**

```typescript
// Base interface
interface DashboardAdapter {
  connect(): Promise<void>;
  navigate(url: string): Promise<void>;
  screenshot(): Promise<Buffer>;
  extractMetrics(): Promise<Metrics>;
  extractLogs(): Promise<LogEntry[]>;
}

// Concrete implementations
class GrafanaAdapter implements DashboardAdapter { ... }
class KibanaAdapter implements DashboardAdapter { ... }
class DatadogAdapter implements DashboardAdapter { ... }

// Factory
const adapter = DashboardAdapterFactory.create(dashboardType);
```

---

## Future Architecture (v3.0 - v4.0)

### Microservices (v3.0)

```
API Gateway → Mission Orchestrator → [ Browser Workers ]
           ↓                        ↓
     RCA Engine               Message Queue (RabbitMQ/Kafka)
           ↓
     Approval Service
```

### Event Sourcing (v4.0)

```
Events → Event Store → Projections → Read Models
                  ↓
            Command Handlers
```

### Multi-Tenancy (v4.0)

```
Organization A → [ Isolated DB Schema ]
Organization B → [ Isolated DB Schema ]
Organization C → [ Isolated DB Schema ]
```

---

**Version:** 2.0.0
**Last Updated:** 2025-01-23
