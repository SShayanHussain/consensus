# Phase 1 — LangGraph Design Document

> **STATUS: AWAITING APPROVAL**
> No implementation code will be written until this design is approved.
> This document defines the complete agent graph: state schema, node topology,
> tool classification, checkpointing strategy, and guardrail enforcement.

---

## 1. State Schema

The central state object that flows through every node in the graph.
Implemented as a `TypedDict` (LangGraph convention) with Pydantic validation
where needed for complex nested types.

```python
from typing import TypedDict, Literal, Any
from langchain_core.messages import BaseMessage


class Source(TypedDict):
    """A grounded citation from the researcher."""
    url: str
    title: str
    snippet: str
    retrieved_at: str  # ISO timestamp


class ProposedAction(TypedDict):
    """An action the agent wants to execute (consequential tool call)."""
    tool_name: str
    tool_server: str       # e.g. "mcp-docs"
    classification: Literal["consequential"]
    arguments: dict[str, Any]
    reason: str            # Why the agent proposes this action


class ConsensusState(TypedDict):
    # --- Run identity ---
    run_id: str
    workspace_id: str
    goal: str                           # User's natural-language objective

    # --- Agent coordination ---
    plan: list[str]                     # Supervisor's decomposed sub-tasks
    current_task: str                   # Active sub-task being worked
    current_specialist: str             # Who is currently executing
    iteration: int                      # Supervisor loop counter

    # --- Specialist outputs ---
    research_findings: list[dict]       # Researcher's sourced findings
    analysis: str                       # Analyst's synthesis
    draft: str                          # Writer's final artifact

    # --- Grounded sources ---
    sources: list[Source]               # All citations collected during the run

    # --- HITL ---
    pending_action: ProposedAction | None
    approval_status: Literal[
        "none",           # No action pending
        "pending",        # Waiting for human
        "approved",       # Human approved
        "rejected",       # Human rejected
        "edited",         # Human approved with modifications
    ]
    approval_response: str | None       # Reviewer's note or edit

    # --- Guardrails / ceilings ---
    step_count: int                     # Incremented every supervisor iteration
    tool_call_count: int                # Incremented every MCP tool invocation
    cost_usd: float                     # Accumulated LLM token cost

    # --- Messages ---
    messages: list[BaseMessage]         # Full LLM conversation history
```

**Key design choices:**
- `sources` is append-only and accumulated across all research iterations.
- `pending_action` is set by the output validator when a consequential tool call is detected.
- `step_count`, `tool_call_count`, `cost_usd` are checked by the supervisor on every loop.
- `messages` preserves full context so any node can see previous turns.

---

## 2. Node Graph

