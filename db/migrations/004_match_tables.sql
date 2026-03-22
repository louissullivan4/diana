-- ====================================
-- Migration 004: Add match_details, match_timeline, rank_tracking tables
-- ====================================

CREATE TABLE IF NOT EXISTS "match_details" (
    "mid"               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId"           VARCHAR(50)  NOT NULL,
    "entryPlayerPuuid"  VARCHAR(200) NOT NULL,
    "gameVersion"       VARCHAR(50),
    "gameCreation"      BIGINT,
    "gameStartTime"     BIGINT,
    "gameEndTime"       BIGINT,
    "gameDuration"      INT,
    "gameMode"          VARCHAR(50),
    "gameType"          VARCHAR(50),
    "queueType"         VARCHAR(100),
    "queueId"           INT,
    "mapName"           INT,
    "participants"      JSONB,
    "teams"             JSONB,
    "lastUpdated"       TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT unique_match_details_participant UNIQUE ("matchId", "entryPlayerPuuid"),
    FOREIGN KEY ("entryPlayerPuuid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_match_details_entryPlayerPuuid" ON "match_details" ("entryPlayerPuuid");
CREATE INDEX IF NOT EXISTS "idx_match_details_participants"      ON "match_details" USING GIN ("participants");
CREATE INDEX IF NOT EXISTS "idx_match_details_teams"            ON "match_details" USING GIN ("teams");

CREATE TABLE IF NOT EXISTS "match_timeline" (
    "id"          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId"     VARCHAR(50)  NOT NULL,
    "timelineData" JSONB,
    "createdAt"   TIMESTAMPTZ  DEFAULT NOW(),
    "updatedAt"   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_match_timeline_mid" ON "match_timeline" ("matchId");

CREATE TABLE IF NOT EXISTS "rank_tracking" (
    "rid"                 INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId"             VARCHAR(50)  NOT NULL,
    "entryParticipantId"  VARCHAR(200) NOT NULL,
    "tier"                VARCHAR(15)  DEFAULT 'UNRANKED',
    "rank"                VARCHAR(15)  DEFAULT 'IV',
    "lp"                  INT          DEFAULT 0,
    "queueType"           VARCHAR(50),
    "lastUpdated"         TIMESTAMPTZ  DEFAULT NOW(),
    CONSTRAINT unique_rank_tracking_participant UNIQUE ("matchId", "entryParticipantId"),
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_rank_tracking_entryParticipantId" ON "rank_tracking" ("entryParticipantId", "matchId");
