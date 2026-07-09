# Consensus: Multi-Agent Supervisor Orchestration

Consensus is a supervisor-orchestrated multi-agent system where specialist agents research, analyze, and draft real work using tools via MCP, with full tracing/audit and a **human-approval gate before any consequential action**.

## Architecture Overview
The system relies on a strictly separated multi-service architecture designed for maximum observability and fault-tolerance:

1. **Frontend (`web/`)**: Next.js React application handling user auth, workspace management, and displaying live streams of Agent graphs.
2. **Gateway (`gateway/`)**: FastAPI proxy enforcing plan-gating, input sanitization, and routing requests to the Redis Job Queue.
3. **Agent Worker (`agent/`)**: LangGraph stateful graph executor processing asynchronous background jobs.
4. **Tool Servers (`mcp/`)**: Containerized MCP tools providing restricted access to external resources (e.g. Search, Docs, APIs).
5. **Database (`db/`)**: PostgreSQL acting as the central state store for users, runs, audit logs, and LangGraph checkpointer.
6. **Queue**: Redis for enqueueing agent jobs and Pub/Sub.

## Key Decisions
- **LangGraph vs CrewAI/Autogen**: We chose LangGraph for its stateful orchestration and checkpointing abilities. It allows us to naturally implement the Human-In-The-Loop (HITL) pause functionality, meaning long-running tasks can be safely halted midway through a graph, stored in Postgres, and resumed days later when a human approves the action.
- **MCP for Tools**: Tools are isolated in separate MCP servers rather than being bundled directly in the LangGraph python runtime. This enforces strict memory boundaries and allows us to classify tools as `read-only` or `consequential` securely.
- **Append-only Audit**: Every transition between graph nodes is recorded into a synchronous append-only Postgres audit table, bridging the async LangGraph execution with synchronous DB inserts. This prevents audit-log desync during graph execution crashes.
- **Self-Hosting**: Docker Compose is used exclusively. We avoided AWS-specific bindings to allow dropping this on any cheap VPS natively.

## Evaluation & Load Testing
We have included a testing framework inside `agent/evals`:
- `run.py`: Pytest suite to assert that the agent trajectory successfully halts at the Human-in-the-Loop checkpoint and that the internal Self-Critic node correctly flags ungrounded claims.
- `load_test.py`: Asynchronous stress tester using `aiohttp` to ensure the Gateway can handle concurrent job enqueue requests without Redis locking.

## Production Deployment (Managed Free Tiers)
The system is configured to deploy seamlessly onto managed cloud platforms using their free tiers, entirely avoiding AWS or self-hosted server management.

1. **Database & Cache (Supabase & Upstash)**
   - Provision a free Postgres database on [Supabase](https://supabase.com).
   - Provision a free Redis cluster on [Upstash](https://upstash.com).

2. **Frontend (Vercel)**
   - Connect the repository to Vercel.
   - Set the Root Directory to `web/`.
   - Vercel will automatically use `web/vercel.json` for Next.js build settings.

3. **Backend & Agents (Render)**
   - Connect your repository to [Render](https://render.com).
   - Use the included `render.yaml` Blueprint to automatically deploy the FastAPI Gateway and Python MCP Tool servers as Web Services.
   - *Note: Render's free tier spins down inactive web services after 15 minutes, and does not support Background Workers. If you use the free tier, the Agent process must be bundled or you will experience cold boots.*
