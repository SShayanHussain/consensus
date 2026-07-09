# CLAUDE.md — Consensus

> Standing rules. Read this + ARCHITECTURE.md + DECISIONS.md + ROADMAP.md every session.
> Reuses the SaaS shell + UI kit from Deflekt (P1) for auth/layout; the agentic core is net-new.

## Product
**Consensus** — a supervisor-orchestrated multi-agent system where specialist agents research,
analyze, and draft real work using tools via MCP, with full tracing/audit and a **human-approval
gate before any consequential action**. Full PRD: `docs/03-prd-multi-agent-ops-assistant.md`.

## Stack
- **Agent core:** **Python** (LangGraph — stateful graph orchestration, checkpointing, HITL).
- **Gateway/API:** FastAPI. **UI:** Next.js console. **DB:** Postgres (state + audit). **Queue:** Redis.
- **Tools:** **MCP servers** (you run ≥1 real one). **Tracing:** LangSmith or Langfuse.
- **Auth/UI kit:** reused from Deflekt.

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
- Do NOT store secrets in code (use Secrets Manager / env); do NOT add deps without asking.
- Do NOT reach for k8s prematurely (ECS first; see DECISIONS.md).

## Guardrail policy
Input filtering (refuse out-of-policy goals) · grounded-claims-only (self-critic) · tool-use policy
(consequential tools always gated) · loop/budget ceilings · output schema validation before presenting.

## Commands
- Dev: `docker compose up` (agent + gateway + web + mcp + postgres + redis)
- Agent: `cd agent && python -m app` · Gateway: `uvicorn main:app --reload`
- Test: `pytest` (Python) / `npm test` (web) · Lint: `ruff check` / `npm run lint`
- Agent evals: `python -m evals.run` (task success, trajectory, groundedness, cost/latency)
- Load test: `python -m loadtest.agents` (concurrent runs; queue + checkpointing hold; bounded cost)

## Definition of done for a slice
Runs locally, tests/evals pass, traces visible, audit entries written, docs updated, one commit.
