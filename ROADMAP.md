# ROADMAP.md — Consensus

> Build top to bottom. **Graph design approved before implementation.** Check off as you go.

## Phase 0 — Foundation
- [/] Repo structure (`agent/`, `gateway/`, `mcp/`, `web/`, `packages/ui/`, `docs/`)
- [x] Docs committed (CLAUDE, GEMINI, ARCHITECTURE, DECISIONS, ROADMAP, .env.example, PRD)
- [/] Copy SaaS shell + UI kit + auth from Deflekt (P1); rebrand with mission-control theme
- [x] docker-compose (agent + gateway + web + mcp + postgres + redis)
- [x] CI stub (lint + test + build/push with SHA tags)

## Phase 1 — Graph design (NO implementation until approved)
- [x] LangGraph state schema defined
- [x] Node graph: supervisor + researcher + analyst + writer + HITL checkpoint
- [x] Tool interface + read-only vs consequential classification
- [x] Checkpointing/persistence approach (Postgres)

## Phase 2 — Minimal agentic loop
- [x] Supervisor → researcher loop with ONE read-only MCP tool
- [x] Tracing wired (Langfuse) — see nodes, tool I/O, tokens, latency
- [x] Runs enqueued as long jobs (Redis); status streamed to a bare console

## Phase 3 — Full crew
- [x] Add analyst + writer specialists
- [x] Supervisor routing + "done" decision
- [x] Final artifact assembled + schema-validated

## Phase 4 — Human-in-the-loop (the flagship slice)
- [x] HITL checkpoint: pause before consequential action, persist state
- [x] Approvals UI: proposed action + full context; approve/edit/reject → resume
- [x] **Test: run pauses, survives a process restart while paused, then resumes**

## Phase 5 — Guardrails
- [x] Input filtering (refuse out-of-policy goals)
- [x] Grounded-claims-only self-critic (strip/flag unsupported claims)
- [x] Tool-use policy (consequential tools always gated)
- [x] Loop/budget ceilings (max steps/tool-calls/cost) — visible in traces

## Phase 6 — Observability + audit
- [x] Independent append-only audit log (Postgres)
- [x] Run is fully replayable from trace + audit
- [x] ≥1 real MCP tool server running (search/docs/internal-data)

## Phase 7 — Evals + load + ship
- [x] Agent evals: task success, trajectory quality, groundedness, cost/latency per task
- [x] CI gate on task-success + groundedness
- [x] Concurrent agent-loop load test (queue + checkpointing hold; bounded cost)
- [x] Deploy: Vercel/Render/Supabase - Managed Free Tiers
- [x] Plan-gating (runs/mo + which tools enabled)
- [x] README: architecture, DECISIONS narrative, demo, eval + load artifacts
