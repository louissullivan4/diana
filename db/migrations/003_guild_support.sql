-- ====================================
-- 002: Add guild_config and guild_summoners tables
-- ====================================

CREATE TABLE IF NOT EXISTS "guild_config" (
    "guild_id"     VARCHAR(30) PRIMARY KEY,
    "channel_id"   VARCHAR(30),
    "live_posting" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at"   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "guild_summoners" (
    "guild_id"  VARCHAR(30) NOT NULL,
    "puuid"     VARCHAR(200) NOT NULL,
    "added_by"  VARCHAR(30),
    "added_at"  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("guild_id", "puuid"),
    FOREIGN KEY ("puuid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);
