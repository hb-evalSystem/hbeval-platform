-- HB-Eval OS Platform — Migration: Multi-agent user support
-- ===========================================================
-- Run this in Supabase SQL Editor BEFORE deploying the Next.js app.
--
-- What this creates:
--   1. agents table  — one row per agent per user (replaces "projects" for the platform)
--   2. Trigger       — auto-creates an agent with a fresh API key when a user registers
--   3. RLS policies  — each user sees only their own agents and evaluations
--
-- The existing "projects" table used by the Gateway is NOT touched.
-- The platform's "agents" table is a separate user-facing layer.

-- ── 1. Agents table ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
    id                      UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id                 UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name                    TEXT        NOT NULL DEFAULT 'My First Agent',
    description             TEXT        DEFAULT '',
    agent_id                TEXT        NOT NULL,  -- the agent_id sent in evaluate() payloads
    api_key                 TEXT        NOT NULL UNIQUE,
    plan_type               TEXT        NOT NULL DEFAULT 'free'
                                CHECK (plan_type IN ('free', 'pro', 'enterprise')),
    evaluation_limit        INTEGER     NOT NULL DEFAULT 500,
    evaluations_this_month  INTEGER     NOT NULL DEFAULT 0,
    last_reset_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common dashboard queries: "give me all agents for user X"
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_api_key  ON agents(api_key);

-- ── 2. Auto-generate API key on insert ───────────────────────────────────────
-- This function generates a fresh API key whenever a new agent row is created
-- without one. Format: hbeval_sk_ + 32 random hex chars.
CREATE OR REPLACE FUNCTION generate_agent_api_key()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.api_key IS NULL OR NEW.api_key = '' THEN
        NEW.api_key := 'hbeval_sk_' || encode(gen_random_bytes(16), 'hex');
    END IF;
    -- Also set a default agent_id if not provided
    IF NEW.agent_id IS NULL OR NEW.agent_id = '' THEN
        NEW.agent_id := 'agent-' || LEFT(NEW.id::TEXT, 8);
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_api_key
    BEFORE INSERT ON agents
    FOR EACH ROW EXECUTE FUNCTION generate_agent_api_key();

-- ── 3. Auto-create first agent on user registration ──────────────────────────
-- When a new user signs up via Supabase Auth, they automatically receive
-- their first agent with a pre-generated API key. No manual step required.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO agents (user_id, name, description)
    VALUES (
        NEW.id,
        'My First Agent',
        'Auto-created on registration. Rename to match your agent.'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop if exists to allow re-running this migration safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── 4. Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Users can only read their own agents
CREATE POLICY "Users can view own agents"
    ON agents FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert agents for themselves only
CREATE POLICY "Users can create own agents"
    ON agents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own agents (rename, description)
CREATE POLICY "Users can update own agents"
    ON agents FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own agents
CREATE POLICY "Users can delete own agents"
    ON agents FOR DELETE
    USING (auth.uid() = user_id);

-- ── 5. RLS on evaluations table (link to agents) ─────────────────────────────
-- The evaluations table already exists; we just add RLS so users see
-- only evaluations belonging to their agents.
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own evaluations"
    ON evaluations FOR SELECT
    USING (
        project_id IN (
            SELECT id FROM agents WHERE user_id = auth.uid()
        )
    );

-- The Gateway writes evaluations using service_role which bypasses RLS,
-- so no INSERT policy is needed here for user-facing reads.

-- ── 6. Atomic usage increment (reuse from freemium migration) ─────────────────
-- The increment_usage function already exists from migration_freemium.sql.
-- If running this migration alone, re-create it here targeting the agents table.
CREATE OR REPLACE FUNCTION increment_agent_usage(
    p_agent_id      UUID,
    p_current_year  INTEGER,
    p_current_month INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stored_year  INTEGER;
    v_stored_month INTEGER;
    v_new_count    INTEGER;
BEGIN
    SELECT EXTRACT(YEAR  FROM last_reset_date)::INTEGER,
           EXTRACT(MONTH FROM last_reset_date)::INTEGER
    INTO   v_stored_year, v_stored_month
    FROM   agents
    WHERE  id = p_agent_id
    FOR UPDATE;

    IF v_stored_year < p_current_year
       OR (v_stored_year = p_current_year AND v_stored_month < p_current_month)
    THEN
        UPDATE agents
        SET    evaluations_this_month = 1,
               last_reset_date        = MAKE_DATE(p_current_year, p_current_month, 1)
        WHERE  id = p_agent_id
        RETURNING evaluations_this_month INTO v_new_count;
    ELSE
        UPDATE agents
        SET    evaluations_this_month = evaluations_this_month + 1
        WHERE  id = p_agent_id
        RETURNING evaluations_this_month INTO v_new_count;
    END IF;

    RETURN v_new_count;
END;
$$;

-- ── Verification ──────────────────────────────────────────────────────────────
SELECT 'Migration complete. Tables: ' || COUNT(*)::TEXT || ' agents rows'
FROM agents;
