INSERT INTO "summoners" (
    "puuid",
    "gameName",
    "tagLine",
    "region",
    "matchRegionPrefix",
    "deepLolLink",
    "tier",
    "rank",
    "lp",
    "discordChannelId",
    "regionGroup"
) VALUES
(
    '01XS0CtuZCXjlubxeCMW3RFZTS7WAo38zHvFWeokv3rGK6XDYVW4pPG586vKrKdccA3Ru2KA0OtQag',
    'FM Stew',
    'RATS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FM%20Stew-RATS',
    'Unranked',
    'N/A',
    0,
    '1424782745300893879',
    'EUROPE'
),
(
    'ywqK5bySVAUGZXGcDAZns5wSZkKSL2gUA3_wBZQ57VdMm5UbeTNrN3J1YNaH97CACg7pe5g0oxkGdA',
    'FM Pruhaps',
    'BAUSS',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/EUW/FM%20Pruhaps-BAUSS',
    'Unranked',
    'N/A',
     0,
    '1424782745300893879',
    'EUROPE'
),
(
    'rKCZwiocEjGVQp7pLq9WkrxhN5VGddJh-TX3NRa7LXslIZsWygt2r3UXdfg2DSwoY4Q3NpKTcbrkWg',
    'FishyMelon',
    'Fishy',
    'EU_WEST',
    'EUW1',
    'https://www.deeplol.gg/summoner/euw/FishyMelon-Fishy',
    'Unranked',
    'N/A',
     0,
    '1424782745300893879',
    'EUROPE'
)
ON CONFLICT ("puuid") DO UPDATE SET
    "gameName" = EXCLUDED."gameName",
    "tagLine" = EXCLUDED."tagLine",
    "region" = EXCLUDED."region",
    "matchRegionPrefix" = EXCLUDED."matchRegionPrefix",
    "deepLolLink" = EXCLUDED."deepLolLink",
    "tier" = EXCLUDED."tier",
    "rank" = EXCLUDED."rank",
    "lp" = EXCLUDED."lp",
    "discordChannelId" = EXCLUDED."discordChannelId",
    "regionGroup" = EXCLUDED."regionGroup";