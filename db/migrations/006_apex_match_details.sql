-- ====================================
-- Migration 006: Apex match details table
-- Stores one row per detected match per tracked player.
-- Stats are captured before/after by diffing /bridge aggregate stats.
-- ====================================

CREATE TABLE IF NOT EXISTS "apex_match_details" (
    "id"              INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "player_uid"      VARCHAR(200) NOT NULL,
    "match_start"     BIGINT       NOT NULL,
    "match_end"       BIGINT,
    "legend"          VARCHAR(100),
    -- snapshot before match
    "kills_before"    INT          NOT NULL DEFAULT 0,
    "damage_before"   INT          NOT NULL DEFAULT 0,
    "wins_before"     INT          NOT NULL DEFAULT 0,
    -- snapshot after match (NULL until match ends)
    "kills_after"     INT,
    "damage_after"    INT,
    "wins_after"      INT,
    -- rank snapshots
    "rp_before"       INT          NOT NULL DEFAULT 0,
    "rp_after"        INT,
    "tier_before"     VARCHAR(50),
    "tier_after"      VARCHAR(50),
    "game_id"         VARCHAR(50)  NOT NULL DEFAULT 'apex_legends',
    "created_at"      TIMESTAMPTZ  DEFAULT NOW(),
    FOREIGN KEY ("player_uid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_apex_match_player ON apex_match_details (player_uid, match_start DESC);
CREATE INDEX IF NOT EXISTS idx_apex_match_game_id ON apex_match_details (game_id);
