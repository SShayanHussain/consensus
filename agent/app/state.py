from typing import TypedDict, Literal, Any, Annotated
import operator
from langchain_core.messages import BaseMessage

class Source(TypedDict):
    """A grounded citation from the researcher."""
    url: str
    title: str
    snippet: str
    retrieved_at: str

class ProposedAction(TypedDict):
    """An action the agent wants to execute."""
    tool_name: str
    tool_server: str
    classification: Literal["consequential"]
    arguments: dict[str, Any]
    reason: str

def add_messages(left: list[BaseMessage], right: list[BaseMessage]):
    """Merge message lists for state reducer"""
    return left + right

def add_sources(left: list[Source], right: list[Source]):
    """Merge sources for state reducer"""
    return left + right

class ConsensusState(TypedDict):
    run_id: str
    workspace_id: str
    goal: str
    
    plan: list[str]
    current_task: str
    current_specialist: str
    iteration: int
    
    research_findings: list[dict]
    analysis: str
    draft: str
    
    # Reducers defined for lists that get appended to
    sources: Annotated[list[Source], add_sources]
    
    pending_action: ProposedAction | None
    approval_status: Literal["none", "pending", "approved", "rejected", "edited"]
    approval_response: str | None
    
    step_count: int
    tool_call_count: int
    cost_usd: float
    
    messages: Annotated[list[BaseMessage], add_messages]
