import os
import asyncio
import logging
from datetime import datetime, timezone
from .db import SessionLocal
from .models import Run, Approval
from .graph import builder
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.errors import GraphInterrupt
from langgraph.types import Command

logger = logging.getLogger(__name__)

POSTGRES_URI = os.environ.get("DATABASE_URL", "postgresql://consensus:consensus@db:5432/consensus")


def _build_callbacks():
    """Build tracing callbacks for a run.

    Tracing must never block or fail a run, so any import/instantiation error
    (e.g. the langfuse v2 -> v3 API change) is swallowed and the run proceeds
    without a Langfuse trace. Tracing is only enabled when real keys are set.
    """
    pk = os.environ.get("LANGFUSE_PUBLIC_KEY")
    sk = os.environ.get("LANGFUSE_SECRET_KEY")
    if not (pk and sk):
        return []
    host = os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
    try:
        # langfuse v2
        from langfuse.callback import CallbackHandler
        return [CallbackHandler(public_key=pk, secret_key=sk, host=host)]
    except Exception:  # noqa: BLE001
        try:
            # langfuse v3: CallbackHandler moved and reads config from the client/env
            from langfuse import Langfuse
            from langfuse.langchain import CallbackHandler
            Langfuse(public_key=pk, secret_key=sk, host=host)
            return [CallbackHandler()]
        except Exception as e:  # noqa: BLE001
            logger.warning("Langfuse tracing disabled: %s", e)
            return []


def run_agent(run_id: str):
    asyncio.run(async_run_agent(run_id))


async def async_run_agent(run_id: str):
    db = SessionLocal()
    try:
        run_record = db.query(Run).filter(Run.id == run_id).first()
        if not run_record:
            return

        run_record.status = "running"
        run_record.started_at = datetime.now(timezone.utc)
        db.commit()

        initial_state = {
            "run_id": run_id,
            "workspace_id": str(run_record.workspace_id),
            "goal": run_record.goal,
            "iteration": 0,
            "step_count": 0,
            "tool_call_count": 0,
            "cost_usd": 0.0,
            "messages": [],
            "sources": []
        }

        config = {
            "configurable": {"thread_id": run_id},
            "callbacks": _build_callbacks()
        }

        async with AsyncPostgresSaver.from_conn_string(POSTGRES_URI) as checkpointer:
            await checkpointer.setup()
            graph = builder.compile(checkpointer=checkpointer)

            # interrupt() surfaces differently across langgraph versions: some
            # raise GraphInterrupt out of ainvoke, others return with the
            # interrupt recorded in the checkpoint. Handle both by inspecting
            # the resulting state snapshot.
            try:
                await graph.ainvoke(initial_state, config=config)
            except GraphInterrupt:
                pass

            snapshot = await graph.aget_state(config)

            if snapshot.next:
                # Graph paused at the HITL checkpoint awaiting human approval.
                run_record.status = "awaiting_approval"
                pending_action = snapshot.values.get("pending_action")
                approval = Approval(
                    run_id=run_record.id,
                    workspace_id=run_record.workspace_id,
                    proposed_action=pending_action
                )
                db.add(approval)
                db.commit()
                print(f"Run {run_id} paused for human approval.")
            else:
                run_record.status = "completed"
                run_record.completed_at = datetime.now(timezone.utc)
                run_record.result = {"draft": snapshot.values.get("draft")}
                db.commit()
                print(f"Run {run_id} completed successfully.")

    except Exception as e:
        print(f"Run {run_id} failed: {e}")
        db.rollback()
        run_record = db.query(Run).filter(Run.id == run_id).first()
        if run_record:
            run_record.status = "failed"
            run_record.error_message = str(e)
            run_record.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


def resume_agent(run_id: str, decision: str, note: str):
    asyncio.run(async_resume_agent(run_id, decision, note))


async def async_resume_agent(run_id: str, decision: str, note: str):
    db = SessionLocal()
    try:
        run_record = db.query(Run).filter(Run.id == run_id).first()
        if not run_record:
            return

        config = {
            "configurable": {"thread_id": run_id},
            "callbacks": _build_callbacks()
        }

        async with AsyncPostgresSaver.from_conn_string(POSTGRES_URI) as checkpointer:
            graph = builder.compile(checkpointer=checkpointer)

            human_response = {"status": decision, "note": note}

            # Resume graph by sending command to the hitl node
            try:
                await graph.ainvoke(Command(resume=human_response), config=config)
            except GraphInterrupt:
                pass

            snapshot = await graph.aget_state(config)

            if snapshot.next:
                # Secondary pause (unlikely) — leave awaiting further approval.
                run_record.status = "awaiting_approval"
                db.commit()
            else:
                run_record.status = "completed"
                run_record.completed_at = datetime.now(timezone.utc)
                run_record.result = {"draft": snapshot.values.get("draft")}
                db.commit()
                print(f"Run {run_id} completed successfully after resume.")

    except Exception as e:
        print(f"Run {run_id} failed during resume: {e}")
        db.rollback()
        run_record = db.query(Run).filter(Run.id == run_id).first()
        if run_record:
            run_record.status = "failed"
            run_record.error_message = str(e)
            run_record.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()
