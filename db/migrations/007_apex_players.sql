-- ====================================
-- Migration 007: Dedicated Apex Legends player tables
-- Replaces the shared summoners table for apex data.
-- The summoners table required tagLine NOT NULL which Apex has no concept of.
-- ====================================

CREATE TABLE IF NOT EXISTS "apex_players" (
    "uid"              VARCHAR(200) PRIMARY KEY,
    "gameName"         VARCHAR(200) NOT NULL,
    "platform"         VARCHAR(20)  NOT NULL,
    "tier"             VARCHAR(50)  NOT NULL DEFAULT 'Unranked',
    "division"         INT          NOT NULL DEFAULT 0,
    "rp"               INT          NOT NULL DEFAULT 0,
    "currentMatchId"   VARCHAR(200),
    "discordChannelId" VARCHAR(200),
    "lastUpdated"      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apex_players_gamename ON apex_players ("gameName");

CREATE TABLE IF NOT EXISTS "guild_apex_players" (
    "id"        SERIAL       PRIMARY KEY,
    "guild_id"  VARCHAR(200) NOT NULL,
    "uid"       VARCHAR(200) NOT NULL REFERENCES apex_players(uid) ON DELETE CASCADE,
    "added_by"  VARCHAR(200),
    "added_at"  TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE ("guild_id", "uid")
);

CREATE INDEX IF NOT EXISTS idx_guild_apex_players_guild ON guild_apex_players (guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_apex_players_uid   ON guild_apex_players (uid);

-- Migrate any existing apex data from summoners to apex_players
-- (In practice all inserts were failing due to tagLine constraint, so this is a no-op)
INSERT INTO apex_players (uid, "gameName", platform, tier, division, rp, "currentMatchId", "discordChannelId", "lastUpdated")
SELECT
    puuid,
    "gameName",
    region,
    COALESCE(tier, 'Unranked'),
    COALESCE(NULLIF(rank, '')::INT, 0),
    COALESCE(lp, 0),
    "currentMatchId",
    "discordChannelId",
    COALESCE("lastUpdated", NOW())
FROM summoners
WHERE game_id = 'apex_legends'
ON CONFLICT (uid) DO NOTHING;

-- Migrate guild associations
INSERT INTO guild_apex_players (guild_id, uid)
SELECT gs.guild_id, gs.puuid
FROM guild_summoners gs
JOIN summoners s ON s.puuid = gs.puuid
WHERE s.game_id = 'apex_legends'
ON CONFLICT (guild_id, uid) DO NOTHING;

-- Clean up summoners rows for apex (now in apex_players)
DELETE FROM guild_summoners gs
USING summoners s
WHERE gs.puuid = s.puuid AND s.game_id = 'apex_legends';

DELETE FROM summoners WHERE game_id = 'apex_legends';

-- Fix apex_match_details foreign key to point to apex_players instead of summoners
ALTER TABLE apex_match_details
    DROP CONSTRAINT IF EXISTS apex_match_details_player_uid_fkey;

ALTER TABLE apex_match_details
    ADD CONSTRAINT apex_match_details_player_uid_fkey
    FOREIGN KEY (player_uid) REFERENCES apex_players(uid) ON DELETE CASCADE;
