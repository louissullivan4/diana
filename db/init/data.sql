-- ====================================
-- Drop existing objects
-- ====================================
DROP INDEX IF EXISTS "idx_match_details_entryPlayerPuuid";
DROP INDEX IF EXISTS "idx_match_timeline_mid";
DROP INDEX IF EXISTS "idx_match_details_participants";
DROP INDEX IF EXISTS "idx_match_details_teams";
DROP INDEX IF EXISTS "idx_match_timeline_events";
DROP INDEX IF EXISTS "idx_match_timeline_participantFrames";
DROP INDEX IF EXISTS "idx_rank_tracking_entryParticipantId";
DROP TABLE IF EXISTS "rank_tracking" CASCADE;
DROP TABLE IF EXISTS "match_timeline" CASCADE;
DROP TABLE IF EXISTS "match_details" CASCADE;
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
    "currentMatchId" VARCHAR(50),
    "discordChannelId" VARCHAR(50),
    "regionGroup" VARCHAR(50),
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO "summoners" (
    "puuid",
    "gameName",
    "tagLine",
    "region",
    "matchRegionPrefix",
    "deepLolLink",
    "discordChannelId",
    "regionGroup"
) VALUES
(
    '0QapQDpnDB9zPfyzYpJBUXWlU6C6fKBtWfvAEq8KV2SxD2UgWUwKseHZu6_pbxCiV4XN10F54olDKQ',
    'FM Stew',
    'RATS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FM%20Stew-RATS',
    '1424782745300893879',
    'EUROPE'
),
(
    '3orFsnrwPN2WGnOJ_ncaM6x3iGzE4Fd_IDQ8kezKZJt8jIsMKHFdI4NLBAQwEyRcSoJ1RroVw74A-g',
    'FM Pruhaps',
    'BAUSS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/EUW/FM%20Pruhaps-BAUSS',
    'Unranked',
    'N/A',
     0,
    '1424782745300893879',
    'EUROPE'
),
(
    'Peff-LARgAbk6xCJO0cLm_f_gCeAF3p3RNQlfJBFGcfWMd6yqCC-zfeFkmEMWtnAbfCnRS_Ocy-H6A',
    'Melon',
    'FM Fishy',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FishyMelon-Fishy',
    'Unranked',
    'N/A',
     0,
    '1424782745300893879',
    'EUROPE'
)
ON CONFLICT ("puuid") DO NOTHING;

-- ====================================
-- 2. Create Match_Details Table
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
    "queueType" INT,
    "mapName" INT,
    "participants" JSONB,
    "teams" JSONB,
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_participant UNIQUE ("matchId", "entryParticipantId")
    FOREIGN KEY ("entryPlayerPuuid") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 3. Create Match_Timeline Table
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
    CONSTRAINT unique_match_participant UNIQUE ("mid", "entryParticipantId")
    FOREIGN KEY ("mid") REFERENCES "match_details" ("mid") ON DELETE CASCADE,
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 4. Create rank_tracking Table
-- ====================================
CREATE TABLE "rank_tracking" (
    "rid" INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "matchId" VARCHAR(50) NOT NULL,
    "entryParticipantId" VARCHAR(200) NOT NULL,
    "tier" VARCHAR(15) DEFAULT 'IV',
    "rank" VARCHAR(15) DEFAULT 'UNRANKED',
    "lp" INT DEFAULT 0,
    "queueType" VARCHAR(50),
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_match_participant UNIQUE ("matchId", "entryParticipantId"),
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 5. Create Indexes
-- ====================================
CREATE INDEX "idx_match_details_entryPlayerPuuid" ON "match_details" ("entryPlayerPuuid");
CREATE INDEX "idx_match_details_participants" ON "match_details" USING GIN ("participants");
CREATE INDEX "idx_match_details_teams" ON "match_details" USING GIN ("teams");
CREATE INDEX "idx_match_timeline_events" ON "match_timeline" USING GIN ("events");
CREATE INDEX "idx_match_timeline_participantFrames" ON "match_timeline" USING GIN ("participantFrames");
CREATE INDEX "idx_rank_tracking_entryParticipantId" ON "rank_tracking" ("entryParticipantId", "matchId");