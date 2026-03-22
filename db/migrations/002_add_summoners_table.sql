-- ====================================
-- Migration 002: Add summoners table
-- ====================================
CREATE TABLE IF NOT EXISTS "summoners" (
    "puuid"             VARCHAR(200) PRIMARY KEY,
    "gameName"          VARCHAR(100) NOT NULL UNIQUE,
    "tagLine"           VARCHAR(10)  NOT NULL,
    "region"            VARCHAR(20)  NOT NULL DEFAULT 'EU_WEST',
    "matchRegionPrefix" VARCHAR(10)  DEFAULT 'EUW1',
    "deepLolLink"       VARCHAR(150),
    "tier"              VARCHAR(25)  DEFAULT 'UNRANKED',
    "rank"              VARCHAR(25)  DEFAULT 'N/A',
    "lp"                INT          DEFAULT 0,
    "currentMatchId"    VARCHAR(80)  DEFAULT NULL,
    "discordChannelId"  VARCHAR(50),
    "regionGroup"       VARCHAR(50),
    "lastUpdated"       TIMESTAMPTZ  DEFAULT NOW()
);
