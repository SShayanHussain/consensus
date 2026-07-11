from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from .state import ConsensusState
from .audit import log_audit_event

_llm = None


def get_llm():
    """Lazily construct the LLM.

    Building it at import time means a missing GOOGLE_API_KEY crashes the RQ
    worker as it imports this module, leaving runs stuck at "queued". Deferring
    construction lets the error surface inside the run instead, so it is
    recorded as a failed run with a visible error_message.
    """
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0)
    return _llm


MAX_STEPS = 15
MAX_COST = 0.50

async def input_guard(state: ConsensusState) -> ConsensusState:
    """Validate goal."""
    return state

async def supervisor(state: ConsensusState):
    """Router node. Distributes work and enforces ceilings."""
    step_count = state.get("step_count", 0)
    cost_usd = state.get("cost_usd", 0.0)
    
    if step_count >= MAX_STEPS or cost_usd >= MAX_COST:
        return {"current_specialist": "fail_loudly"}
        
    iteration = state.get("iteration", 0)
    
    if iteration == 0:
        plan = ["research", "analyze", "write"]
        return {
            "plan": plan,
            "iteration": iteration + 1,
            "step_count": step_count + 1,
            "current_task": "research",
            "current_specialist": "researcher"
        }
    
    current_task = state.get("current_task")
    
    if current_task == "research":
        return {"current_task": "analyze", "current_specialist": "analyst", "step_count": step_count + 1}
    elif current_task == "analyze":
        return {"current_task": "write", "current_specialist": "writer", "step_count": step_count + 1}
    else:
        return {"current_task": "done", "current_specialist": "done", "step_count": step_count + 1}

def route_supervisor(state: ConsensusState) -> Literal["researcher", "analyst", "writer", "fail_loudly", "done"]:
    specialist = state.get("current_specialist")
    if specialist in ["researcher", "analyst", "writer", "fail_loudly"]:
        return specialist
    return "done"

async def researcher(state: ConsensusState):
    """Researcher node."""
    goal = state["goal"]
    await log_audit_event(state["run_id"], state["workspace_id"], "researcher", "started", {"goal": goal})

    print(f"Run {state['run_id']}: researcher calling LLM", flush=True)
    response = await get_llm().ainvoke([
        SystemMessage(content="You are a researcher. Summarize findings for the goal. Use specific facts and numbers."),
        HumanMessage(content=goal)
    ])
    
    findings = [{"topic": goal, "summary": response.content}]
    
    await log_audit_event(state["run_id"], state["workspace_id"], "researcher", "completed", {"findings_count": len(findings)})
    return {
        "research_findings": findings,
        "messages": [AIMessage(content=response.content)]
    }

async def analyst(state: ConsensusState):
    """Analyst node & Self-Critic."""
    findings = state.get("research_findings", [])
    findings_text = str(findings)
    goal = state["goal"]
    
    await log_audit_event(state["run_id"], state["workspace_id"], "analyst", "started", {})
    
    response = await get_llm().ainvoke([
        SystemMessage(content="You are an analyst. Analyze the research findings and extract key grounded claims."),
        HumanMessage(content=f"Goal: {goal}\nFindings: {findings_text}")
    ])
    
    analysis_text = response.content
    
    critic = await get_llm().ainvoke([
        SystemMessage(content="You are a strict self-critic. Read the analysis and the original findings. If the analysis contains claims not present in the findings, output 'UNGROUNDED'. Otherwise, output 'GROUNDED'."),
        HumanMessage(content=f"Findings: {findings_text}\nAnalysis: {analysis_text}")
    ])
    
    if "UNGROUNDED" in critic.content:
        print("Self-critic caught ungrounded claims.")
        await log_audit_event(state["run_id"], state["workspace_id"], "analyst", "ungrounded_caught", {"critic": critic.content})
        analysis_text = f"WARNING: Some claims failed grounding check. Original analysis: {analysis_text}"
        
    await log_audit_event(state["run_id"], state["workspace_id"], "analyst", "completed", {})
    return {
        "analysis": analysis_text,
        "messages": [AIMessage(content=f"Analysis complete. Critic check: {critic.content}")]
    }

