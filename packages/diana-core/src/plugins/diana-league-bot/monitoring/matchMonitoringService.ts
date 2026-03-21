import 'dotenv/config';
import { trackedSummoners as legacyTrackedSummoners } from '../config/trackedSummoners';
import {
    getQueueNameById,
    getRoleNameTranslation,
    getRankTagsById,
} from '../api/utils/dataDragonService';
import { createMatchDetail } from '../api/matches/matchService';
import { calculateMatchScores } from '../scoring/scoringAlgorithm';
import { saveMatchScores } from '../scoring/scoringService';
import {
    calculateRankChange,
    determineRankMovement,
} from '../api/utils/rankService';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import {
    setSummonerCurrentMatchIdByPuuid,
    getSummonerByPuuid,
    createRankHistory,
    getMostRecentRankByParticipantIdAndQueueType,
    updateSummonerIdentityByPuuid,
} from '../api/summoners/summonerService';
import {
    getAllTrackedPuuids,
    getGuildsTrackingSummoner,
} from '../api/summoners/guildService.js';
import {
    notifyMatchEnd,
    notifyRankChange,
} from '../notifications/leagueNotifications';
import { Summoner, LeagueBotConfig, TrackedSummonerConfig } from '../types';
import { MatchV5DTOs } from 'twisted/dist/models-dto/matches/match-v5/match.dto';
import { Constants } from 'twisted';
import type { MessageAdapter } from '../../../core/pluginTypes';

const lolService = createLolService();
const shouldForceDevelopmentTimers = Boolean(
    process.env.FORCE_DEVELOPMENT_TIMERS
);
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
let lastSummonerMetadataSync = 0;

/**
 * Get tracked summoner PUUIDs from the guild_summoners DB table.
 * Falls back to config or legacy hardcoded list if DB returns nothing.
 */
async function getTrackedSummonerPuuids(config: LeagueBotConfig): Promise<string[]> {
    try {
        const puuids = await getAllTrackedPuuids();
        if (puuids.length > 0) {
            return puuids;
        }
    } catch (error) {
        console.warn('[Warn] Failed to fetch tracked puuids from DB, falling back to config:', error);
    }
    // Fallback to config or legacy hardcoded summoners
    const fromConfig = config.trackedSummoners && config.trackedSummoners.length > 0
        ? config.trackedSummoners
        : legacyTrackedSummoners;
    return fromConfig.map((s) => s.puuid);
}

const buildDeepLolLink = (gameName: string, tagLine: string) => {
    const encodedGameName = encodeURIComponent(gameName);
    const encodedTagLine = encodeURIComponent(tagLine);
    return `https://www.deeplol.gg/summoner/euw/${encodedGameName}-${encodedTagLine}`;
};

const syncTrackedSummonerMetadata = async (puuid: string) => {
    const summoner = await getSummonerByPuuid(puuid);

    if (!summoner || (summoner as any).msg) {
        console.warn(
            `[Warn] Tracked PUUID ${puuid} not found in database, skipping metadata sync.`
        );
        return;
    }

    const account = await lolService.getAccountByPUUID(
        puuid,
        summoner.regionGroup as any
    );
    const deepLolLink = buildDeepLolLink(account.gameName, account.tagLine);
    const envDiscordChannelId = process.env.DISCORD_CHANNEL_ID;
    const targetDiscordChannelId =
        envDiscordChannelId ?? summoner.discordChannelId ?? null;

    await lolService.getActiveRegionByPUUID(puuid, summoner.regionGroup as any);

    const requiresUpdate =
        summoner.gameName !== account.gameName ||
        summoner.tagLine !== account.tagLine ||
        summoner.deepLolLink !== deepLolLink ||
        (targetDiscordChannelId !== null &&
            targetDiscordChannelId !== summoner.discordChannelId);

    if (!requiresUpdate) {
        console.log(
            `[Info] [${new Date().toISOString()}] Summoner identity already up to date for ${account.gameName}#${account.tagLine}.`
        );
    } else {
        await updateSummonerIdentityByPuuid(
            puuid,
            account.gameName,
            account.tagLine,
            deepLolLink,
            targetDiscordChannelId
        );
        console.log(
            `[Info] [${new Date().toISOString()}] Synced tracked summoner identity for ${account.gameName}#${account.tagLine}.`
        );
    }
};

