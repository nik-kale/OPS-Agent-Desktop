# Ops-Agent-Desktop

> **A visual mission control for AI-powered SRE and support agents** — watch your autonomous Ops assistant investigate and remediate incidents in real time.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)

## 🎉 Version 2.0 - Production Ready!

**Major updates in v2.0:**
- ✅ **PostgreSQL + Prisma** - Persistent database storage
- ✅ **JWT Authentication** - Secure user authentication and RBAC
- ✅ **WebSocket Support** - Real-time updates (no more polling!)
- ✅ **Docker Deployment** - Full containerization with docker-compose
- ✅ **Security Hardening** - Rate limiting, input validation, CORS
- ✅ **Testing Infrastructure** - Vitest, React Testing Library, E2E tests
- ✅ **CI/CD Pipeline** - Automated testing and builds via GitHub Actions
- ✅ **Structured Logging** - Winston with correlation IDs

**📖 [Upgrade Guide](UPGRADE_GUIDE.md)** | **🏗️ [Architecture Docs](ARCHITECTURE.md)**

---

## What This Is

**Ops-Agent-Desktop** is a visual "mission control" interface for autonomous operations agents. It provides:

- **Command Console**: Submit high-level mission prompts like "Diagnose 500 errors on checkout service" or "Fix the Nginx error on Server 4"
- **Live Agent View**: Real-time browser automation screenshots showing exactly what your agent is doing
- **Mission Timeline**: Step-by-step event log categorized by type (OBSERVATION, ACTION, RCA, REMEDIATION)
- **RCA & Remediation Display**: Integration points for AutoRCA-Core (graph-based root cause analysis) and Secure-MCP-Gateway (policy-based action approvals)

This project demonstrates how AI-powered SRE and support agents can be made **transparent, auditable, and trustworthy** through visual feedback and clear separation between read-only observations and write interventions.

---

## Who This Is For

- **SRE/DevOps Engineers** building autonomous reliability agents
- **Platform Engineers** integrating AI into incident response workflows
- **Security Teams** requiring human-in-the-loop approvals for AI-driven actions
- **Engineering Leaders** evaluating AI-powered ops tooling
- **Researchers** exploring agent architectures for autonomous operations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER / OPERATOR                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 FRONTEND (React + TypeScript)                    │
│  ┌──────────────────────┐      ┌────────────────────────────┐  │
│  │  Command Console     │      │  Live Agent View           │  │
│  │  - Mission prompt    │      │  - Browser screenshots     │  │
│  │  - Timeline of steps │      │  - RCA summary display     │  │
│  │  - Status badges     │      │  - Remediation proposals   │  │
│  └──────────────────────┘      └────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP API + Polling
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              BACKEND (Node.js + TypeScript)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Mission Orchestration Service                           │  │
│  │  - Parses mission prompts                                │  │
│  │  - Manages mission lifecycle (PENDING → RUNNING → DONE)  │  │
│  │  - Coordinates browser automation + integrations         │  │
│  └──────────┬────────────────────────────────┬──────────────┘  │
│             │                                 │                 │
│             ▼                                 ▼                 │
│  ┌──────────────────────┐         ┌──────────────────────────┐ │
│  │  Browser Agent       │         │  Integration Stubs       │ │
│  │  (Playwright)        │         │  - AutoRCA-Core (RCA)    │ │
│  │  - Navigate dashboards│         │  - Secure-MCP-Gateway   │ │
│  │  - Capture screenshots│         │    (Action Approvals)   │ │
│  │  - Execute actions    │         │                          │ │
│  └──────────┬───────────┘         └──────────────────────────┘ │
└─────────────┼──────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MOCK OPS DASHBOARD                            │
│  - Simulated service health metrics                             │
│  - Error logs (500 errors on checkout service)                  │
│  - Quick actions (Restart Service, Scale, Rollback)             │
└─────────────────────────────────────────────────────────────────┘

FUTURE INTEGRATIONS:
┌─────────────────────────────────────────────────────────────────┐
│  - AutoRCA-Core: Graph-based RCA over logs/metrics/traces       │
│  - Secure-MCP-Gateway: Policy enforcement + human approvals     │
│  - Real dashboards: Grafana, Kibana, Datadog, PagerDuty, etc.   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🎯 High-Level Mission Prompts
Instead of writing scripts, operators type natural language commands:
- "Diagnose 500 errors on checkout service"
- "Find the root cause of database connection pool exhaustion"
- "Restart the failed Nginx service on Server 4"

### 📺 Real-Time Browser Automation
Watch your agent navigate dashboards, read logs, and interact with UIs — just like a human operator would. Every step is captured as a screenshot and logged.

### 🔍 Transparent Mission Timeline
All agent actions are categorized and timestamped:
- **OBSERVATION**: Read-only actions (viewing dashboards, reading logs)
- **ACTION**: Write interventions (restart service, scale replicas) — require gateway approval
- **RCA**: Root cause analysis steps (calling AutoRCA-Core)
- **REMEDIATION**: Proposed fixes (calling Secure-MCP-Gateway for approval)

