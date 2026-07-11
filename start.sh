#!/bin/bash

echo "Starting MCP Search Tool..."
(cd mcp/search && uvicorn app.main:app --host 0.0.0.0 --port 9001) &

echo "Starting Agent Worker..."
# PYTHONPATH=. ensures the `app` package under agent/ is importable by the
# rq work-horse (the rq console script does not add the CWD to sys.path).
(cd agent && PYTHONPATH=. rq worker -u "$REDIS_URL") &

echo "Starting FastAPI Gateway..."
(cd gateway && uvicorn app.main:app --host 0.0.0.0 --port "$PORT")