```
┌──────────────────────────────────────────────────────────────────────┐
│                        CONSENSUS AGENT GRAPH                        │
│                                                                      │
│  ┌─────────┐                                                         │
│  │  START   │                                                         │
│  └────┬────┘                                                         │
│       ▼                                                              │
│  ┌─────────────┐    ceiling hit?                                     │
│  │ INPUT_GUARD  ├──────────────────────────────► ┌─────────┐         │
│  └──────┬──────┘    refuses bad goals            │  ABORT   │         │
│         ▼                                        └────┬────┘         │
│  ┌──────────────┐                                     │              │
│  │  SUPERVISOR   │◄──────────────────────┐            │              │
│  │  (router)     │                       │            ▼              │
│  └──┬──┬──┬──┬──┘                       │     ┌───────────┐         │
│     │  │  │  │                           │     │ AUDIT_LOG │         │
│     │  │  │  └── "done" ──► ┌────────────┤     └─────┬─────┘         │
│     │  │  │                 │            │           ▼              │
│     │  │  └── "write" ──┐  │            │     ┌─────────┐          │
│     │  │                 │  │            │     │   END    │          │
│     │  └── "analyze" ─┐  │  │            │     └─────────┘          │
│     │                  │  │  │            │                          │
│     └── "research" ─┐  │  │  │            │                          │
│                      ▼  ▼  ▼  ▼            │                          │
│              ┌────────────────────┐        │                          │
│              │    RESEARCHER      │        │                          │
│              │ (LLM + MCP tools)  │        │                          │
│              └────────┬───────────┘        │                          │
│                       ▼                    │                          │
│              ┌────────────────────┐        │                          │
│              │  GROUNDING_CHECK   │        │                          │
│              │  (LLM judge)       │        │                          │
│              └────────┬───────────┘        │                          │
│                       │                    │                          │
│              ┌────────────────────┐        │                          │
│              │     ANALYST        │        │                          │
│              │  (LLM synthesis)   │        │                          │
│              └────────┬───────────┘        │                          │
│                       │                    │                          │
│              ┌────────────────────┐        │                          │
│              │      WRITER        │        │                          │
│              │ (LLM final draft)  │        │                          │
│              └────────┬───────────┘        │                          │
│                       ▼                    │                          │
│              ┌────────────────────┐        │                          │
│              │ OUTPUT_VALIDATOR   │        │                          │
│              │ (schema + action   │        │                          │
│              │  classification)   │────────┘  (read-only → DELIVER)  │
│              └────────┬───────────┘                                   │
│                       │ (consequential action detected)              │
│                       ▼                                              │
│              ┌────────────────────┐                                   │
│              │ HITL_CHECKPOINT    │                                   │
│              │ ⏸ interrupt()     │                                   │
│              │ Persists state.    │                                   │
│              │ Waits for human.   │                                   │
│              └──┬─────┬──────┬───┘                                   │
│                 │     │      │                                        │
│          approved  edited  rejected                                  │
│                 │     │      │                                        │
│                 ▼     ▼      └──────────► SUPERVISOR (retry/abort)    │
│              ┌────────────────────┐                                   │
│              │  EXECUTE_ACTION    │                                   │
│              │ (MCP tool call)    │                                   │
│              └────────┬───────────┘                                   │
│                       ▼                                              │
│              ┌────────────────────┐                                   │
│              │    AUDIT_LOG       │                                   │
│              └────────┬───────────┘                                   │
│                       ▼                                              │
│              ┌────────────────────┐                                   │
│              │     DELIVER        │                                   │
│              └────────┬───────────┘                                   │
│                       ▼                                              │
│                  ┌─────────┐                                          │
│                  │   END    │                                          │
│                  └─────────┘                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Node Descriptions

| Node | Type | Input State | Output State | Responsibility |
|---|---|---|---|---|
| **INPUT_GUARD** | Guard (LLM / rules) | `goal` | pass/reject | Validates the goal: refuses out-of-policy, malformed, or unsafe requests. Sets initial `plan: []`, `step_count: 0`, etc. |
| **SUPERVISOR** | Router (LLM) | Full state | `current_task`, `current_specialist`, `iteration++`, `step_count++` | Decomposes the goal into sub-tasks (first call) or reviews progress (subsequent calls). Routes to the right specialist. Checks ceilings on every iteration — if exceeded, routes to ABORT. Decides "done" when all tasks are complete. |
| **RESEARCHER** | Specialist (LLM + MCP tools) | `current_task`, `messages` | `research_findings`, `sources`, `tool_call_count++` | Calls read-only MCP tools (web_search, fetch_document, query_internal_data). Returns sourced findings with citations. |
| **GROUNDING_CHECK** | Guard (LLM judge) | `research_findings`, `sources` | pass (findings kept) or fail (unsupported claims stripped) | Validates every factual claim has a citation in `sources`. Strips or flags unsupported claims. This is the self-critic (PRD §6). |
| **ANALYST** | Specialist (LLM) | `research_findings`, `sources` | `analysis` | Synthesizes findings, checks consistency, identifies gaps. May signal the supervisor to route back to researcher. |
| **WRITER** | Specialist (LLM) | `analysis`, `sources` | `draft` | Produces the final artifact (report, brief, etc.) from the analysis and sourced findings. |
| **OUTPUT_VALIDATOR** | Guard (schema + classification) | `draft`, state | `pending_action` or direct to DELIVER | Validates the final artifact against an output schema. Checks if the run proposes a consequential action. If yes → sets `pending_action` and routes to HITL. If no (read-only result) → routes directly to DELIVER. |
| **HITL_CHECKPOINT** | Checkpoint (LangGraph `interrupt`) | `pending_action` | `approval_status`, `approval_response` | **The flagship node.** Persists full state to Postgres via `interrupt()`. Pauses execution. Notifies the UI. Waits for human response (can be hours/days). On resume, routes based on approval decision. |
| **EXECUTE_ACTION** | Action (MCP tool call) | `pending_action` (approved/edited) | action result | Executes the approved consequential action via the MCP tool server. Uses the `edited_action` if the reviewer modified it. |
| **AUDIT_LOG** | Side-effect | Action context | (writes to DB) | Writes an immutable record to the `audit_log` table. Independent of Langfuse tracing (DECISIONS.md). |
| **DELIVER** | Terminal | `draft` or action result | Final output | Assembles the final response and marks the run as completed. |
| **ABORT** | Terminal | Ceiling violation info | Error state | Fires when loop/tool/budget ceiling is hit. Logs the reason, marks run as `aborted`, writes audit entry. |

---

## 4. Supervisor Routing Logic

The supervisor is the central router. On each iteration it:

1. **Checks ceilings** (`step_count >= MAX_STEPS`, `tool_call_count >= MAX_TOOL_CALLS`, `cost_usd >= COST_CEILING`) → ABORT if exceeded
2. **If first iteration**: decomposes `goal` into `plan` (ordered list of sub-tasks)
3. **Reviews progress**: examines `research_findings`, `analysis`, `draft`
4. **Routes to next specialist** based on what's needed:
   - Needs information → `"research"` → RESEARCHER
   - Has findings, needs synthesis → `"analyze"` → ANALYST
   - Has analysis, needs artifact → `"write"` → WRITER
   - All tasks complete and artifact ready → `"done"` → OUTPUT_VALIDATOR
5. **Maximum iterations**: Even within the ceiling, supervisor has a hard cap of MAX_STEPS (env-configurable, default 25)

---

## 5. Tool Classification

### Policy
> **Any tool that mutates external state is `consequential` and MUST route through the HITL checkpoint. This is enforced in the graph topology, not by convention.**

### Tool Registry

| Tool Name | MCP Server | Classification | Runs Freely? | HITL Required? |
|---|---|---|---|---|
| `web_search` | `mcp-search` | `read_only` | ✅ Yes | ❌ No |
| `fetch_document` | `mcp-docs` | `read_only` | ✅ Yes | ❌ No |
| `query_internal_data` | `mcp-internal-data` | `read_only` | ✅ Yes | ❌ No |
| `send_report` | `mcp-docs` | `consequential` | ❌ No | ✅ Always |
| `file_record` | `mcp-internal-data` | `consequential` | ❌ No | ✅ Always |
| `post_to_system` | `mcp-internal-data` | `consequential` | ❌ No | ✅ Always |

### Classification Rules (checked at runtime)
```python
CONSEQUENTIAL_VERBS = {"send", "write", "post", "delete", "update", "create", "file", "publish"}

