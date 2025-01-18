-- Create summoners table
CREATE TABLE IF NOT EXISTS summoners (
    puuid VARCHAR(200) PRIMARY KEY NOT NULL,
    gameName VARCHAR(100) NOT NULL,
    tagLine VARCHAR(10) NOT NULL,
    region VARCHAR(20) NOT NULL,
    matchRegionPrefix VARCHAR(10) DEFAULT 'EUW1',
    deepLolLink VARCHAR(150),
    tier VARCHAR(15) DEFAULT 'UNRANKED',
    rank VARCHAR(15) DEFAULT null,
    lp INT DEFAULT 0,
    lastUpdated TIMESTAMP DEFAULT NOW()
);

-- Create match_details table
CREATE TABLE IF NOT EXISTS match_details (
    matchId VARCHAR(50) PRIMARY KEY NOT NULL,
    entryPlayerPuuid VARCHAR(200) UNIQUE NOT NULL,
    gameVersion VARCHAR(50),
    gameCreation BIGINT,
    gameStartTime BIGINT,
    gameEndTime BIGINT,
    gameDuration INT,
    gameMode VARCHAR(50),
    gameType VARCHAR(50),
    queueType INT,
    mapName INT,
    participants JSONB
    teams JSONB,
    lastUpdated TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (entryPlayerPuuid) REFERENCES summoners (puuid) ON DELETE CASCADE
);

-- Create match_timeline table
CREATE TABLE IF NOT EXISTS match_timeline (
    matchId VARCHAR(50) PRIMARY KEY NOT NULL,
    entryParticipantId VARCHAR(50) NOT NULL,
    frameIndex INT,
    timestamp BIGINT,
    participantFrames JSONB,
    events JSONB,
    lastUpdated TIMESTAMP DEFAULT NOW()

    FOREIGN KEY (entryParticipantId) REFERENCES summoners (puuid) ON DELETE CASCADE
    FOREIGN KEY (matchId) REFERENCES match_details (matchId) ON DELETE CASCADE
);
