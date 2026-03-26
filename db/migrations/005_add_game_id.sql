-- ====================================
-- Migration 005: Add game_id discriminator to shared tables
-- Allows summoners, scores, matches and rank tracking to be shared
-- across multiple game plugins (league_of_legends, apex_legends, etc.)
-- ====================================

-- summoners: change unique constraint from gameName to (gameName, game_id)
ALTER TABLE summoners
    ADD COLUMN IF NOT EXISTS game_id VARCHAR(50) NOT NULL DEFAULT 'league_of_legends';

ALTER TABLE summoners
    DROP CONSTRAINT IF EXISTS "summoners_gameName_key";

ALTER TABLE summoners
    ADD CONSTRAINT summoners_gamename_game_id_key UNIQUE ("gameName", "game_id");

-- match_scores: add game_id
ALTER TABLE match_scores
    ADD COLUMN IF NOT EXISTS game_id VARCHAR(50) NOT NULL DEFAULT 'league_of_legends';

-- match_details: add game_id
ALTER TABLE match_details
    ADD COLUMN IF NOT EXISTS game_id VARCHAR(50) NOT NULL DEFAULT 'league_of_legends';

-- rank_tracking: add game_id
ALTER TABLE rank_tracking
    ADD COLUMN IF NOT EXISTS game_id VARCHAR(50) NOT NULL DEFAULT 'league_of_legends';

CREATE INDEX IF NOT EXISTS idx_summoners_game_id       ON summoners (game_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_game_id    ON match_scores (game_id);
CREATE INDEX IF NOT EXISTS idx_match_details_game_id   ON match_details (game_id);
CREATE INDEX IF NOT EXISTS idx_rank_tracking_game_id   ON rank_tracking (game_id);