async def writer(state: ConsensusState):
    """Writer node."""
    analysis = state.get("analysis", "")
    await log_audit_event(state["run_id"], state["workspace_id"], "writer", "started", {})
    
    response = await get_llm().ainvoke([
        SystemMessage(content="You are a professional writer. Write a final cohesive report based on the provided analysis."),
        HumanMessage(content=f"Analysis: {analysis}")
    ])
    
    await log_audit_event(state["run_id"], state["workspace_id"], "writer", "completed", {})
    return {
        "draft": response.content,
        "messages": [AIMessage(content="Draft completed.")]
    }

def fail_loudly(state: ConsensusState):
    """Abort due to ceilings."""
    print("Graph aborted due to budget ceilings.")
    raise Exception("Budget ceiling exceeded. Run failed loudly.")

async def output_validator(state: ConsensusState):
    """Detect consequential actions & Schema validate."""
    draft = state.get("draft")
    if not draft:
        raise Exception("Final artifact validation failed: Draft is empty.")
        
    pending_action = {
        "tool_name": "send_report",
        "tool_server": "mcp-docs",
        "classification": "consequential",
        "arguments": {"report": draft[:100]},
        "reason": "I want to send the finalized report to the strategy channel."
    }
    
    await log_audit_event(state["run_id"], state["workspace_id"], "output_validator", "pending_consequential", pending_action)
    return {"pending_action": pending_action, "approval_status": "pending"}

def route_output_validator(state: ConsensusState) -> Literal["hitl_checkpoint", "deliver"]:
    if state.get("pending_action"):
        return "hitl_checkpoint"
    return "deliver"

def hitl_checkpoint(state: ConsensusState):
    """Pause execution and wait for human."""
    human_response = interrupt("Waiting for human approval")
    return {
        "approval_status": human_response.get("status"), 
        "approval_response": human_response.get("note")
    }

def route_hitl(state: ConsensusState) -> Literal["execute_action", "deliver"]:
    if state.get("approval_status") == "approved":
        return "execute_action"
    return "deliver"

async def execute_action(state: ConsensusState):
    """Execute the approved action."""
    action = state.get("pending_action")
    print(f"Executing approved action: {action['tool_name']}")
    await log_audit_event(state["run_id"], state["workspace_id"], "execute_action", "executed", {"action": action['tool_name']})
    return {"pending_action": None, "approval_status": "none"}

def deliver(state: ConsensusState):
    """Final delivery step."""
    return {}

builder = StateGraph(ConsensusState)
builder.add_node("input_guard", input_guard)
builder.add_node("supervisor", supervisor)
builder.add_node("researcher", researcher)
builder.add_node("analyst", analyst)
builder.add_node("writer", writer)
builder.add_node("fail_loudly", fail_loudly)
builder.add_node("output_validator", output_validator)
builder.add_node("hitl_checkpoint", hitl_checkpoint)
builder.add_node("execute_action", execute_action)
builder.add_node("deliver", deliver)

builder.add_edge(START, "input_guard")
builder.add_edge("input_guard", "supervisor")

builder.add_conditional_edges(
    "supervisor",
    route_supervisor,
    {
        "researcher": "researcher",
        "analyst": "analyst",
        "writer": "writer",
        "fail_loudly": "fail_loudly",
        "done": "output_validator"
    }
)

builder.add_edge("researcher", "supervisor")
builder.add_edge("analyst", "supervisor")
builder.add_edge("writer", "supervisor")
builder.add_edge("fail_loudly", END)

builder.add_conditional_edges(
    "output_validator",
    route_output_validator,
    {
        "hitl_checkpoint": "hitl_checkpoint",
        "deliver": "deliver"
    }
)

builder.add_conditional_edges(
    "hitl_checkpoint",
    route_hitl,
    {
        "execute_action": "execute_action",
        "deliver": "deliver"
    }
)

builder.add_edge("execute_action", "deliver")
builder.add_edge("deliver", END)

graph = builder.compile()
