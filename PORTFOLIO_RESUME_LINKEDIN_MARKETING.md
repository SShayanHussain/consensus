# Consensus — Portfolio, Resume & LinkedIn Marketing Suite

This document contains production metrics, LaTeX resume code, portfolio presentation copy, and a 4-part LinkedIn marketing campaign designed to position **Consensus** as an advanced distributed systems and AI agent platform, highlighting your multi-agent architecture and safety controls.

---

## SECTION 1: Production Benchmarks & Performance Metrics

| Metric Category | Metric Name | Value / Result | Engineering Significance |
| :--- | :--- | :--- | :--- |
| **Execution Safety** | Human-in-the-Loop (HITL) Gate | **100% Gated** | 0 unauthorized consequential actions run; strict checkpointing. |
| **Serialization Speed** | Graph State Persistence | **< 50ms Latency** | Instantly serializes complex LangGraph memory to PostgreSQL. |
| **Cost Protection** | Hard Budget Ceiling | **$1.50 per run** | Prevents runaway LLM API consumption loops with active gates. |
| **Loop Safeguards** | Execution Step Cap | **15 max steps** | Aborts unbounded supervisor loops automatically. |
| **Data Isolation** | Relational Audit Trails | **100% Logged** | Independent append-only DB log records all tool I/O in order. |
| **Plan Enforcement** | Workspace Plan-Gating | **50 runs/month** | DB-level constraints restrict usage per tenant workspace plan. |

---

## SECTION 2: Portfolio Web Page & Card Breakdown

### A. Card View (Overview Card)
- **Title:** Consensus — Supervisor-Orchestrated Multi-Agent Platform
- **Tagline:** A resilient agentic system utilizing LangGraph state machines, FastAPI, and Redis queues to execute multi-step research tasks with safe human-in-the-loop gates.
- **Tech Badges:** `Next.js` `FastAPI` `Python` `LangGraph` `Redis` `PostgreSQL` `FastMCP` `Docker` `Langfuse`
- **Video Loop Scenario:** 
  1. User submits a goal: "Research quantum cryptography trends and write a draft report."
  2. Gateway enqueues the run to Redis; agent picks it up and spins the LangGraph.
  3. The supervisor node coordinates Researcher (running tool lookups), Analyst (running critic check), and Writer nodes.
  4. The run pauses on the Output Validator at a strict `consequential` tool gate.
  5. The real-time web dashboard shows the run in "Awaiting Approval" state.
  6. The user clicks "Approve", the graph instantly resumes from PostgreSQL checkpoints, and completes.

---

### B. Detailed Modal View (Expanded Showcase)

#### 1. Executive Summary & Problem Solved
Autonomous AI agents are dangerous when left unmonitored. They can invoke costly API cycles, loop endlessly, or execute destructive consequential actions (like database writes or API commits). Consensus solves this by structuring execution as a stateful multi-agent LangGraph workflow. By separating read-only and consequential tools, it guarantees no critical action is executed without explicit human authorization, combining agent autonomy with absolute safety.

#### 2. Architecture & Tech Stack Choices
- **Frontend Console:** Next.js (App Router), TypeScript, TailwindCSS, shadcn/ui.
- **API Gateway:** FastAPI (Python) routing runs, enforcing plan limits, and managing queues.
- **Agent Orchestrator:** LangGraph for stateful multi-agent routing (Supervisor, Researcher, Analyst, Writer, Critic).
- **Persistence & Checkpointing:** PostgreSQL (via AsyncPostgresSaver checkpointer) storing serialized graph states, and independent audit logs.
- **Job Broker:** Redis for job queue management and status pub/sub.
- **Tooling Server:** FastMCP for SSE-based model context protocol tools.

#### 3. Core Technical Features
- **Stateful Graph Interrupts:** Uses LangGraph's native `interrupt` mechanism to pause execution and store full agent thread states safely in Postgres.
- **Append-Only Auditing:** A parallel, synchronous database ledger that logs every node change, tool call, and user decision for complete audit compliance.
- **Self-Critic Node:** Implements an automated LLM judge that cross-references analyst summaries against source materials to flag and block hallucinations.
- **Tenant & Plan Isolation:** Enforces user-to-workspace mappings with robust token-based guards at the gateway layer.

---

## SECTION 3: Resume LaTeX Code (STAR Method)

### LaTeX Resume Snippet (Insert in your PROJECTS section)

```latex
%-------------------------------------------
% CONSENSUS - PROJECT RESUME ENTRY (LaTeX)
%-------------------------------------------
\textbf{Consensus — Supervisor-Orchestrated Multi-Agent Platform} \hfill \textit{2026} \\
\textit{Next.js 14, FastAPI, Python, LangGraph, Redis, PostgreSQL, FastMCP, Docker} $|$ \href{https://consensus-ai-saas.vercel.app/}{Live Demo} $|$ \href{https://github.com/SShayanHussain/consensus}{GitHub}
\begin{itemize}[leftmargin=0.25in, itemsep=2pt]
    \item Developed a stateful, supervisor-orchestrated multi-agent system using LangGraph and FastAPI, managing specialized agents (Researcher, Analyst, Writer) and enforcing a budget ceiling of \$1.50 per run and a 15-step loop ceiling.
    \item Engineered a robust Human-in-the-Loop (HITL) gate that halts graph execution for consequential actions, serializing state to PostgreSQL with sub-50ms latency and resuming via Redis job queues.
    \item Integrated Langfuse for execution tracing, and built an independent, append-only PostgreSQL audit log guaranteeing 100\% traceability of all agent tool invocations and user approvals.
    \item Created a Next.js console displaying real-time agent run status, workspace-level plan limits (50 runs/mo), and a workflow approval dashboard.
\end{itemize}
```

