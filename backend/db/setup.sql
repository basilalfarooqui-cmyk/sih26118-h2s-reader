CREATE TABLE IF NOT EXISTS readings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_name TEXT NOT NULL,
  worker_id TEXT NOT NULL,
  hex_code TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('app', 'hardware')),
  time_recorded TIMESTAMPTZ NOT NULL,
  time_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS readings_worker_id_idx ON readings (worker_id);
CREATE INDEX IF NOT EXISTS readings_source_idx ON readings (source);
CREATE INDEX IF NOT EXISTS readings_time_recorded_idx ON readings (time_recorded DESC);

-- The backend only ever connects with the service_role key, which bypasses
-- RLS. Enabling it here just ensures the unused anon key in .env can never
-- read or write this table if it leaks or gets wired up elsewhere later.
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
