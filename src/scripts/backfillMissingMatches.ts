import 'dotenv/config';
import { trackedSummoners } from '../config/trackedSummoners';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import { getSummonerByPuuid } from '../api/summoners/summonerService';
import { createMatchDetail } from '../api/matches/matchService';
import { db } from '../api/utils/db';
import { Summoner } from '../types';
import { MatchV5DTOs } from 'twisted/dist/models-dto/matches/match-v5/match.dto';

const lolService = createLolService();
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MATCHES_TO_FETCH = 100;

const isSummoner = (candidate: any): candidate is Summoner => {
    return candidate && typeof candidate === 'object' && 'puuid' in candidate;
};

const isMatchStoredForSummoner = async (
    matchId: string,
    puuid: string
): Promise<boolean> => {
    const query = `
        SELECT 1
        FROM match_details
        WHERE "matchId" = $1 AND "entryPlayerPuuid" = $2
        LIMIT 1
    `;
    const result = await db.query(query, [matchId, puuid]);
    return (result.rowCount ?? 0) > 0;
};

const buildMatchDetails = (
    summoner: Summoner,
    matchId: string,
    summary: MatchV5DTOs.MatchDto
) => {
    const info = summary.info ?? {};
    const participants = info.participants ?? [];
    const teams = info.teams ?? [];

    return {
        matchId,
        entryPlayerPuuid: summoner.puuid,
        gameCreation: info.gameCreation ?? 0,
        gameStartTime: info.gameStartTimestamp ?? 0,
        gameEndTime: info.gameEndTimestamp ?? 0,
        gameVersion: info.gameVersion ?? 'Unknown',
        gameDuration: info.gameDuration ?? 0,
        gameMode: info.gameMode ?? 'Unknown',
        gameType: info.gameType ?? 'Unknown',
        queueId: info.queueId ?? 0,
        mapName: info.mapId ?? 0,
        participants: JSON.stringify(participants),
        teams: JSON.stringify(teams),
    };
};

const backfillSummoner = async (summoner: Summoner) => {
    console.log(`[Info] Processing ${summoner.gameName} (${summoner.puuid})`);
    const cutoffTime = Date.now() - ONE_WEEK_MS;

    const matchIds = await lolService.getMatchesByPUUID(
        summoner.puuid,
        MAX_MATCHES_TO_FETCH,
        summoner.regionGroup as any
    );

    for (const matchId of matchIds) {
        let summary: MatchV5DTOs.MatchDto;
        try {
            summary = await lolService.getMatchSummary(
                matchId,
                summoner.regionGroup as any
            );
        } catch (error) {
            console.error(
                `[Error] Failed to fetch summary for ${matchId}:`,
                error
            );
            continue;
        }

        const gameCreation = summary.info?.gameCreation ?? 0;

        if (gameCreation && gameCreation < cutoffTime) {
            // Riot returns matches from newest to oldest, so we can stop once we pass the cutoff.
            console.log(
                `[Info] Reached matches older than 7 days for ${summoner.gameName}, stopping.`
            );
            break;
        }

        const exists = await isMatchStoredForSummoner(
            matchId,
            summoner.puuid
        );
        if (exists) {
            console.log(
                `[Skip] ${matchId} already stored for ${summoner.gameName}.`
            );
            continue;
        }

        try {
            const matchDetails = buildMatchDetails(summoner, matchId, summary);
            const created = await createMatchDetail(matchDetails);

            if (created) {
                console.log(
                    `[Insert] Stored match ${matchId} for ${summoner.gameName}.`
                );
            } else {
                console.log(
                    `[Skip] Match ${matchId} already existed for ${summoner.gameName} (during insert).`
                );
            }
        } catch (error) {
            console.error(
                `[Error] Failed to store match ${matchId} for ${summoner.gameName}:`,
                error
            );
        }
    }
};

const run = async () => {
    const apiValid = await lolService.checkConnection();

    if (!apiValid) {
        console.error(
            '[Error] Riot API connection failed. Ensure USE_RIOT_API=true and RIOT_API_KEY are set.'
        );
        process.exit(1);
    }

    for (const tracked of trackedSummoners) {
        const summoner = await getSummonerByPuuid(tracked.puuid);

        if (!isSummoner(summoner)) {
            console.log(
                `[Warn] Tracked PUUID ${tracked.puuid} not found in DB, skipping.`
            );
            continue;
        }

        await backfillSummoner(summoner);
    }

    console.log('[Info] Backfill complete.');
    process.exit(0);
};

run().catch((error) => {
    console.error('[Error] Backfill failed:', error);
    process.exit(1);
});
