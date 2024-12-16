DO
$$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_database
        WHERE datname = 'diana_db'
    ) THEN
        CREATE DATABASE diana_db;
    END IF;
END
$$;

\c diana_db;

-- Create summoners table
CREATE TABLE IF NOT EXISTS summoners (
    id SERIAL PRIMARY KEY,
    puuid VARCHAR(200) UNIQUE NOT NULL,
    game_name VARCHAR(100) NOT NULL,
    tag_line VARCHAR(10) NOT NULL,
    region VARCHAR(20) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create match_ids table
CREATE TABLE IF NOT EXISTS match_ids (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) UNIQUE NOT NULL,
    puuid VARCHAR(200),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (puuid) REFERENCES summoners (puuid) ON DELETE CASCADE
);

-- Create match_details table
CREATE TABLE IF NOT EXISTS match_details (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) UNIQUE NOT NULL,
    game_version VARCHAR(50),
    game_creation BIGINT,
    game_start_time BIGINT,
    game_end_time BIGINT,
    game_duration INT,
    game_mode VARCHAR(50),
    game_type VARCHAR(50),
    queue_id INT,
    map_id INT,
    tournament_code VARCHAR(50),
    participants JSONB,
    teams JSONB,
    last_updated TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (match_id) REFERENCES match_ids (match_id) ON DELETE CASCADE
);

-- Create match_timeline table
CREATE TABLE IF NOT EXISTS match_timeline (
    id SERIAL PRIMARY KEY,
    match_id VARCHAR(50) NOT NULL,
    frame_index INT,
    timestamp BIGINT,
    participant_frames JSONB,
    events JSONB,

    FOREIGN KEY (match_id) REFERENCES match_details (match_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_summoners_puuid ON summoners (puuid);
CREATE INDEX IF NOT EXISTS idx_match_ids_match_id ON match_ids (match_id);
CREATE INDEX IF NOT EXISTS idx_match_details_match_id ON match_details (match_id);
CREATE INDEX IF NOT EXISTS idx_match_details_game_creation ON match_details (game_creation);
CREATE INDEX IF NOT EXISTS idx_match_details_queue_id ON match_details (queue_id);
CREATE INDEX IF NOT EXISTS idx_match_timeline_match_id ON match_timeline (match_id);
CREATE INDEX IF NOT EXISTS idx_match_timeline_frame_index ON match_timeline (frame_index);

DO
$$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
END
$$;

-- Schedule a daily cleanup job to delete stale match details (older than 14 days)
-- Only delete matches for summoners with at least 20 matches
SELECT cron.schedule(
    'delete_stale_match_details',
    '0 0 * * *',
    $$
    DELETE FROM match_details
    WHERE last_updated < NOW() - INTERVAL '14 days'
    AND match_id IN (
        SELECT match_id
        FROM match_ids
        WHERE puuid IN (
            SELECT puuid
            FROM match_ids
            GROUP BY puuid
            HAVING COUNT(*) >= 20
        )
    )
    $$;
);
