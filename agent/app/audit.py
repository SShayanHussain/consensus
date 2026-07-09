import asyncio
import uuid
from .db import SessionLocal
from .models import AuditLog

def _log_audit_event_sync(run_id: str, workspace_id: str, node: str, event_type: str, event_data: dict):
    db = SessionLocal()
    try:
        log_entry = AuditLog(
            run_id=uuid.UUID(run_id),
            workspace_id=uuid.UUID(workspace_id),
            actor=node,
            action=event_type,
            detail=event_data
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Audit log failed: {e}")
        db.rollback()
    finally:
        db.close()

async def log_audit_event(run_id: str, workspace_id: str, node: str, event_type: str, event_data: dict):
    """Safely append an audit log entry from an async node."""
    await asyncio.to_thread(_log_audit_event_sync, run_id, workspace_id, node, event_type, event_data)
