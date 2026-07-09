"""
Consensus — FastAPI Gateway
Handles auth proxy, run management, job queue interface.
"""
import os
import uuid
from datetime import datetime, timezone
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from rq import Queue
from redis import Redis
from .db import get_db
from .models import Run, Approval

# Connect to Redis
REDIS_URL = os.environ.get("REDIS_URL")
if not REDIS_URL:
    REDIS_URL = "redis://redis:6379/0"
redis_conn = Redis.from_url(REDIS_URL)
q = Queue(connection=redis_conn)

app = FastAPI(
    title="Consensus Gateway",
    description="Auth, run management, and job queue interface for Consensus agents.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}

class RunCreate(BaseModel):
    goal: str

@app.post("/runs")
async def create_run(
    run_req: RunCreate, 
    x_workspace_id: str = Header(...),
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """Enqueue a new agent run."""
    try:
        workspace_uuid = uuid.UUID(x_workspace_id)
        user_uuid = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID for workspace or user.")

    # Plan-Gating (runs/mo ceiling)
    from sqlalchemy import func
    from datetime import timedelta
    
    first_day_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_runs = db.query(func.count(Run.id)).filter(
        Run.workspace_id == workspace_uuid,
        Run.created_at >= first_day_of_month
    ).scalar()
    
    PLAN_RUN_LIMIT = 50  # Hardcoded MVP plan limit
    if monthly_runs >= PLAN_RUN_LIMIT:
        raise HTTPException(status_code=402, detail=f"Plan limit exceeded: {PLAN_RUN_LIMIT} runs/month.")

    new_run = Run(
        workspace_id=workspace_uuid,
        user_id=user_uuid,
        goal=run_req.goal,
        status="queued"
    )
    db.add(new_run)
    db.commit()
    db.refresh(new_run)

    job = q.enqueue("app.worker.run_agent", args=(str(new_run.id),))
    return {"run_id": new_run.id, "job_id": job.id, "status": "queued"}

@app.get("/runs/{run_id}")
async def get_run(
    run_id: str,
    x_workspace_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """Fetch run status."""
    try:
        run_uuid = uuid.UUID(run_id)
        workspace_uuid = uuid.UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID.")

    run_record = db.query(Run).filter(Run.id == run_uuid, Run.workspace_id == workspace_uuid).first()
    if not run_record:
        raise HTTPException(status_code=404, detail="Run not found.")
        
    return {
        "id": run_record.id,
        "goal": run_record.goal,
        "status": run_record.status,
        "result": run_record.result,
        "step_count": run_record.step_count,
        "tool_call_count": run_record.tool_call_count,
        "cost_usd": run_record.cost_usd,
        "error_message": run_record.error_message,
        "created_at": run_record.created_at,
        "started_at": run_record.started_at,
        "completed_at": run_record.completed_at
    }


@app.get("/approvals")
async def get_approvals(
    x_workspace_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """Fetch pending approvals for the workspace."""
    try:
        workspace_uuid = uuid.UUID(x_workspace_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID.")

    approvals = db.query(Approval).filter(
        Approval.workspace_id == workspace_uuid,
        Approval.status == "pending"
    ).all()
    
    return [
        {
            "id": a.id,
            "run_id": a.run_id,
            "proposed_action": a.proposed_action,
            "context": a.context,
            "status": a.status,
            "created_at": a.created_at
        }
        for a in approvals
    ]


class DecisionRequest(BaseModel):
    status: str  # 'approved' or 'rejected'
    note: str = ""

@app.post("/approvals/{approval_id}/decide")
async def decide_approval(
    approval_id: str,
    req: DecisionRequest,
    x_workspace_id: str = Header(...),
    x_user_id: str = Header(...),
    db: Session = Depends(get_db)
):
    """Make a decision on a pending approval."""
    if req.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be approved or rejected.")
        
    try:
        app_uuid = uuid.UUID(approval_id)
        workspace_uuid = uuid.UUID(x_workspace_id)
        user_uuid = uuid.UUID(x_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID.")

    approval = db.query(Approval).filter(
        Approval.id == app_uuid,
        Approval.workspace_id == workspace_uuid
    ).first()
    
    if not approval or approval.status != "pending":
        raise HTTPException(status_code=404, detail="Pending approval not found.")

    # Update approval
    approval.status = req.status
    approval.reviewer_id = user_uuid
    approval.reviewer_note = req.note
    approval.decided_at = datetime.now(timezone.utc)
    
    # Update run
    run_record = db.query(Run).filter(Run.id == approval.run_id).first()
    if run_record:
        run_record.status = "running"
        
    db.commit()

    # Resume the agent graph job
    q.enqueue("app.worker.resume_agent", args=(str(approval.run_id), req.status, req.note))
    
    return {"status": "success", "approval_id": approval.id, "decision": req.status}
