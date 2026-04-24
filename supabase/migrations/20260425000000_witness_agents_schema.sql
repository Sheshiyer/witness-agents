-- ═══════════════════════════════════════════════════════════════════════
-- Witness Agents — Supabase Schema Migration
-- Tables: users, user_profiles, readings, api_keys, decoder_state
-- Run: supabase db push (from project root)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Users ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
  consciousness_level INTEGER NOT NULL DEFAULT 0
    CHECK (consciousness_level BETWEEN 0 AND 5),
  experience_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── User Profiles (birth data, preferences) ────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  birth_date TEXT,              -- YYYY-MM-DD
  birth_time TEXT,              -- HH:MM
  birth_location_lat DOUBLE PRECISION,
  birth_location_lng DOUBLE PRECISION,
  birth_location_name TEXT,
  timezone TEXT DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Readings (engine calculation results) ───────────────────────────
CREATE TABLE IF NOT EXISTS readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  engine_id TEXT NOT NULL,
  workflow_id TEXT,
  input_hash TEXT NOT NULL,        -- SHA-256 of birth_data for caching
  input_data JSONB NOT NULL,
  result_data JSONB NOT NULL,
  witness_prompt TEXT,
  consciousness_level INTEGER DEFAULT 0,
  calculation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readings_user ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_hash ON readings(input_hash, engine_id);

-- ─── API Keys ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT UNIQUE NOT NULL,    -- SHA-256 of the actual key
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'basic', 'premium', 'enterprise')),
  permissions JSONB DEFAULT '{}',
  consciousness_level INTEGER DEFAULT 0,
  rate_limit INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(key_hash) WHERE is_active = true;

-- ─── Decoder State (Daily Witness progression tracking) ──────────────
-- user_hash is SHA-256(birth_data) — no PII stored
CREATE TABLE IF NOT EXISTS decoder_state (
  user_hash TEXT PRIMARY KEY,
  total_visits INTEGER NOT NULL DEFAULT 0,
  consecutive_days INTEGER NOT NULL DEFAULT 0,
  last_visit DATE NOT NULL DEFAULT CURRENT_DATE,
  first_visit DATE NOT NULL DEFAULT CURRENT_DATE,
  max_layer_reached INTEGER NOT NULL DEFAULT 1
    CHECK (max_layer_reached BETWEEN 1 AND 3),
  finder_gate_shown BOOLEAN NOT NULL DEFAULT false,
  graduation_shown BOOLEAN NOT NULL DEFAULT false,
  engines_most_viewed JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Row Level Security ──────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE decoder_state ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (used by server)
CREATE POLICY "service_all_users" ON users FOR ALL USING (true);
CREATE POLICY "service_all_profiles" ON user_profiles FOR ALL USING (true);
CREATE POLICY "service_all_readings" ON readings FOR ALL USING (true);
CREATE POLICY "service_all_keys" ON api_keys FOR ALL USING (true);
CREATE POLICY "service_all_decoder" ON decoder_state FOR ALL USING (true);

-- ─── Updated-at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER decoder_state_updated_at
  BEFORE UPDATE ON decoder_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