### 🛡️ Safety & Human-in-the-Loop
Clear separation between safe observations and risky interventions. All ACTION steps are designed to flow through **Secure-MCP-Gateway** for policy-based approvals before execution.

### 🤖 Designed for Integration
Built to plug into:
- **[AutoRCA-Core](https://github.com/nik-kale/AutoRCA-Core)**: Agentic root cause analysis engine
- **[Secure-MCP-Gateway](https://github.com/nik-kale/Secure-MCP-Gateway)**: Security-first MCP gateway for ops tools
- **Real dashboards**: Grafana, Kibana, Datadog, etc. (replace mock-app with your actual stack)

---

## Quickstart

### Prerequisites

- **Node.js** 18+ and **npm** (or pnpm/yarn)
- **Playwright** browsers (will be installed automatically)

### Installation

```bash
# Clone the repository
git clone https://github.com/nik-kale/Ops-Agent-Desktop.git
cd Ops-Agent-Desktop

# Install dependencies for all workspaces
npm install

# Install Playwright browsers
npx playwright install chromium
```

### Running the Application

You'll need **three terminals** to run the full stack:

#### Terminal 1: Backend (Mission Orchestration + Browser Agent)
```bash
npm run dev:backend
# Runs on http://localhost:3001
```

#### Terminal 2: Frontend (Mission Control UI)
```bash
npm run dev:frontend
# Runs on http://localhost:5173
```

#### Terminal 3: Mock App (Simulated Ops Dashboard)
```bash
npm run dev:mock
# Runs on http://localhost:5174
```

**OR** run all three concurrently:
```bash
npm run dev
```

### Using the Application

1. **Open the Mission Control UI**: Navigate to [http://localhost:5173](http://localhost:5173)

2. **Submit a Mission**: In the command console (left panel), enter a mission prompt like:
   ```
   Diagnose 500 errors on checkout service
   ```

3. **Watch the Agent Work**:
   - The mission timeline will populate with real-time steps
   - Browser screenshots appear in the Live Agent View (right panel)
   - RCA summary and remediation proposals will appear as the mission progresses

4. **Review Results**:
   - See the root cause analysis from AutoRCA-Core (stubbed for MVP)
   - Review the proposed remediation plan
   - Observe intervention actions awaiting approval from Secure-MCP-Gateway

---

## Project Structure

```
Ops-Agent-Desktop/
├── backend/                    # Node.js + TypeScript backend
│   ├── src/
│   │   ├── api/                # Express API routes
│   │   ├── browser/            # Browser automation agent (Playwright)
│   │   ├── missions/           # Mission orchestration service
│   │   ├── types/              # TypeScript types
│   │   └── index.ts            # Server entry point
│   ├── screenshots/            # Auto-generated mission screenshots
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── components/         # UI components (CommandConsole, LiveView)
│   │   ├── hooks/              # React hooks (useMission)
│   │   ├── services/           # API client
│   │   ├── types/              # TypeScript types
│   │   ├── App.tsx             # Main app component
│   │   └── main.tsx            # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── mock-app/                   # Simulated ops dashboard
│   ├── src/
│   │   ├── App.tsx             # Mock dashboard UI
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── package.json                # Root workspace config
├── CLAUDE.md                   # Project instructions and design principles
└── README.md                   # This file
```

---

## Mission Flow Example

Here's what happens when you submit: **"Diagnose 500 errors on checkout service"**

1. **Frontend** → POST `/api/missions` → **Backend**
2. **Backend** creates a new Mission and starts the Browser Agent
3. **Browser Agent**:
   - Opens mock ops dashboard (`http://localhost:5174`)
   - Takes screenshot → **OBSERVATION** step
   - Detects error alert on dashboard → **OBSERVATION** step
   - Navigates to logs page → **OBSERVATION** step
   - Takes screenshot of error logs → **OBSERVATION** step
4. **Backend** calls AutoRCA-Core stub:
   - Analyzes logs/metrics/traces (simulated)
   - Returns RCA summary → **RCA** step
5. **Backend** calls Secure-MCP-Gateway stub:
   - Proposes remediation plan → **REMEDIATION** step
   - Awaits approval for intervention actions
6. **Browser Agent** (after approval):
   - Clicks "Restart Service" button → **ACTION** step
   - Takes final screenshot → **OBSERVATION** step
7. Mission status → **COMPLETED**

All steps are streamed to the frontend via polling and displayed in real-time.

---

## How This Fits Into an Autonomous Ops Stack

**Ops-Agent-Desktop** is one component of a larger **Autonomous Operations Fabric**:

| Component | Role |
|-----------|------|
| **[AutoRCA-Core (ADAPT-RCA)](https://github.com/nik-kale/AutoRCA-Core)** | Graph-based root cause analysis engine for logs/metrics/traces |
| **[Secure-MCP-Gateway](https://github.com/nik-kale/Secure-MCP-Gateway)** | Security-first MCP gateway with policy enforcement and human approvals |
| **Ops-Agent-Desktop** *(this project)* | Visual mission control for browser-based agent investigations |
| **[awesome-autonomous-ops](https://github.com/nik-kale/awesome-autonomous-ops)** | Curated list of tools and resources for AI-powered ops |

### Integration Points

#### AutoRCA-Core
Replace the stub in `backend/src/browser/browserAgent.ts:performRCA()` with:
```typescript
const rcaResult = await fetch('http://autorka-core:8000/analyze', {
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

#### Secure-MCP-Gateway
Replace the stub in `backend/src/browser/browserAgent.ts:proposeRemediation()` with:
```typescript
const remediation = await fetch('http://secure-mcp-gateway:8080/propose', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    rcaSummary,
    availableActions: ['restart', 'scale', 'rollback'],
  }),
});
const proposal = await remediation.json();
// Proposal will include approval_required: true/false
// For write actions, poll gateway for approval status
```

#### Real Dashboards
Replace `http://localhost:5174` in `browserAgent.ts` with:
- **Grafana**: `https://your-grafana.example.com/d/your-dashboard`
- **Kibana**: `https://your-kibana.example.com/app/logs`
- **Datadog**: `https://app.datadoghq.com/dashboard/your-dashboard`

Update the navigation logic to match your actual dashboard's DOM structure.

---

## Security and Safety Considerations

### Observation vs. Intervention

**Ops-Agent-Desktop** is designed with a clear security boundary:

| Action Type | Risk Level | Gateway Required | Example |
|-------------|-----------|------------------|---------|
| **OBSERVATION** | Low | ❌ No | Reading dashboards, viewing logs, taking screenshots |
| **RCA** | Low | ❌ No | Running analysis, generating summaries |
| **REMEDIATION (Proposal)** | Medium | ❌ No | Proposing fixes (not executing) |
| **ACTION** | High | ✅ **Yes** | Restarting services, scaling resources, modifying configs |

### Human-in-the-Loop for Write Actions

All **ACTION** steps should route through **Secure-MCP-Gateway** with:
- Policy-based allow/deny/review decisions
- Approval UI for human operators (Slack, PagerDuty, custom dashboard)
- Audit logging of all decisions and executions

### Least Privilege

- Run the Browser Agent with read-only access to dashboards where possible
- Use service accounts with minimal permissions for actions
- Never hardcode credentials (use environment variables or secret managers)

### Audit Trail

Every mission is logged with:
- Full step-by-step timeline
- Screenshots at each critical action
- Timestamps and correlation IDs
- Outcome (success/failure/approval status)

---

## Future Roadmap

- [ ] **WebSocket support** for real-time mission streaming (replace polling)
- [ ] **Multi-mission management** (run multiple missions in parallel)
- [ ] **Real AutoRCA-Core integration** (graph-based RCA engine)
- [ ] **Real Secure-MCP-Gateway integration** (policy enforcement + approvals)
- [ ] **Dashboard adapters** for Grafana, Kibana, Datadog, PagerDuty
- [ ] **LLM-based mission planning** (parse natural language prompts into action plans)
- [ ] **Approval UI** for human-in-the-loop interventions
- [ ] **Persistence layer** (save missions to database for historical review)
- [ ] **Agent telemetry** (track success rates, time-to-resolution, etc.)
- [ ] **Docker Compose setup** for one-command deployment

---

## Development

### Building for Production

```bash
# Build all workspaces
npm run build

# Start production backend
cd backend && npm start

# Serve frontend (use a static server or integrate with backend)
cd frontend && npm run preview
```

### Type Checking

```bash
# Backend
cd backend && npm run type-check

# Frontend
cd frontend && npm run type-check
```

### Adding New Mission Types

1. Define the mission logic in `backend/src/browser/browserAgent.ts`
2. Add new step types to `backend/src/types/mission.ts` if needed
3. Update UI to handle new step types in `frontend/src/components/CommandConsole.tsx`

---

## Contributing

Contributions are welcome! This is an open-source reference architecture for AI-powered autonomous operations.

**Areas for contribution:**
- Real dashboard adapters (Grafana, Kibana, Datadog, etc.)
- Additional mission templates (database troubleshooting, network diagnostics, etc.)
- Improved LLM-based mission planning
- Security hardening (sandboxing, secrets management)
- Testing (unit tests, integration tests, E2E tests)

Please open an issue or PR on GitHub.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Related Projects

Part of the **Autonomous Operations Ecosystem**:

- **[AutoRCA-Core (ADAPT-RCA)](https://github.com/nik-kale/AutoRCA-Core)** — Agentic root cause analysis engine
- **[Secure-MCP-Gateway](https://github.com/nik-kale/Secure-MCP-Gateway)** — Security-first MCP gateway for ops tools
- **[awesome-autonomous-ops](https://github.com/nik-kale/awesome-autonomous-ops)** — Curated list of AI-powered ops tools

---

## Acknowledgments

Built by **Nik Kale** as part of a broader vision for **AI-powered autonomous reliability engineering**.

Inspired by the need for **transparent, auditable, and safe** AI agents in production operations.

---

**Questions or feedback?** Open an issue or reach out via GitHub Discussions.

**Like this project?** Give it a ⭐ and share with your SRE/DevOps team!
