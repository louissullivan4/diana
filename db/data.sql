-- Create summoners table
CREATE TABLE IF NOT EXISTS summoners (
    id SERIAL PRIMARY KEY,
    puuid VARCHAR(200) UNIQUE NOT NULL,
    gameName VARCHAR(100) NOT NULL,
    tagLine VARCHAR(10) NOT NULL,
    region VARCHAR(20) NOT NULL,
    updatedAt TIMESTAMP DEFAULT NOW()
);

-- Create match_ids table
CREATE TABLE IF NOT EXISTS match_ids (
    id SERIAL PRIMARY KEY,
    matchId VARCHAR(50) UNIQUE NOT NULL,
    puuid VARCHAR(200),
    updatedAt TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (puuid) REFERENCES summoners (puuid) ON DELETE CASCADE
);

-- Create match_details table
CREATE TABLE IF NOT EXISTS match_details (
    id SERIAL PRIMARY KEY,
    matchId VARCHAR(50) UNIQUE NOT NULL,
    gameVersion VARCHAR(50),
    gameCreation BIGINT,
    gameStartTime BIGINT,
    gameEndTime BIGINT,
    gameDuration INT,
    gameMode VARCHAR(50),
    gameType VARCHAR(50),
    queueId INT,
    mapId INT,
    tournamentCode VARCHAR(50),
    participants JSONB,
    teams JSONB,
    lastUpdated TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (matchId) REFERENCES match_ids (matchId) ON DELETE CASCADE
);

-- Create match_timeline table
CREATE TABLE IF NOT EXISTS match_timeline (
    id SERIAL PRIMARY KEY,
    matchId VARCHAR(50) NOT NULL,
    frameIndex INT,
    timestamp BIGINT,
    participantFrames JSONB,
    events JSONB,

    FOREIGN KEY (matchId) REFERENCES match_details (matchId) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_summoners_puuid ON summoners (puuid);
CREATE INDEX IF NOT EXISTS idx_match_ids_matchId ON match_ids (matchId);
CREATE INDEX IF NOT EXISTS idx_match_details_matchId ON match_details (matchId);
CREATE INDEX IF NOT EXISTS idx_match_details_gameCreation ON match_details (gameCreation);
CREATE INDEX IF NOT EXISTS idx_match_details_queueId ON match_details (queueId);
CREATE INDEX IF NOT EXISTS idx_match_timeline_matchId ON match_timeline (matchId);
CREATE INDEX IF NOT EXISTS idx_match_timeline_frameIndex ON match_timeline (frameIndex);

-- Schedule a daily cleanup job to delete stale match details (older than 14 days)
-- Only delete matches for summoners with at least 20 matches
-- Note: Ensure that the `pg_cron` extension is installed and configured in your PostgreSQL.
-- Uncomment and adjust the following lines as needed.

-- SELECT cron.schedule(
--     'delete_stale_match_details',
--     '0 0 * * *',
--     $$
--     DELETE FROM match_details
--     WHERE lastUpdated < NOW() - INTERVAL '14 days'
--     AND matchId IN (
--         SELECT matchId
--         FROM match_ids
--         WHERE puuid IN (
--             SELECT puuid
--             FROM match_ids
--             GROUP BY puuid
--             HAVING COUNT(*) >= 20
--         )
--     )
--     $$  -- End of the SQL command string
-- );
