# PRD 03 — Multi-Agent Ops Assistant (LangGraph + Human-in-the-Loop)

> **Role in portfolio:** The agentic flagship. This is the project that matches the market's actual
> definition of a *production* agent: observable tool use, audit trails, and a human-approval gate
> before real actions. Primary domains: **Agentic AI (LangGraph, MCP, multi-agent orchestration,
> guardrails, agent observability) + queues + AWS.**
> **Suggested stack:** **Python** for the agent layer (LangGraph is Python-first and the ecosystem —
> LangSmith/Langfuse, MCP SDKs — is strongest there). FastAPI to expose it; Next.js for the
> approval/console UI; Postgres for state/audit; Redis/queue for long-running agent jobs. Tracing:
> **LangSmith or Langfuse.**

---

## 0. Product profile

- **Product name:** **Consensus** (alt: *Delegate*, *Cohort*, *Overwatch*)
- **Tagline:** "Agents that do the work. You approve what matters."
- **One-liner positioning:** Consensus runs a team of AI agents that research, analyze, and draft
  real work using your tools — with a full audit trail and a human-approval gate before anything
  consequential happens.
- **Category:** Agentic AI ops / multi-agent knowledge-work assistant (with human-in-the-loop).
- **Who pays:** ops, research, and compliance teams who want agents to *do* multi-step work but will
  only deploy with oversight and auditability. Value = hours of skilled work compressed, with trust.
- **Pricing concept:** Free (limited runs, read-only tools) · Pro (more runs, action tools, tracing) ·
  Team (seats, audit export, SSO). Gate monthly agent-runs + which tools are enabled.
- **Visual theme:** "mission control." Serious, dense-but-legible, dark-mode-first. The signature UI
  is a **live run view**: the agent graph animating as the supervisor routes to specialists, a
  streaming trace panel, and a prominent **approval card** that slides in when a consequential action
  is proposed. Confidence, sources, and the audit log are always one click away. Think Datadog-meets-
  a-command-console.

## 0b. SaaS surface / page map

**Public:** landing (show the approval-gate concept in the hero) · pricing · login · signup · reset · verify.

**Onboarding (first-run):** create workspace → connect/enable tools (start read-only) → set which
actions require approval → run a starter goal → watch the agents work → approve the final action.
Seeing the approval gate fire is the activation moment.

**Authenticated app (shell: top bar + left nav):**
- **Dashboard** — active/recent runs, pending approvals (badge), task success rate, spend this month.
- **Runs** — start a new run (enter a goal); list of past/active runs with status; open a run for the
  **live/replayable trace**: agent graph, every node, every tool call, tokens, latency.
- **Approvals** — the queue of runs paused awaiting a human decision; each shows the proposed action +
  full context; approve / edit / reject → resumes the run.
- **Tools (MCP)** — the tool catalog: which MCP tools are connected, read-only vs consequential,
  enable/disable, per-tool approval policy.
- **Audit** — immutable-ish log of every action taken across all runs (for compliance/review); export.
- **Settings** — profile · workspace · team/members (owner/member/reviewer) · guardrail policy ·
  plan/billing · API keys.

**Auth:** JWT access + refresh (httpOnly), verification, reset, role-guarded (reviewer can approve but
not change tool policy; owner can), workspace-scoped runs, audit, and tools.

---

## 1. Problem & opportunity

Knowledge and ops work — research, competitive intel, compliance prep, drafting reports from
scattered sources — is slow and manual. Naive single-shot LLM tools help a little but aren't
*trusted to act*, because they hallucinate, can't be audited, and take irreversible actions with no
oversight. The market has converged on a clear bar for "production agent": **it takes actions on
real systems, every action is observable and logged, and a human approves anything consequential
before it happens.**

**The gap:** teams want an assistant that can *do multi-step work across tools* — not just chat —
but they will only deploy it if there's an audit trail and an approval gate. That combination is
exactly what most demo-grade agents lack, and exactly what makes this a strong, differentiated
build.

