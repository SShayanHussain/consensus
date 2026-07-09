import asyncio
import aiohttp
import time

GATEWAY_URL = "http://localhost:8000"

async def spawn_agent_run(session: aiohttp.ClientSession, index: int):
    """Hits the gateway API to enqueue a new background agent run."""
    start_time = time.time()
    payload = {
        "goal": f"Load test goal {index}: Analyze the history of open source software.",
        "workspace_id": "00000000-0000-0000-0000-000000000000" # Dummy workspace UUID
    }
    
    try:
        async with session.post(f"{GATEWAY_URL}/api/runs", json=payload) as response:
            result = await response.json()
            latency = time.time() - start_time
            print(f"Run {index} enqueued in {latency:.2f}s | Status: {response.status} | Run ID: {result.get('id')}")
            return result
    except Exception as e:
        print(f"Run {index} failed to enqueue: {e}")
        return None

async def main():
    """Concurrent agent-loop load test (queue + checkpointing hold)."""
    num_concurrent_runs = 5
    
    print(f"Starting load test: enqueueing {num_concurrent_runs} runs concurrently...")
    
    async with aiohttp.ClientSession() as session:
        tasks = [spawn_agent_run(session, i) for i in range(num_concurrent_runs)]
        results = await asyncio.gather(*tasks)
        
    success_count = sum(1 for r in results if r is not None)
    print(f"Load test enqueue complete. Successfully queued: {success_count}/{num_concurrent_runs}")
    print("Check Redis / Celery / Worker logs to ensure they are processing without deadlocking.")

if __name__ == "__main__":
    asyncio.run(main())
