import os
from typing import Any
from fastapi import FastAPI
from contextlib import asynccontextmanager
from mcp.server import FastMCP
from duckduckgo_search import DDGS

# Initialize FastMCP server
mcp = FastMCP("Consensus Search Server")

@mcp.tool()
def web_search(query: str, max_results: int = 5) -> list[dict[str, Any]]:
    """
    Search the web for information using DuckDuckGo.
    
    Args:
        query: The search query string.
        max_results: Maximum number of results to return (default 5).
    """
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return [
                {
                    "title": r.get("title", ""),
                    "snippet": r.get("body", ""),
                    "url": r.get("href", "")
                }
                for r in results
            ]
    except Exception as e:
        return [{"error": str(e)}]

# FastMCP can create a FastAPI app directly, but we want to mount it
# or run it via SSE. FastMCP handles standard MCP transports.
# For this setup, we'll expose the MCP server over SSE using FastAPI.
app = FastAPI(
    title="Consensus MCP Search",
    description="MCP tool server: web search (read-only) via SSE.",
    version="0.1.0",
)

# Mount the FastMCP SSE routes onto our FastAPI app
# FastMCP provides an SSE handler via .sse_app or similar, but
# let's just use FastMCP's built-in FastAPI mounting if available.
# Actually, FastMCP provides an `add_to_fastapi` method in recent versions.
# If not, we'll use standard mcp.server tools. But FastMCP is the recommended way.
# For now, let's just let FastMCP run its own SSE server.
mcp_app = mcp.create_fastapi_app()

@mcp_app.get("/health")
async def health():
    return {"status": "ok", "service": "mcp-search", "tools": ["web_search"]}

# We replace the original `app` with `mcp_app` so uvicorn uses it.
app = mcp_app
