import 'dotenv/config';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import { getSummonerByPuuid } from '../api/summoners/summonerService';
import { getAllTrackedPuuids } from '../api/summoners/guildService';
import {
    createRankHistory,
    getRankByMatchAndQueueType,
} from '../api/summoners/summonerService';
import { Summoner } from '../types';

const lolService = createLolService();
const RANKED_QUEUES = ['RANKED_SOLO_5x5', 'RANKED_FLEX_SR'] as const;

const isSummoner = (candidate: any): candidate is Summoner => {
    return candidate && typeof candidate === 'object' && 'puuid' in candidate;
};

const backfillSummoner = async (summoner: Summoner) => {
    const { puuid, gameName, currentMatchId } = summoner;

    if (!currentMatchId) {
        console.log(
            `[Info] [${new Date().toISOString()}] ${gameName} has no currentMatchId — nothing to anchor.`
        );
        return;
    }

    let rankEntries;
    try {
        rankEntries = await lolService.getRankEntriesByPUUID(
            puuid,
            summoner.region as any
        );
    } catch (error) {
        console.error(
            `[Error] Failed to fetch rank entries for ${gameName}:`,
            error
        );
        return;
    }

    for (const queueType of RANKED_QUEUES) {
        const entry = rankEntries.find((e) => e.queueType === queueType);
        if (!entry) continue;

        const existing = await getRankByMatchAndQueueType(
            currentMatchId,
            puuid,
            queueType
        );
        if (existing) {
            console.log(
                `[Info] [${new Date().toISOString()}] ${gameName} already has ${queueType} anchor for ${currentMatchId}, skipping.`
            );
            continue;
        }

        try {
            await createRankHistory(
                currentMatchId,
                puuid,
                entry.tier,
                entry.rank,
                entry.leaguePoints,
                queueType
            );
            console.log(
                `[Info] [${new Date().toISOString()}] Anchored ${gameName} ${queueType} at ${currentMatchId}: ${entry.tier} ${entry.rank} (${entry.leaguePoints} LP).`
            );
        } catch (error) {
            console.error(
                `[Error] Failed to anchor ${gameName} ${queueType}:`,
                error
            );
        }
    }
};

const run = async () => {
    const apiValid = await lolService.checkConnection();
    if (!apiValid) {
        console.error(
            `[Error] [${new Date().toISOString()}] Riot API connection failed. Ensure RIOT_API_KEY is set.`
        );
        process.exit(1);
    }

    const trackedPuuids = await getAllTrackedPuuids();
    console.log(
        `[Info] [${new Date().toISOString()}] Backfilling rank anchors for ${trackedPuuids.length} tracked summoners...`
    );

    for (const puuid of trackedPuuids) {
        const summoner = await getSummonerByPuuid(puuid);
        if (!isSummoner(summoner)) {
            console.log(
                `[Warn] [${new Date().toISOString()}] Tracked PUUID ${puuid} not found in DB, skipping.`
            );
            continue;
        }
        await backfillSummoner(summoner);
    }

    console.log(
        `[Info] [${new Date().toISOString()}] Rank anchor backfill complete.`
    );
    process.exit(0);
};

run().catch((error) => {
    console.error(
        `[Error] [${new Date().toISOString()}] Rank anchor backfill failed:`,
        error
    );
    process.exit(1);
});
