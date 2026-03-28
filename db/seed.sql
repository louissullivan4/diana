-- ====================================
-- Dev seed data
-- Run manually: psql $DATABASE_URL -f db/seed.sql
-- Replace placeholder values with real summoner data from your server
-- ====================================

INSERT INTO "summoners" (
    "puuid",
    "gameName",
    "tagLine",
    "region",
    "matchRegionPrefix",
    "deepLolLink",
    "regionGroup"
) VALUES
(
    'PUUID_PLACEHOLDER_1',
    'Player One',
    'TAG1',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/Player%20One-TAG1',
    'EUROPE'
),
(
    'PUUID_PLACEHOLDER_2',
    'Player Two',
    'TAG2',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/Player%20Two-TAG2',
    'EUROPE'
)
ON CONFLICT ("puuid") DO NOTHING;

-- Replace GUILD_ID and CHANNEL_ID with your dev server's values
-- INSERT INTO "guild_config" ("guild_id", "channel_id", "live_posting")
-- VALUES ('<YOUR_GUILD_ID>', '<YOUR_CHANNEL_ID>', TRUE)
-- ON CONFLICT ("guild_id") DO NOTHING;

-- INSERT INTO "guild_summoners" ("guild_id", "puuid") VALUES
-- ('<YOUR_GUILD_ID>', 'PUUID_PLACEHOLDER_1'),
-- ('<YOUR_GUILD_ID>', 'PUUID_PLACEHOLDER_2')
-- ON CONFLICT DO NOTHING;
