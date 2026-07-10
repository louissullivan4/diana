-- ====================================
-- 009: Fix summoner region routing metadata
-- addSummonerCommand.ts previously keyed its region lookup table off
-- twisted Constants.Regions members that don't exist (e.g. VN_2, KR, NA_1
-- instead of VIETNAM, KOREA, AMERICA_NORTH), so every non-EU summoner
-- silently got matchRegionPrefix='EUW1' and regionGroup='EUROPE'
-- regardless of their actual platform. Riot's account API is global so
-- lookups still worked, but match-v5 requires the correct continental
-- routing, so match history never loaded for those players. Backfills
-- correct values for rows written before the code fix.
-- ====================================

UPDATE summoners AS s
SET
    "matchRegionPrefix" = m.match_region_prefix,
    "regionGroup" = m.region_group,
    "lastUpdated" = NOW()
FROM (VALUES
    ('EUW1',    'EUW1', 'EUROPE'),
    ('EU_WEST', 'EUW1', 'EUROPE'),
    ('EUN1',    'EUN1', 'EUROPE'),
    ('NA1',     'NA1',  'AMERICAS'),
    ('LA1',     'LA1',  'AMERICAS'),
    ('LA2',     'LA2',  'AMERICAS'),
    ('KR',      'KR',   'ASIA'),
    ('JP1',     'JP1',  'ASIA'),
    ('BR1',     'BR1',  'AMERICAS'),
    ('TR1',     'TR1',  'EUROPE'),
    ('RU',      'RU',   'EUROPE'),
    ('OC1',     'OC1',  'SEA'),
    ('SG2',     'SG2',  'SEA'),
    ('TW2',     'TW2',  'SEA'),
    ('VN2',     'VN2',  'SEA'),
    ('ME1',     'ME1',  'EUROPE')
) AS m(region, match_region_prefix, region_group)
WHERE s.region = m.region
  AND (s."matchRegionPrefix" IS DISTINCT FROM m.match_region_prefix
       OR s."regionGroup" IS DISTINCT FROM m.region_group);
