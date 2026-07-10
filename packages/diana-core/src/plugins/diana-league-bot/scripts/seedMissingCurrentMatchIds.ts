import 'dotenv/config';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import {
    getSummonerByPuuid,
    setSummonerCurrentMatchIdByPuuid,
} from '../api/summoners/summonerService';
import { getAllTrackedPuuids } from '../api/summoners/guildService';
import { Summoner } from '../types';

const lolService = createLolService();

const isSummoner = (candidate: any): candidate is Summoner => {
    return candidate && typeof candidate === 'object' && 'puuid' in candidate;
};

// Migration 009 fixes matchRegionPrefix/regionGroup for summoners whose
// region was mis-tagged (see db/migrations/009_fix_summoner_region_metadata.sql).
// Those summoners never got a currentMatchId seeded at /add time because the
// broken regionGroup made match lookups return nothing. Without seeding it
// here, the next matchMonitoringService cron tick would see currentMatchId
// = null, treat their most recent (possibly old) match as "new", and fire a
// live Discord notification for it. This mirrors the silent seed that
// addSummonerCommand.ts performs for brand-new summoners.
const run = async () => {
    const trackedPuuids = await getAllTrackedPuuids();
    let seeded = 0;
    let skipped = 0;

    for (const puuid of trackedPuuids) {
        const summoner = await getSummonerByPuuid(puuid);
        if (!isSummoner(summoner)) {
            console.log(`[Info] Tracked PUUID ${puuid} not found in DB, skipping.`);
            continue;
        }

        if (summoner.currentMatchId) {
            skipped++;
            continue;
        }

        try {
            const recentMatches = await lolService.getMatchesByPUUID(
                summoner.puuid,
                1,
                summoner.regionGroup as any
            );
            if (recentMatches.length > 0) {
                await setSummonerCurrentMatchIdByPuuid(summoner.puuid, recentMatches[0]);
                console.log(
                    `[Info] Seeded currentMatchId for ${summoner.gameName} (${summoner.puuid}): ${recentMatches[0]}`
                );
                seeded++;
            } else {
                console.log(
                    `[Info] No matches found for ${summoner.gameName} (${summoner.puuid}), nothing to seed.`
                );
            }
        } catch (error) {
            console.error(
                `[Error] Failed to seed currentMatchId for ${summoner.gameName} (${summoner.puuid}):`,
                error
            );
        }
    }

    console.log(`[Info] Done. seeded=${seeded} skipped=${skipped} (already had a currentMatchId)`);
    process.exit(0);
};

run().catch((error) => {
    console.error('[Error] Seeding missing currentMatchIds failed:', error);
    process.exit(1);
});