const syncTrackedSummonersWithDatabase = async (
    summoners: TrackedSummonerConfig[]
) => {
    console.log(
        `[Info] [${new Date().toISOString()}] Starting tracked summoner metadata sync...`
    );
    for (const player of summoners) {
        try {
            await syncTrackedSummonerMetadata(player.puuid);
        } catch (error) {
            console.error(
                `[Error] Failed to sync metadata for tracked PUUID ${player.puuid}:`,
                error
            );
        }
    }
    console.log(
        `[Info] [${new Date().toISOString()}] Finished tracked summoner metadata sync.`
    );
};

const checkAndHandleSummoner = async (
    summoner: Summoner,
    messageAdapter: MessageAdapter | null | undefined
) => {
    try {
        const recentMatches = await lolService.getMatchesByPUUID(
            summoner.puuid,
            1,
            summoner.regionGroup as any
        );

        if (recentMatches.length === 0) {
            console.log(
                `[Info] [${new Date().toISOString()}] No matches found for summoner [${summoner.gameName}]`
            );
            return;
        }

        const mostRecentMatchId = recentMatches[0];
        const storedMatchId = summoner.currentMatchId;

        if (mostRecentMatchId !== storedMatchId) {
            console.log(
                `[Info] [${new Date().toISOString()}] New match detected for [${summoner.gameName}]: ${mostRecentMatchId}`
            );
            await handleNewMatchCompleted(
                summoner,
                mostRecentMatchId,
                messageAdapter
            );
        } else {
            console.log(
                `[Info] [${new Date().toISOString()}] No new matches for [${summoner.gameName}]`
            );
        }
    } catch (error) {
        console.error(
            `[Error] [${new Date().toISOString()}] [${summoner.gameName}] (PUUID=${summoner.puuid}): ${error}`
        );
    }
};

