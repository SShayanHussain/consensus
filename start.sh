#!/bin/bash

echo "Starting MCP Search Tool..."
(cd mcp/search && uvicorn app.main:app --host 0.0.0.0 --port 9001) &

echo "Starting Agent Worker..."
(cd agent && rq worker -u $REDIS_URL) &

echo "Starting FastAPI Gateway..."
(cd gateway && uvicorn app.main:app --host 0.0.0.0 --port $PORT)
