-- Erstelle die user_stats Tabelle in Supabase
-- Führe diese SQL-Befehle in der Supabase SQL Editor aus

-- Erstelle die user_stats Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS user_stats (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    key TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, key)
);

-- Erstelle Indizes für schnellere Abfragen (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_key ON user_stats(key);

-- Aktiviere Row Level Security (RLS)
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Lösche existierende Policies und erstelle sie neu (um sicherzustellen, dass sie korrekt sind)
DROP POLICY IF EXISTS "Users can read own data" ON user_stats;
DROP POLICY IF EXISTS "Users can insert own data" ON user_stats;
DROP POLICY IF EXISTS "Users can update own data" ON user_stats;
DROP POLICY IF EXISTS "Users can delete own data" ON user_stats;

-- Erstelle Policies für authentifizierte User
-- User können nur ihre eigenen Daten lesen/schreiben
CREATE POLICY "Users can read own data" ON user_stats
    FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own data" ON user_stats
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own data" ON user_stats
    FOR UPDATE
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own data" ON user_stats
    FOR DELETE
    USING (auth.uid()::text = user_id);

-- Erstelle die naps Tabelle für einzelne Nap-Einträge (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS naps (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    nap_date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    xp_earned INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Erstelle Indizes für schnellere Abfragen (falls nicht vorhanden)
CREATE INDEX IF NOT EXISTS idx_naps_user_id ON naps(user_id);
CREATE INDEX IF NOT EXISTS idx_naps_nap_date ON naps(nap_date);
CREATE INDEX IF NOT EXISTS idx_naps_user_date ON naps(user_id, nap_date);

-- Aktiviere Row Level Security (RLS)
ALTER TABLE naps ENABLE ROW LEVEL SECURITY;

-- Lösche existierende Policies und erstelle sie neu (um sicherzustellen, dass sie korrekt sind)
DROP POLICY IF EXISTS "Users can read own naps" ON naps;
DROP POLICY IF EXISTS "Users can insert own naps" ON naps;
DROP POLICY IF EXISTS "Users can delete own naps" ON naps;

-- Erstelle Policies für authentifizierte User
CREATE POLICY "Users can read own naps" ON naps
    FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own naps" ON naps
    FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own naps" ON naps
    FOR DELETE
    USING (auth.uid()::text = user_id);