**Concrete domain to anchor it (pick one):** e.g. **competitive/market intelligence** or
**compliance-prep ops** — a supervisor agent coordinates specialists (researcher, analyst, writer)
to produce a sourced report, and **any external action** (send the report, file the record, post to
a system) requires human approval.

---

## 2. What it is (one sentence)

A supervisor-orchestrated multi-agent system where specialist agents (research, analysis, drafting)
collaborate on a task using real tools via MCP, every step is traced and audited, and a
**human-approval checkpoint** gates any consequential action before it executes.

---

## 3. Users & core stories

- **Operator**: "I give it a goal ('prepare a competitive brief on X'), watch the agents work with
  full visibility, and approve/reject the final action (send/file/post) before anything real happens."
- **Reviewer/compliance**: "I can replay exactly what the agent did, which tools it called, what it
  retrieved, and why — a full audit trail."
- **Admin**: "I define which tools exist, which actions require approval, and the guardrail policy."

---

## 4. Scope

### In scope (MVP)
1. **Supervisor + 2–3 specialist agents** via **LangGraph** (explicit graph state, not a free-for-all).
   - *Supervisor*: decomposes the goal, routes to specialists, decides when done.
   - *Researcher*: gathers info via tools (web/search MCP, internal doc retrieval).
   - *Analyst*: synthesizes, checks consistency.
   - *Writer*: produces the final artifact.
2. **Tools via MCP servers**: at least one real MCP tool server you run (e.g. a document/store tool,
   a search tool, an internal-data tool). Shows you understand MCP as the tool-integration standard.
3. **Human-in-the-loop gate**: LangGraph checkpoint that **pauses** before any consequential action;
   the UI surfaces the proposed action + full context; human approves/edits/rejects; graph resumes.
4. **Guardrails**: input filtering, output validation, and a **tool-use policy** (which tools/actions
   are high-risk and always require approval). Hallucination controls on any factual claim (must cite).
5. **Observability**: full tracing (LangSmith/Langfuse) — every node, tool call, token, latency —
   plus a persisted **audit log** independent of the tracing vendor.
6. **Durable, resumable runs**: agent jobs are long-running; use LangGraph checkpointing so a run
   survives restarts and can pause for hours awaiting approval.

### Out of scope (MVP)
- Fully autonomous action without approval (deliberately — the gate is the product).
- Fine-tuning (P4).
- A huge tool catalog (2–4 well-built MCP tools > 20 flaky ones).

---

## 5. Architecture

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
                        ┌─────────────────┤   HITL checkpoint ●────────┤  ← pauses here,
                        │                 │   (approval required)      │    waits for human
                ┌───────▼──────┐          └───────┬──────────┬─────────┘
                │ MCP servers  │◀─────────────────┘          │
                │ search·docs· │  tool calls (traced)        │ state + checkpoints
                │ internal-data│                       ┌─────▼──────┐
                └──────────────┘                       │ Postgres   │
                                                       │ state·audit│
                ┌──────────────┐                       └────────────┘
                │ LangSmith /  │◀── traces (every node, tool, token)
                │ Langfuse     │
                └──────────────┘
