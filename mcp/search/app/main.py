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

app = mcp.sse_app()

from starlette.routing import Route
from starlette.responses import JSONResponse

async def health(request):
    return JSONResponse({"status": "ok", "service": "mcp-search", "tools": ["web_search"]})

app.routes.append(Route("/health", health))
