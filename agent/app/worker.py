import os
import asyncio
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .db import SessionLocal
from .models import Run, Approval
from .graph import builder
from langfuse.callback import CallbackHandler
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from langgraph.errors import GraphInterrupt
from langgraph.types import Command

langfuse_handler = CallbackHandler(
    public_key=os.environ.get("LANGFUSE_PUBLIC_KEY", "pk-mock"),
    secret_key=os.environ.get("LANGFUSE_SECRET_KEY", "sk-mock"),
    host=os.environ.get("LANGFUSE_HOST", "https://cloud.langfuse.com")
)

POSTGRES_URI = os.environ.get("DATABASE_URL", "postgresql://consensus:consensus@db:5432/consensus")
# aio psycopg requires asyncpg or psycopg (async)
ASYNC_POSTGRES_URI = POSTGRES_URI.replace("postgresql://", "postgresql+psycopg://") # Just use sync psycopg string for aio if supported, or psycopg3

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
            "callbacks": [langfuse_handler]
        }

        async with AsyncPostgresSaver.from_conn_string(POSTGRES_URI) as checkpointer:
            await checkpointer.setup()
            graph = builder.compile(checkpointer=checkpointer)
            
            try:
                final_state = await graph.ainvoke(initial_state, config=config)
                
                run_record.status = "completed"
                run_record.completed_at = datetime.now(timezone.utc)
                run_record.result = {"draft": final_state.get("draft")}
                db.commit()
                print(f"Run {run_id} completed successfully.")
                
            except GraphInterrupt:
                # Graph paused for HITL
                run_record.status = "awaiting_approval"
                db.commit()
                
                # We need to extract the pending_action from the state
                state_snapshot = await graph.aget_state(config)
                pending_action = state_snapshot.values.get("pending_action")
                
                # Create Approval record
                approval = Approval(
                    run_id=run_record.id,
                    workspace_id=run_record.workspace_id,
                    proposed_action=pending_action
                )
                db.add(approval)
                db.commit()
                print(f"Run {run_id} paused for human approval.")

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
            "callbacks": [langfuse_handler]
        }
        
        async with AsyncPostgresSaver.from_conn_string(POSTGRES_URI) as checkpointer:
            graph = builder.compile(checkpointer=checkpointer)
            
            human_response = {"status": decision, "note": note}
            
            try:
                # Resume graph by sending command to the hitl node
                final_state = await graph.ainvoke(Command(resume=human_response), config=config)
                
                run_record.status = "completed"
                run_record.completed_at = datetime.now(timezone.utc)
                run_record.result = {"draft": final_state.get("draft")}
                db.commit()
                print(f"Run {run_id} completed successfully after resume.")
                
            except GraphInterrupt:
                pass # Unlikely here, but handles secondary pauses

    except Exception as e:
        print(f"Run {run_id} failed during resume: {e}")
        db.rollback()
    finally:
        db.close()