```

**Key decisions (own these explicitly):**

- **LangGraph over CrewAI for the orchestration.** Tradeoff you must be able to defend:
  *CrewAI is faster to get a role-based prototype running (~20 lines, "team" metaphor), but this
  project needs durable state, explicit control flow, checkpointing, and human-in-the-loop pauses
  that survive restarts — LangGraph models the workflow as a state machine you can pause, resume,
  and replay.* That replayability is the audit story. You may prototype the roles in CrewAI to move
  fast, then rebuild the production graph in LangGraph — a legitimate, defensible path (mention it).
- **MCP for tools, not bespoke function-calling glue.** MCP is the emerging standard for connecting
  agents to tools/data; running your own MCP server shows you're current. Tradeoff: slightly more
  setup than inline functions, but portable and inspectable.
- **HITL as a first-class graph node, not an afterthought.** The approval gate is a checkpoint that
  persists state and waits. This is *the* production-readiness signal.
- **Audit log separate from tracing vendor.** LangSmith/Langfuse is for you (debugging); the audit
  log is for compliance and must be vendor-independent and immutable-ish.

---

## 6. Guardrails & hallucination control (dedicated section — this is graded hard)

- **Input**: filter/repair malformed or unsafe goals; refuse out-of-policy requests.
- **Grounding**: any factual claim in the output must carry a citation to something the researcher
  actually retrieved; a validator strips or flags unsupported claims (self-critic pass — the same
  idea you'll deepen in P4).
- **Tool-use policy**: a declarative list of which tools/actions are "consequential" → always route
  through the HITL gate. Read-only tools can run freely; anything that changes external state cannot.
- **Loop control**: max steps / max tool calls / budget ceiling per run so the supervisor can't spin
  forever (this is a real failure mode — agents stuck in loops burn tokens). Trace shows the guard.
- **Output validation**: final artifact validated against a schema before it's presentable.

---

## 7. Observability & evals for agents

- **Tracing**: LangSmith or Langfuse — full trajectory: node transitions, tool inputs/outputs,
  token/cost per step, latency. You will use this constantly to debug the supervisor's routing.
- **Agent evals** (harder than RAG evals — this is a differentiator to show):
  - *Task success rate* on a fixed set of goals (did it produce a correct, sourced artifact?).
  - *Trajectory quality* — did it call the right tools in a sane order, or thrash?
  - *Groundedness* — unsupported-claim rate in outputs.
  - *Cost/latency per task* — and does it stay under the loop-budget ceiling?
- **Agent-loop load test**: run many agent tasks concurrently and show the queue + checkpointing
  hold, cost stays bounded, and no run wedges. This is the "load-testing agent loops specifically"
  item from your guide — most people skip it; don't.

---

## 8. Deployment & CI/CD

- **Docker**: langgraph/agent service, FastAPI gateway, worker, UI, each MCP server.
- **AWS**: ECS Fargate (agent service + worker scale independently), RDS Postgres for state/audit,
  ElastiCache/Redis for the job queue, Secrets Manager for tool credentials. Billing alarm on.
- **CI/CD**: GitHub Actions → run agent evals on a fixed goal set (gate merges on task-success and
  groundedness) → build → push ECR → deploy. Evals-in-CI for agents is a strong, rare thing to show.
- **This is where a light touch of real k8s could be justified later** (many services, independent
  scaling) — but ECS first. Note the threshold in DECISIONS.md; don't reach prematurely.

---

## 9. Definition of Done

- [ ] Supervisor + ≥2 specialists collaborate via LangGraph to produce a sourced artifact.
- [ ] ≥1 real MCP tool server you run; read vs consequential tools distinguished.
- [ ] HITL gate pauses before any consequential action; run resumes after approval and survives a
      restart while paused.
- [ ] Guardrails: grounded-claims-only + tool-use policy + loop/budget ceiling, all visible in traces.
- [ ] Tracing (LangSmith/Langfuse) + independent audit log; a run is fully replayable.
- [ ] Agent evals run in CI and gate merges; concurrent agent-loop load test artifact exists.
- [ ] Deployed on AWS; DECISIONS.md defends LangGraph-vs-CrewAI, MCP, and HITL choices.
- [ ] **SaaS shell (reused from P1):** JWT auth, workspace/roles (incl. reviewer), landing/pricing/
      onboarding, navigable app (dashboard, runs, approvals, tools, audit, settings), plan-gating.
      Net-new surfaces are the live run/trace view, approvals queue, tools catalog, and audit log.

---

## 10. How to start with Claude Code

1. *"Spec attached. First design the LangGraph state schema and the node graph (supervisor +
   specialists + HITL checkpoint). No implementation until I approve the graph."*
2. Slice order: minimal supervisor→researcher loop with one read-only MCP tool + tracing → add
   analyst + writer → add the HITL checkpoint (pause/resume) → guardrails + tool-use policy →
   audit log → evals in CI → load test → deploy.
3. After the HITL slice: *"Prove the run can pause for approval, survive a process restart, and
   resume — show me the checkpoint state."*
