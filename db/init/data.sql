-- ====================================
-- Drop existing objects
-- ====================================
DROP INDEX IF EXISTS "idx_match_scores_puuid";
DROP INDEX IF EXISTS "idx_match_scores_matchId";
DROP INDEX IF EXISTS "idx_match_details_entryPlayerPuuid";
DROP INDEX IF EXISTS "idx_match_timeline_mid";
DROP INDEX IF EXISTS "idx_match_details_participants";
DROP INDEX IF EXISTS "idx_match_details_teams";
DROP INDEX IF EXISTS "idx_match_timeline_events";
DROP INDEX IF EXISTS "idx_match_timeline_participantFrames";
DROP INDEX IF EXISTS "idx_rank_tracking_entryParticipantId";
DROP TABLE IF EXISTS "match_scores" CASCADE;
DROP TABLE IF EXISTS "rank_tracking" CASCADE;
DROP TABLE IF EXISTS "match_timeline" CASCADE;
DROP TABLE IF EXISTS "match_details" CASCADE;
DROP TABLE IF EXISTS "guild_summoners" CASCADE;
DROP TABLE IF EXISTS "guild_config" CASCADE;
DROP TABLE IF EXISTS "summoners" CASCADE;
DROP TABLE IF EXISTS "regions" CASCADE;

-- ====================================
-- 1. Create Summoners Table
-- ====================================
CREATE TABLE "summoners" (
    "puuid" VARCHAR(200) PRIMARY KEY,
    "gameName" VARCHAR(100) NOT NULL UNIQUE,
    "tagLine" VARCHAR(10) NOT NULL,
    "region" VARCHAR(20) NOT NULL DEFAULT 'EU_WEST',
    "matchRegionPrefix" VARCHAR(10) DEFAULT 'EUW1',
    "deepLolLink" VARCHAR(150),
    "tier" VARCHAR(25) DEFAULT 'UNRANKED',
    "rank" VARCHAR(25) DEFAULT 'N/A',
    "lp" INT DEFAULT 0,
    "currentMatchId" VARCHAR(80) DEFAULT NULL,
    "discordChannelId" VARCHAR(50),
    "regionGroup" VARCHAR(50),
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 2. Create Guild Config Table
-- ====================================
CREATE TABLE "guild_config" (
    "guild_id"     VARCHAR(30) PRIMARY KEY,
    "channel_id"   VARCHAR(30),
    "live_posting" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at"   TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================
-- 3. Create Guild Summoners Table
-- ====================================
CREATE TABLE "guild_summoners" (
    "guild_id"  VARCHAR(30) NOT NULL,
    "puuid"     VARCHAR(200) NOT NULL,
    "added_by"  VARCHAR(30),
    "added_at"  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("guild_id", "puuid"),
    FOREIGN KEY ("puuid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 5. Create Match_Details Table
-- ====================================
CREATE TABLE "match_details" (
    "mid" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId" VARCHAR(50) NOT NULL,
    "entryPlayerPuuid" VARCHAR(200) NOT NULL,
    "gameVersion" VARCHAR(50),
    "gameCreation" BIGINT,
    "gameStartTime" BIGINT,
    "gameEndTime" BIGINT,
    "gameDuration" INT,
    "gameMode" VARCHAR(50),
    "gameType" VARCHAR(50),
    "queueType" VARCHAR(100),
    "queueId" INT,
    "mapName" INT,
    "participants" JSONB,
    "teams" JSONB,
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_details_participant UNIQUE ("matchId", "entryPlayerPuuid"),
    FOREIGN KEY ("entryPlayerPuuid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 6. Create Match_Timeline Table
-- ====================================
CREATE TABLE "match_timeline" (
    "tid" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "mid" INT NOT NULL,
    "entryParticipantId" VARCHAR(200) NOT NULL,
    "frameIndex" INT,
    "timestamp" BIGINT,
    "participantFrames" JSONB,
    "events" JSONB,
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_timeline_participant UNIQUE ("mid", "entryParticipantId"),
    FOREIGN KEY ("mid") REFERENCES "match_details" ("mid") ON DELETE CASCADE,
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 7. Create rank_tracking Table
-- ====================================
CREATE TABLE "rank_tracking" (
    "rid" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId" VARCHAR(50) NOT NULL,
    "entryParticipantId" VARCHAR(200) NOT NULL,
    "tier" VARCHAR(15) DEFAULT 'UNRANKED',
    "rank" VARCHAR(15) DEFAULT 'IV',
    "lp" INT DEFAULT 0,
    "queueType" VARCHAR(50),
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rank_tracking_participant UNIQUE ("matchId", "entryParticipantId"),
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 8. Create match_scores Table
-- ====================================
CREATE TABLE "match_scores" (
    "sid"       INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId"   VARCHAR(50)    NOT NULL,
    "puuid"     VARCHAR(200)   NOT NULL,
    "score"     NUMERIC(8, 4)  NOT NULL,
    "placement" SMALLINT       NOT NULL,
    "role"      VARCHAR(20),
    "win"       BOOLEAN        NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ    DEFAULT NOW(),
    CONSTRAINT "unique_match_score" UNIQUE ("matchId", "puuid")
);

-- ====================================
-- 9. Create Indexes
-- ====================================
CREATE INDEX "idx_match_details_entryPlayerPuuid" ON "match_details" ("entryPlayerPuuid");
CREATE INDEX "idx_match_details_participants" ON "match_details" USING GIN ("participants");
CREATE INDEX "idx_match_details_teams" ON "match_details" USING GIN ("teams");
CREATE INDEX "idx_match_timeline_events" ON "match_timeline" USING GIN ("events");
CREATE INDEX "idx_match_timeline_participantFrames" ON "match_timeline" USING GIN ("participantFrames");
CREATE INDEX "idx_rank_tracking_entryParticipantId" ON "rank_tracking" ("entryParticipantId", "matchId");
CREATE INDEX "idx_match_scores_matchId" ON "match_scores" ("matchId");
CREATE INDEX "idx_match_scores_puuid"   ON "match_scores" ("puuid");
