-- data.sql

-- ====================================
-- Drop existing objects
-- ====================================

DROP INDEX IF EXISTS "idx_match_details_entryPlayerPuuid";
DROP INDEX IF EXISTS "idx_match_timeline_mid";
DROP INDEX IF EXISTS "idx_match_details_participants";
DROP INDEX IF EXISTS "idx_match_details_teams";
DROP INDEX IF EXISTS "idx_match_timeline_events";
DROP INDEX IF EXISTS "idx_match_timeline_participantFrames";

DROP TABLE IF EXISTS "match_timeline" CASCADE;
DROP TABLE IF EXISTS "match_details" CASCADE;
DROP TABLE IF EXISTS "summoners" CASCADE;
DROP TABLE IF EXISTS "regions" CASCADE;

DROP ROLE IF EXISTS "web_user";


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
    "tier" VARCHAR(15) DEFAULT 'UNRANKED',
    "rank" VARCHAR(15),
    "lp" INT DEFAULT 0,
    "currentMatchId" VARCHAR(50),
    "discordChannelId" VARCHAR(50),
    "regionGroup" VARCHAR(50),
    "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
    "lastMissingDataNotification" TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO "summoners" (
    "puuid",
    "gameName",
    "tagLine",
    "region",
    "matchRegionPrefix",
    "deepLolLink",
    "tier",
    "rank",
    "lp",
    "discordChannelId",
    "regionGroup"
) VALUES
(
    '01XS0CtuZCXjlubxeCMW3RFZTS7WAo38zHvFWeokv3rGK6XDYVW4pPG586vKrKdccA3Ru2KA0OtQag',
    'LR Stew',
    'RATS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/LR%20Stew-RATS',
    'Unranked',
    'N/A',
    0,
    '1328406947677995099',
    'EUROPE'
),
(
    'ywqK5bySVAUGZXGcDAZns5wSZkKSL2gUA3_wBZQ57VdMm5UbeTNrN3J1YNaH97CACg7pe5g0oxkGdA',
    'LR Pruhaps',
    'BAUSS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/EUW/LR%20Pruhaps-BAUSS',
    'Unranked',
    'N/A',
     0,
    '1328406947677995099',
    'EUROPE'
),
(
    'rKCZwiocEjGVQp7pLq9WkrxhN5VGddJh-TX3NRa7LXslIZsWygt2r3UXdfg2DSwoY4Q3NpKTcbrkWg',
    'FishyMelon',
    'Fishy',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FishyMelon-Fishy',
    'Unranked',
    'N/A',
     0,
    '1328406947677995099',
    'EUROPE'
),
(
    'wsedDXW_ao6vCxfpdxBXohBYLZghQMtg7YxWtnVo9p_H3iv-M7ibWM2fU7MkK6Vn8LgXTOCLveex7w',
    'LouLou',
    'ATTIC',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/LouLou-ATTIC',
    'GOLD',
    'III',
    47,
    '1328406947677995099',
    'EUROPE'
)
(
    'VcKXZg_8LUk4vkqL_M93rKfOQCqzmTAMFIoJ7SwLXv56zpDOl2gsN9z05R8iFqwHx-InF6hJyqekSw',
    'Yez',
    '1234',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/Yez-1234',
    'Unranked',
    'N/A',
    0,
    '1328406947677995099',
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
    
    FOREIGN KEY ("mid") REFERENCES "match_details" ("mid") ON DELETE CASCADE,
    FOREIGN KEY ("entryParticipantId") REFERENCES "summoners" ("puuid") ON DELETE CASCADE
);

-- ====================================
-- 4. Create Indexes
-- ====================================
CREATE INDEX "idx_match_details_entryPlayerPuuid" ON "match_details" ("entryPlayerPuuid");
CREATE INDEX "idx_match_details_participants" ON "match_details" USING GIN ("participants");
CREATE INDEX "idx_match_details_teams" ON "match_details" USING GIN ("teams");
CREATE INDEX "idx_match_timeline_events" ON "match_timeline" USING GIN ("events");
CREATE INDEX "idx_match_timeline_participantFrames" ON "match_timeline" USING GIN ("participantFrames");

-- ====================================
-- 5. Create Roles and Assign Permissions
-- ====================================
CREATE ROLE "web_user" WITH LOGIN PASSWORD 'not_admin';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "web_user";
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- ====================================
-- 6. Change Password for Admin User 'postgres'
-- ====================================
ALTER USER "postgres" WITH PASSWORD 'admin';