def is_consequential(tool_name: str) -> bool:
    """A tool is consequential if its verb implies state mutation."""
    verb = tool_name.split("_")[0]
    return verb in CONSEQUENTIAL_VERBS
```

The `tool_configs` table in Postgres allows workspace admins to override per-tool approval policy,
but consequential classification itself is enforced in the graph.

---

## 6. Checkpointing & Persistence

### Backend
- **Library:** `langgraph-checkpoint-postgres` (official LangGraph Postgres checkpointer)
- **Storage:** Supabase Postgres (production) / local Docker Postgres (development)

### How it works
1. **Automatic:** State is serialized to Postgres after every node transition (LangGraph default with Postgres checkpointer).
2. **HITL pause:** The `HITL_CHECKPOINT` node calls `interrupt()` which:
   - Serializes the full `ConsensusState` to the `langgraph_checkpoints` table
   - Returns control to the caller (gateway)
   - The run stays in `awaiting_approval` status
3. **Resume:** When the human approves/rejects via the UI:
   - Gateway loads the checkpoint from Postgres
   - Injects the approval response into the state
   - Resumes graph execution from the HITL node

### Durability guarantees
- ✅ Run survives process restarts while paused
- ✅ Run survives gateway/agent service restarts
- ✅ State is recoverable from Postgres alone (no Redis dependency for checkpoints)
- ✅ Multiple runs can be paused simultaneously

### Tables
- `langgraph_checkpoints` — managed by the library (state serialization)
- `runs` — our metadata table (status, timing, costs, goal)
- `approvals` — HITL decision records (proposed action, reviewer, decision)

---

## 7. Loop & Budget Ceilings

| Guard | Default | Env Var | Enforcement Point |
|---|---|---|---|
| Max supervisor iterations | 25 | `MAX_STEPS_PER_RUN` | Supervisor checks `step_count` before routing |
| Max tool calls | 40 | `MAX_TOOL_CALLS_PER_RUN` | Incremented in RESEARCHER; checked by supervisor |
| Cost ceiling (USD) | $1.50 | `COST_CEILING_USD_PER_RUN` | Accumulated from LLM token costs; checked by supervisor |

When any ceiling is hit:
1. Supervisor routes to `ABORT` node
2. ABORT writes audit entry with the violation reason
3. Run status → `aborted`
4. UI shows the abort reason with the full trace

---

## 8. Message Flow Example

**Goal:** "Prepare a competitive brief on Acme Corp's latest product launch."

```
1. INPUT_GUARD → validates goal (passes)
2. SUPERVISOR → decomposes:
   plan = ["Research Acme Corp's recent products",
           "Analyze competitive positioning",
           "Draft competitive brief"]
   routes → RESEARCHER (task 1)
