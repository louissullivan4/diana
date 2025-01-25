-- data.sql

-- ====================================
-- 1. Create Regions Table for Normalization
-- ====================================

CREATE TABLE IF NOT EXISTS regions (
    region_code VARCHAR(20) PRIMARY KEY,
    region_name VARCHAR(50) NOT NULL
);

-- Populate regions table with sample data
INSERT INTO regions (region_code, region_name) VALUES
('EUW', 'Europe West'),
('NA', 'North America'),
('EUNE', 'Europe Nordic & East'),
('KR', 'Korea')
ON CONFLICT (region_code) DO NOTHING;

-- ====================================
-- 2. Create Summoners Table
-- ====================================
CREATE TABLE IF NOT EXISTS summoners (
    puuid VARCHAR(200) PRIMARY KEY,
    gameName VARCHAR(100) NOT NULL UNIQUE,
    tagLine VARCHAR(10) NOT NULL,
    region_code VARCHAR(20) NOT NULL,
    matchRegionPrefix VARCHAR(10) DEFAULT 'EUW1',
    deepLolLink VARCHAR(150),
    tier VARCHAR(15) DEFAULT 'UNRANKED',
    rank VARCHAR(15),
    lp INT DEFAULT 0,
    currentMatchId VARCHAR(50),
    discordChannelId VARCHAR(50),
    regionGroup VARCHAR(50),
    lastUpdated TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (region_code) REFERENCES regions (region_code)
);

INSERT INTO summoners (
    puuid,
    gameName,
    tagLine,
    region_code,
    matchRegionPrefix,
    deepLolLink,
    tier,
    rank,
    lp,
    discordChannelId,
    regionGroup
) VALUES
(
    '01XS0CtuZCXjlubxeCMW3RFZTS7WAo38zHvFWeokv3rGK6XDYVW4pPG586vKrKdccA3Ru2KA0OtQag',
    'LR Stew',
    'RATS',
    'EUW',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/LR%20Stew-RATS',
    'Unranked',
    'N/A',
    0,
    '1330320105657208942',
    'EUROPE'
),
(
    'ywqK5bySVAUGZXGcDAZns5wSZkKSL2gUA3_wBZQ57VdMm5UbeTNrN3J1YNaH97CACg7pe5g0oxkGdA',
    'LR Pruhaps',
    'Ascd',
    'EUW',
    'EUW1',
    'https://www.deeplol.gg/summoner/EUW/LR%20Pruhaps-BAUSS',
    'Unranked',
    'N/A',
     0,
    '1330320105657208942',
    'EUROPE'
),
(
    'rKCZwiocEjGVQp7pLq9WkrxhN5VGddJh-TX3NRa7LXslIZsWygt2r3UXdfg2DSwoY4Q3NpKTcbrkWg',
    'FishyMelon',
    'Fishy',
    'EUW',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FishyMelon-Fishy',
    'Unranked',
    'N/A',
     0,
    '1330320105657208942',
    'EUROPE'
)
ON CONFLICT (puuid) DO NOTHING;

-- ====================================
-- 3. Create Match_Details Table
-- ====================================

CREATE TABLE IF NOT EXISTS match_details (
    matchId VARCHAR(50) PRIMARY KEY,
    entryPlayerPuuid VARCHAR(200) NOT NULL,
    gameVersion VARCHAR(50),
    gameCreation BIGINT,
    gameStartTime BIGINT,
    gameEndTime BIGINT,
    gameDuration INT,
    gameMode VARCHAR(50),
    gameType VARCHAR(50),
    queueType INT,
    mapName INT,
    participants JSONB,
    teams JSONB,
    lastUpdated TIMESTAMPTZ DEFAULT NOW(),
    
    FOREIGN KEY (entryPlayerPuuid) REFERENCES summoners (puuid) ON DELETE CASCADE
);

-- ====================================
-- 4. Create Match_Timeline Table
-- ====================================

CREATE TABLE IF NOT EXISTS match_timeline (
    matchId VARCHAR(50) NOT NULL,
    entryParticipantId VARCHAR(200) NOT NULL,
    frameIndex INT,
    timestamp BIGINT,
    participantFrames JSONB,
    events JSONB,
    lastUpdated TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (matchId, entryParticipantId),
    
    FOREIGN KEY (matchId) REFERENCES match_details (matchId) ON DELETE CASCADE,
    FOREIGN KEY (entryParticipantId) REFERENCES summoners (puuid) ON DELETE CASCADE
);

-- ====================================
-- 75. Create Indexes
-- ====================================
CREATE INDEX IF NOT EXISTS idx_match_details_entryPlayerPuuid ON match_details (entryPlayerPuuid);
CREATE INDEX IF NOT EXISTS idx_match_timeline_matchId ON match_timeline (matchId);
CREATE INDEX IF NOT EXISTS idx_summoners_region_code ON summoners (region_code);
CREATE INDEX IF NOT EXISTS idx_match_details_participants ON match_details USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_match_timeline_events ON match_timeline USING GIN (events);

-- ====================================
-- 6. Create Roles and Assign Permissions
-- ====================================
-- CREATE ROLE web_user WITH LOGIN PASSWORD '<PUT_PASSWORD_HERE>';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO web_user;
-- REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

-- ====================================
-- 7. Change Password for Admin User 'postgres'
-- ====================================
-- ALTER USER postgres WITH PASSWORD '<PUT_ADMIN_PASSWORD_HERE>';