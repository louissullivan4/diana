-- ====================================
-- 010: Fix deeplol summoner links to use the correct region
-- buildDeepLolLink() (in addSummonerCommand.ts and matchMonitoringService.ts)
-- hardcoded the 'euw' path segment for every summoner, so non-EUW players
-- (e.g. Vietnam/VN2 users like nhi1-cake) got deeplol links pointing at the
-- wrong region. This rewrites only the region path segment of each stored
-- link based on the summoner's platform (matchRegionPrefix), preserving the
-- already URL-encoded gameName-tagLine. deeplol uses op.gg-style slugs
-- (VN2 -> vn, NA1 -> na), not the raw platform id. Idempotent: rows already
-- pointing at the correct region are left untouched.
-- ====================================

UPDATE summoners AS s
SET
    "deepLolLink" = regexp_replace(
        s."deepLolLink",
        '^(https://www\.deeplol\.gg/summoner/)[^/]+(/.*)$',
        '\1' || m.deeplol_region || '\2'
    ),
    "lastUpdated" = NOW()
FROM (VALUES
    ('EUW1', 'euw'),
    ('EUN1', 'eune'),
    ('NA1',  'na'),
    ('LA1',  'lan'),
    ('LA2',  'las'),
    ('KR',   'kr'),
    ('JP1',  'jp'),
    ('BR1',  'br'),
    ('TR1',  'tr'),
    ('RU',   'ru'),
    ('OC1',  'oce'),
    ('SG2',  'sg'),
    ('TW2',  'tw'),
    ('VN2',  'vn'),
    ('ME1',  'me')
) AS m(match_region_prefix, deeplol_region)
WHERE s."matchRegionPrefix" = m.match_region_prefix
  AND s."deepLolLink" ~ '^https://www\.deeplol\.gg/summoner/[^/]+/'
  AND s."deepLolLink" IS DISTINCT FROM regexp_replace(
        s."deepLolLink",
        '^(https://www\.deeplol\.gg/summoner/)[^/]+(/.*)$',
        '\1' || m.deeplol_region || '\2'
    );
