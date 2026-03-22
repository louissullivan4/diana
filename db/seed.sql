-- ====================================
-- Dev seed data
-- Run manually: psql $DATABASE_URL -f db/seed.sql
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
    '0QapQDpnDB9zPfyzYpJBUXWlU6C6fKBtWfvAEq8KV2SxD2UgWUwKseHZu6_pbxCiV4XN10F54olDKQ',
    'FM Stew',
    'RATS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FM%20Stew-RATS',
    'EUROPE'
),
(
    '3orFsnrwPN2WGnOJ_ncaM6x3iGzE4Fd_IDQ8kezKZJt8jIsMKHFdI4NLBAQwEyRcSoJ1RroVw74A-g',
    'FM Pruhaps',
    'BAUSS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/EUW/FM%20Pruhaps-BAUSS',
    'EUROPE'
),
(
    'Peff-LARgAbk6xCJO0cLm_f_gCeAF3p3RNQlfJBFGcfWMd6yqCC-zfeFkmEMWtnAbfCnRS_Ocy-H6A',
    'Melon',
    'FM Fishy',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FishyMelon-Fishy',
    'EUROPE'
)
ON CONFLICT ("puuid") DO NOTHING;

-- Replace GUILD_ID and CHANNEL_ID with your dev server's values
-- INSERT INTO "guild_config" ("guild_id", "channel_id", "live_posting")
-- VALUES ('<YOUR_GUILD_ID>', '<YOUR_CHANNEL_ID>', TRUE)
-- ON CONFLICT ("guild_id") DO NOTHING;

-- INSERT INTO "guild_summoners" ("guild_id", "puuid") VALUES
-- ('<YOUR_GUILD_ID>', '0QapQDpnDB9zPfyzYpJBUXWlU6C6fKBtWfvAEq8KV2SxD2UgWUwKseHZu6_pbxCiV4XN10F54olDKQ'),
-- ('<YOUR_GUILD_ID>', '3orFsnrwPN2WGnOJ_ncaM6x3iGzE4Fd_IDQ8kezKZJt8jIsMKHFdI4NLBAQwEyRcSoJ1RroVw74A-g'),
-- ('<YOUR_GUILD_ID>', 'Peff-LARgAbk6xCJO0cLm_f_gCeAF3p3RNQlfJBFGcfWMd6yqCC-zfeFkmEMWtnAbfCnRS_Ocy-H6A')
-- ON CONFLICT DO NOTHING;
