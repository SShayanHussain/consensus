-- Consensus — local DB initialization
-- Mounted into /docker-entrypoint-initdb.d/ by docker-compose.
-- Only runs on the local container's first boot; managed DBs (Supabase) need migrations.

-- No pgvector needed for Consensus core (no embeddings).
-- Extensions can be added here if needed later.
