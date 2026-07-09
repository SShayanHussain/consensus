# DECISIONS.md — Consensus

> ADR log. Append after every choice. Format: Context / Decision / Tradeoff / Revisit when.
---

## [seed] LangGraph over CrewAI for orchestration
Context: need durable state, explicit control flow, checkpointing, and HITL pauses that survive restarts.
Decision: LangGraph models the workflow as a replayable state machine.
Tradeoff: more code than CrewAI's role metaphor; slower initial prototype.
Revisit when: n/a for production graph. (May prototype roles in CrewAI to move fast, then rebuild in LangGraph — document if so.)

## [seed] MCP for tools, not bespoke function-calling glue
Context: want portable, inspectable, standard tool integration.
Decision: run ≥1 real MCP server; tools tagged read-only vs consequential.
Tradeoff: slightly more setup than inline functions.
Revisit when: a tool needs capabilities MCP can't express (rare).

## [seed] HITL approval as a first-class graph checkpoint
Context: consequential actions must not fire without human sign-off; deployability depends on this.
Decision: a LangGraph checkpoint persists state and pauses before consequential actions; UI approves to resume.
Tradeoff: added latency + UI complexity; runs can pause for hours.
Revisit when: n/a — this is the product.

## [seed] Audit log separate from tracing vendor
Context: tracing (Langfuse) is for debugging; compliance needs a vendor-independent record.
Decision: append-only audit log in Postgres, written independently of traces.
Tradeoff: some duplication of event data.
Revisit when: n/a — required for the trust story.

## [seed] Loop/budget ceilings per run
Context: agents can get stuck in loops and burn tokens (a real failure mode).
Decision: max steps / max tool calls / cost ceiling per run, enforced in the graph and shown in traces.
Tradeoff: a complex legitimate task could hit the ceiling (tunable).
Revisit when: real tasks legitimately need higher ceilings.

## [phase-0] Self-hosted Deployment over AWS / Free Tiers
Context: We decided to move away from AWS and free-tier cloud tools (Vercel, Render, Supabase, Upstash) to have full control and avoid vendor lock-in or limits.
Decision: Self-host the entire stack (Next.js, FastAPI, Agent, Postgres, Redis) using Docker Compose on a single VPS or dedicated server.
Tradeoff: Requires managing our own server infrastructure, security, and backups. No more serverless cold starts, but scaling requires manual intervention.
Revisit when: Traffic exceeds single-node capacity.

## [phase-0] Tailwind CSS v4 + shadcn/Base UI kit reused from Deflekt
Context: Deflekt's UI kit (9 components, auth system, dashboard layout) is battle-tested and saves 2+ days of setup.
Decision: copy and rebrand with Consensus's mission-control dark theme. Keep Tailwind v4 + Base UI architecture.
Tradeoff: carries Tailwind as a dependency; Consensus theme is a restyle, not a rewrite.
Revisit when: n/a — the UI kit is proven.

## [phase-0] Langfuse Cloud over LangSmith for tracing
Context: need full agent tracing (nodes, tool I/O, tokens, latency). Both have free tiers.
Decision: Langfuse Cloud — free tier, no self-hosting infra, vendor-independent audit log in Postgres handles compliance.
Tradeoff: LangSmith has tighter LangChain integration; Langfuse is more open.
Revisit when: if Langfuse free tier is insufficient or LangSmith offers compelling features.