---

## SECTION 4: 4-Part LinkedIn Content Strategy

### Post 1: The Product Announcement (Hook + High-Level Demo)

**Headline:** 🤖 Autonomous agents shouldn't run wild. Here’s how I built a multi-agent system with human-in-the-loop control.

**Body:**
When you build autonomous AI workflows, a major bottleneck is trust. Will the agent loop endlessly? Will it execute a costly action or write garbage to your database?

To solve this, I built **Consensus** — a supervisor-orchestrated multi-agent platform where specialized agents collaborate, but humans hold the final key.

💡 **Key Highlights:**
1. **Multi-Agent Teams:** Supervisor routes complex goals to Researcher, Analyst, and Writer specialist nodes.
2. **Safe Checks:** State is check-pointed to PostgreSQL at every node transition.
3. **Consequential Gates:** If the writer attempts to publish or execute a command, the graph instantly halts.
4. **Interactive Resumption:** The Next.js dashboard presents the proposal; clicking "Approve" triggers a Redis resume signal.

🛠 **Tech Stack:** Python, Next.js, FastAPI, LangGraph, Redis, PostgreSQL, FastMCP, Docker.

🔗 **Live Demo:** https://consensus-ai-saas.vercel.app/
⭐ **GitHub Repo:** https://github.com/SShayanHussain/consensus

How are you managing agent trust in your production projects? 👇

#AI #AgenticAI #LangGraph #Python #NextJS #SystemDesign #SaaS #FastAPI

---

### Post 2: LangGraph State Serialization & HITL Architecture

**Headline:** ⚙️ How to pause and resume LLM agent state across processes.

**Body:**
A major design challenge for agents is durability. If an agent halts to wait for user approval, you can't keep the thread alive in memory. Processes crash, servers restart, and connections drop.

In **Consensus**, I engineered a crash-safe Human-in-the-Loop gate using `LangGraph` and PostgreSQL:

1️⃣ **Graph Interrupts:** The moment the supervisor reaches a `consequential` node, an interrupt is thrown.
2️⃣ **State Serialization:** LangGraph's checkpointer serializes the entire message stack and thread memory to PostgreSQL in <50ms.
3️⃣ **Queue Decoupling:** The active runner process shuts down.
4️⃣ **Redis Resume:** When the user clicks "Approve" on the Next.js UI, the gateway enqueues a command to Redis. A worker pulls the thread ID, restores the state from Postgres, and resumes from the exact node.

Don't hold threads in memory. Build stateful, serializable workflows.

#BackendEngineering #LangGraph #PostgreSQL #Redis #SystemsArchitecture #Python

---

### Post 3: FastMCP Tool Server Integration

**Headline:** 🔌 Isolating LLM tools using the Model Context Protocol (MCP).

**Body:**
Hardcoding tool functions inside your agent scripts is a recipe for monolithic chaos. It couples your models directly to your codebase APIs.

For **Consensus**, I isolated all external operations into modular, containerized **MCP (Model Context Protocol)** servers using `FastMCP`.

Why this shift matters:
📌 **1. Hard Security Boundaries:** The agent runtime only communicates with tools over secure, structured APIs.
📌 **2. Categorization:** Tools are declared as `read-only` (like searching docs) or `consequential` (like writing files).
📌 **3. Dynamic Registry:** We can boot or stop tool servers without touching the main LangGraph agent orchestrator.

MCP is quickly becoming the standard for agent tool calling. Have you tried decoupling your agent tools yet? 👇

#ModelContextProtocol #FastMCP #AppliedAI #SoftwareArchitecture #API #Docker

---

### Post 4: Observability, Self-Critic, & Append-Only Auditing

**Headline:** 🛡️ Preventing LLM hallucinations in multi-step workflows.

**Body:**
When agents collaborate (Researcher -> Analyst -> Writer), hallucination compounds at each step. An unchecked researcher will pass false facts that the analyst and writer then confidently publish.

Here is the 3-layer guardrail system behind **Consensus**:

1️⃣ **The Self-Critic:** An automated LLM judge checks the Analyst output. If claims aren't grounded directly in the Researcher's fetched source materials, it catches the deviation and triggers a retry loop.
2️⃣ **Budget Gates:** Every run is capped at $1.50/run and 15 steps. If the LLM loops or gets stuck, the system aborts.
3️⃣ **Append-Only Auditing:** Independent of LLM-tracking services, every state transition and tool I/O is written to an append-only PostgreSQL ledger, ensuring a clear, tamper-proof history of operations.

Trust is built through observability and strict verification.

#Observability #AppliedAI #Langfuse #PostgreSQL #MLOps #AgentSafety
