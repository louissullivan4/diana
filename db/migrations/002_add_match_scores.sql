-- ====================================
-- Migration 002: Add match_scores table
-- ====================================
-- Stores per-participant placement scores for every tracked match.
-- One row per (matchId, puuid) combination covering all 10 participants,
-- not just tracked summoners.

CREATE TABLE IF NOT EXISTS "match_scores" (
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

CREATE INDEX IF NOT EXISTS "idx_match_scores_matchId" ON "match_scores" ("matchId");
CREATE INDEX IF NOT EXISTS "idx_match_scores_puuid"   ON "match_scores" ("puuid");