3. RESEARCHER → calls web_search("Acme Corp product launch 2025")
   → calls fetch_document("acme-corp-press-release.pdf")
   → returns findings with 3 sources
4. GROUNDING_CHECK → validates all claims are sourced (passes)
5. SUPERVISOR → reviews findings, routes → ANALYST (task 2)
6. ANALYST → synthesizes findings, identifies strengths/weaknesses
7. SUPERVISOR → routes → WRITER (task 3)
8. WRITER → drafts competitive brief
9. SUPERVISOR → all tasks complete, routes → "done"
10. OUTPUT_VALIDATOR → validates schema
    → detects proposed action: send_report (consequential!)
    → sets pending_action, routes → HITL
11. HITL_CHECKPOINT → ⏸ PAUSE
    → state persisted to Postgres
    → UI shows: "Agent wants to send the competitive brief to #strategy-channel"
    → approval card with full context + draft preview
12. [Human reviews, approves]
13. EXECUTE_ACTION → calls send_report via MCP
14. AUDIT_LOG → writes record
15. DELIVER → returns final result
```

---

## 9. Approval Card Schema (for the UI)

What the approvals queue shows for each pending action:

```typescript
interface ApprovalCard {
  runId: string;
  goal: string;
  proposedAction: {
    toolName: string;
    toolServer: string;
    arguments: Record<string, unknown>;
    reason: string;           // Agent's explanation
  };
  context: {
    draft: string;            // The artifact being acted on
    sources: Source[];         // All citations
    stepCount: number;
    toolCallCount: number;
    costUsd: number;
    trace: string;            // Link to full Langfuse trace
  };
  actions: ["approve", "edit", "reject"];
}
```

---

## 10. Open Design Questions (resolved)

| Question | Decision |
|---|---|
| LLM provider | Gemini 2.5 Flash (both supervisor + specialists, configurable via env) |
| Tracing vendor | Langfuse Cloud (free tier) |
| Domain anchor | Competitive intelligence (research company, analyze competitors, draft brief) |
| Checkpoint backend | `langgraph-checkpoint-postgres` |
| State serialization | LangGraph default (pickle/JSON via the checkpointer) |
