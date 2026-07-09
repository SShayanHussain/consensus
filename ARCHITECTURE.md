# ARCHITECTURE.md — Consensus

## System overview

```
   Operator ──▶ Next.js console (goal input, live trace, approval UI)
                        │
                ┌───────▼────────┐        ┌───────────────────────────┐
                │ FastAPI gateway │───────▶│  LangGraph app            │
                │ (auth, jobs)    │        │  ┌─────────────────────┐  │
                └───────┬────────┘        │  │ Supervisor (router) │  │
                        │ enqueue long    │  └──────┬──────────────┘  │
                        │ run             │    ┌────▼────┐ ┌────────┐  │
                ┌───────▼────────┐        │    │Research │ │Analyst │  │
                │ Redis / queue  │        │    └────┬────┘ └───┬────┘  │
                │ (agent jobs)   │        │         │  ┌───────▼────┐  │
                └────────────────┘        │         │  │  Writer    │  │
                                          │         │  └────────────┘  │
                        ┌─────────────────┤   HITL checkpoint ●────────┤  ← pauses, waits for human
                        │                 │   (approval required)      │
                ┌───────▼──────┐          └───────┬──────────┬─────────┘
                │ MCP servers  │◀─────────────────┘          │
                │ search·docs· │  tool calls (traced)        │ state + checkpoints
                │ internal-data│                       ┌─────▼──────┐
                └──────────────┘                       │ Postgres   │
                                                       │ state·audit│
                ┌──────────────┐                       └────────────┘
                │ Langfuse     │◀── traces (every node, tool, token)
                │ (cloud)      │
                └──────────────┘
```

## Services
- **agent/** — the LangGraph app: supervisor + specialists (researcher, analyst, writer), the HITL
  checkpoint node, guardrails, and the loop/budget ceilings. Checkpoints to Postgres so runs survive restarts.
- **gateway/** — FastAPI: auth (from P1), starts runs, enqueues long jobs, streams status to the UI.
- **mcp/** — one or more MCP tool servers you run (search, docs/store, internal-data). Tools tagged
  read-only vs consequential.
- **web/** — Next.js console: goal input, live/replayable run trace, approvals queue, tools catalog, audit.

## Core flow
Goal → supervisor decomposes → routes to specialists → tools called via MCP (traced) → before any
consequential action, execution hits the **HITL checkpoint**: state persists, run pauses, UI shows the
proposed action + context; human approves/edits/rejects; graph resumes. Final artifact validated
against schema before presenting.

## Guardrails (enforced in the graph, visible in traces)
Input filter · grounded-claims-only self-critic · tool-use policy (consequential → gated) ·
max steps / max tool calls / budget ceiling · output validation.

## Observability + audit
- **Tracing:** Langfuse (cloud, free tier) — full trajectory (nodes, tool I/O, tokens, latency). For debugging.
- **Audit log:** separate, append-only, in Postgres, vendor-independent. For compliance/replay.

## Deployment (free-tier stack)
- **Web (Next.js):** Vercel (free tier, auto-deploy from main)
- **Gateway + Agent + MCP:** Render (free tier Docker web services)
- **Database (Postgres):** Supabase (free tier, managed Postgres with row-level security)
- **Redis (queue):** Upstash (serverless Redis, free tier)
- **Tracing:** Langfuse Cloud (free tier)

Docker Compose for local development (all 6 services). CI/CD runs agent evals as a merge gate.