const handleNewMatchCompleted = async (
    summoner: Summoner,
    newMatchId: string,
    messageAdapter: MessageAdapter | null | undefined
) => {
    const { puuid, gameName: summonerName } = summoner;

    const fullMatchId = newMatchId;

    let matchSummaryData: MatchV5DTOs.MatchDto = {
        metadata: { dataVersion: '', matchId: '', participants: [] },
        info: {
            gameCreation: 0,
            gameDuration: 0,
            gameEndTimestamp: 0,
            gameId: 0,
            gameMode: '',
            gameName: '',
            gameStartTimestamp: 0,
            gameType: '',
            gameVersion: '',
            mapId: 0,
            participants: [],
            platformId: '',
            queueId: 0,
            teams: [],
            tournamentCode: '',
            endOfGameResult: '',
        },
    };

    try {
        matchSummaryData = await lolService.getMatchSummary(fullMatchId);
    } catch {
        console.error(
            `[Error] Failed to get match summary for ${summonerName} (${fullMatchId})`
        );
    }

    const info = matchSummaryData.info;
    const participants: MatchV5DTOs.ParticipantDto[] = info.participants ?? [];
    const teams = info.teams ?? [];

    const matchDetails = {
        matchId: fullMatchId,
        entryPlayerPuuid: puuid,
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

    try {
        const createdMatchDetail = await createMatchDetail(matchDetails);
        if (createdMatchDetail) {
            console.log(
                `[Info] [${new Date().toISOString()}] Stored match detail for [${summonerName}] (matchId: ${fullMatchId})`
            );
            // Score all 10 participants — gated on new insert so two tracked
            // summoners in the same match only trigger one scoring run.
            try {
                const scores = calculateMatchScores(
                    participants as Record<string, any>[]
                );
                await saveMatchScores(fullMatchId, scores);
                console.log(
                    `[Info] [${new Date().toISOString()}] Saved match scores for [${fullMatchId}] (${scores.length} participants)`
                );
            } catch (scoringError) {
                console.error(
                    `[Error] Failed to calculate/save match scores for [${fullMatchId}]:`,
                    scoringError
                );
            }
        } else {
            console.log(
                `[Info] [${new Date().toISOString()}] Match detail already exists for [${summonerName}], skipping insert (matchId: ${fullMatchId})`
            );
        }
    } catch (error: any) {
        console.error(
            `[Error] [${new Date().toISOString()}] Failed to create match detail for [${summonerName}]:`,
            error
        );
        throw error;
    }

    const participant = participants.find(
        (p: MatchV5DTOs.ParticipantDto) => p.puuid === puuid
    );
    const gameDuration = info.gameDuration ?? 0;

    // Derive placement from the already-computed (or freshly computed) scores
    let summonerPlacement: number | undefined;
    try {
        const allScores = calculateMatchScores(
            participants as Record<string, any>[]
        );
        const myScore = allScores.find((s) => s.puuid === puuid);
        summonerPlacement = myScore?.placement;
    } catch {
        // Non-fatal — notification will omit the placement field
    }

    let result = 'Lose';
    if (gameDuration < 300) result = 'Remake';
    else if (participant?.win) result = 'Win';

    const queueName = getQueueNameById(info.queueId ?? 0);
    const kdaStr = `${participant?.kills ?? 0}/${participant?.deaths ?? 0}/${participant?.assists ?? 0}`;
    const champion = participant?.championName || 'Unknown';
    const role =
        participant?.individualPosition || participant?.teamPosition || 'N/A';
    const damage = participant?.totalDamageDealtToChampions ?? 0;
    const matchRank = getRankTagsById(info.queueId ?? 0);

    let newRankMsg = 'Unranked N/A (0 LP)';
    let lpChangeMsg = 0;
    let checkForRankUp = 'no_change';

    try {
        if (matchRank) {
            const rankEntriesPost =
                await lolService.getRankEntriesByPUUID(puuid);
            const rankPost = rankEntriesPost?.find(
                (e) => e.queueType === matchRank
            );

            let oldRankInfo =
                await getMostRecentRankByParticipantIdAndQueueType(
                    puuid,
                    matchRank
                );

            if (rankPost) {
                const summonerNewRankInfo = {
                    tier: rankPost.tier,
                    rank: rankPost.rank,
                    lp: rankPost.leaguePoints,
                    puuid,
                };

                await createRankHistory(
                    newMatchId,
                    puuid,
                    summonerNewRankInfo.tier,
                    summonerNewRankInfo.rank,
                    summonerNewRankInfo.lp,
                    matchRank
                );

                const rankChange = calculateRankChange(
                    oldRankInfo,
                    summonerNewRankInfo
                );
                checkForRankUp = await determineRankMovement(
                    oldRankInfo,
                    summonerNewRankInfo
                );
                newRankMsg = `${summonerNewRankInfo.tier} ${summonerNewRankInfo.rank} (${summonerNewRankInfo.lp} LP)`;
                lpChangeMsg = rankChange.lpChange;
            }
        }
    } catch (error) {
        console.error(
            `[Error] Failed to fetch updated rank for ${summonerName}: ${error}`
        );
    }

    const baseMatchSummary = {
        summonerName,
        queueName,
        result,
        gameLengthSeconds: gameDuration,
        newRankMsg,
        lpChangeMsg,
        championDisplay: champion,
        role: getRoleNameTranslation(role),
        kdaStr,
        damage,
        deepLolLink: summoner.deepLolLink || '',
        placement: summonerPlacement,
        totalPlayers: participants.length || undefined,
    };

    // Fan out notifications to all guilds tracking this summoner
    let anyMessageSent = false;
    try {
        const guildTargets = await getGuildsTrackingSummoner(puuid);
        for (const target of guildTargets) {
            if (!target.live_posting) continue;
            const matchSummary = { ...baseMatchSummary, discordChannelId: target.channel_id };
            const sent = await notifyMatchEnd(messageAdapter, matchSummary);
            if (sent) anyMessageSent = true;

            if (checkForRankUp !== 'no_change') {
                const rankChangeInfo = {
                    summonerName,
                    direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
                    newRankMsg,
                    lpChangeMsg,
                    discordChannelId: target.channel_id,
                    deepLolLink: summoner.deepLolLink || '',
                };
                await notifyRankChange(messageAdapter, rankChangeInfo);
            }
        }

        // Dev fallback: if no guild targets, use env var channel
        if (guildTargets.length === 0 && process.env.DISCORD_CHANNEL_ID) {
            const fallbackChannelId = process.env.DISCORD_CHANNEL_ID;
            const matchSummary = { ...baseMatchSummary, discordChannelId: fallbackChannelId };
            const sent = await notifyMatchEnd(messageAdapter, matchSummary);
            if (sent) anyMessageSent = true;

            if (checkForRankUp !== 'no_change') {
                const rankChangeInfo = {
                    summonerName,
                    direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
                    newRankMsg,
                    lpChangeMsg,
                    discordChannelId: fallbackChannelId,
                    deepLolLink: summoner.deepLolLink || '',
                };
                await notifyRankChange(messageAdapter, rankChangeInfo);
            }
        }
    } catch (error) {
        console.error(`[Error] Failed to fan out match notifications for ${summonerName}:`, error);
    }

    if (anyMessageSent) {
        await setSummonerCurrentMatchIdByPuuid(puuid, newMatchId);
    }
};

/**
 * Creates a match monitoring tick function configured with the given config.
 * Used by diana-league-bot plugin to run on a cron.
 */
export function createMatchMonitoringTick(
    config: LeagueBotConfig,
    messageAdapter: MessageAdapter | null | undefined
): () => Promise<void> {
    return async function runMatchMonitoringTick(): Promise<void> {
        if (process.env.STOP_BOT) {
            console.log(
                `[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`
            );
            return;
        }
        const apiValid = await lolService.checkConnection();
        if (apiValid) {
            const trackedPuuids = await getTrackedSummonerPuuids(config);

            const now = Date.now();
            if (
                shouldForceDevelopmentTimers ||
                now - lastSummonerMetadataSync >= TWENTY_FOUR_HOURS_MS
            ) {
                const summonerConfigs: TrackedSummonerConfig[] = trackedPuuids.map((puuid) => ({ puuid }));
                await syncTrackedSummonersWithDatabase(summonerConfigs);
                lastSummonerMetadataSync = now;
            }

            console.log(
                `[Info] [${new Date().toISOString()}] Starting cron check for completed matches (${trackedPuuids.length} summoners)...`
            );
            for (const puuid of trackedPuuids) {
                const summoner = await getSummonerByPuuid(puuid);
                if (summoner) {
                    await checkAndHandleSummoner(summoner, messageAdapter);
                } else {
                    console.log(
                        `[Info] [${new Date().toISOString()}] Player PUUID[${puuid}] was not found in database.`
                    );
                }
            }
            console.log(
                `[Info] [${new Date().toISOString()}] Finished cron check.\n`
            );
        } else {
            console.log(
                `[Error] [${new Date().toISOString()}] API connection failed, skipping run...`
            );
        }
    };
}

/**
 * Single tick of match monitoring using legacy hardcoded config.
 * @deprecated Use createMatchMonitoringTick with config instead.
 */
export async function runMatchMonitoringTick(): Promise<void> {
    const defaultConfig: LeagueBotConfig = {
        trackedSummoners: [],
        matchCheckCron: '*/20 * * * * *',
    };
    const tick = createMatchMonitoringTick(defaultConfig, null);
    return tick();
}
