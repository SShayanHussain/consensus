# GEMINI.md — Consensus

> Standing rules. Read this + ARCHITECTURE.md + DECISIONS.md + ROADMAP.md every session.
> Read PLAYBOOK.md before writing any deployment, CI/CD, database, or AI-pipeline code. Its rules are mandatory.
> Reuses the SaaS shell + UI kit from Deflekt (P1) for auth/layout; the agentic core is net-new.

## Product
**Consensus** — a supervisor-orchestrated multi-agent system where specialist agents research,
analyze, and draft real work using tools via MCP, with full tracing/audit and a **human-approval
gate before any consequential action**. Full PRD: `docs/03-prd-multi-agent-ops-assistant.md`.

## Stack
- **Agent core:** **Python** (LangGraph — stateful graph orchestration, checkpointing, HITL).
- **Gateway/API:** FastAPI. **UI:** Next.js console. **DB:** Postgres (state + audit). **Queue:** Redis.
- **Tools:** **MCP servers** (you run ≥1 real one). **Tracing:** Langfuse (cloud, free tier).
- **Auth/UI kit:** reused from Deflekt, rebranded with mission-control dark theme.
- **Deploy:** Supabase (Postgres) + Vercel (web) + Render (gateway, agent, MCP) + Upstash (Redis).

## How to work (enforce)
1. **Design the LangGraph state schema + node graph FIRST, and get it approved before implementation.**
2. **Plan before code**; vertical slices; small commits.
3. **Update DECISIONS.md** (esp. LangGraph-vs-CrewAI, MCP, HITL); check off ROADMAP.md.
4. **Explain tradeoffs** and show them in traces.

## Conventions
- Structure: `agent/` (LangGraph app), `gateway/` (FastAPI), `mcp/` (MCP servers), `web/`, `packages/ui/`, `docs/`.
- Every tool is classified **read-only** vs **consequential**. Consequential → routes through HITL gate.
- Audit log is written independently of the tracing vendor and is append-only.

## Hard rules — do NOT
- Do NOT execute a consequential action without passing the HITL approval checkpoint.
- Do NOT emit a factual claim without a citation to something the researcher actually retrieved
  (unsupported claims are stripped/flagged by the self-critic).
- Do NOT let the supervisor loop unbounded — enforce max steps / max tool calls / budget ceiling per run.
- Do NOT let a run lose state on restart — use LangGraph checkpointing (runs pause for approval for hours).
- Do NOT store secrets in code (use env vars); do NOT add deps without asking.
- Do NOT fabricate mock data, fallback text, or fake success states (PLAYBOOK Golden Rule 1).

## Guardrail policy
Input filtering (refuse out-of-policy goals) · grounded-claims-only (self-critic) · tool-use policy
(consequential tools always gated) · loop/budget ceilings · output schema validation before presenting.

## Commands
- Dev: `docker compose up` (agent + gateway + web + mcp + postgres + redis)
- Web: `cd web && npm run dev` · Gateway: `cd gateway && uvicorn app.main:app --reload`
- Test: `pytest` (Python) / `npm test` (web) · Lint: `ruff check` / `npm run lint`
- Agent evals: `python -m evals.run` (task success, trajectory, groundedness, cost/latency)

## Definition of done for a slice
Runs locally, tests/evals pass, traces visible, audit entries written, docs updated, one commit.
