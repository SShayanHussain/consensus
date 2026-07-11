import uuid
from sqlalchemy import Column, String, Integer, Float, DateTime, text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from .db import Base

class Run(Base):
    __tablename__ = "runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    goal = Column(String, nullable=False)
    status = Column(String, nullable=False, server_default="queued")
    result = Column(JSONB, nullable=True)
    step_count = Column(Integer, nullable=False, server_default="0")
    tool_call_count = Column(Integer, nullable=False, server_default="0")
    cost_usd = Column(Float, nullable=False, server_default="0")
    error_message = Column(String, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

class Approval(Base):
    __tablename__ = "approvals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id = Column(UUID(as_uuid=True), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)
    proposed_action = Column(JSONB, nullable=False)
    context = Column(JSONB, nullable=True)
    status = Column(String, nullable=False, server_default="pending")
    reviewer_id = Column(UUID(as_uuid=True), nullable=True)
    reviewer_note = Column(String, nullable=True)
    edited_action = Column(JSONB, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=False)
    run_id = Column(UUID(as_uuid=True), nullable=True)
    actor = Column(String, nullable=False)
    action = Column(String, nullable=False)
    detail = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
