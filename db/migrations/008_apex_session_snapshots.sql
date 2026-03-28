-- ====================================
-- Migration 008: Add stat snapshot columns to apex_players
-- Used to compute per-session kills/damage/wins diffs.
-- Nullable - null means no baseline captured yet (player added before sessions).
-- ====================================

ALTER TABLE apex_players
    ADD COLUMN IF NOT EXISTS kills_snapshot INT,
    ADD COLUMN IF NOT EXISTS damage_snapshot INT,
    ADD COLUMN IF NOT EXISTS wins_snapshot  INT;
