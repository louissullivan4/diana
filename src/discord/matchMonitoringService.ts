import 'dotenv/config';
import { trackedSummoners } from '../config/trackedSummoners';
import {
    getQueueNameById,
    getRoleNameTranslation,
} from '../api/utils/dataDragonService';
import { createMatchDetail } from '../api/matches/matchService';
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
} from '../api/summoners/summonerService';
import {
    loginClient,
    notifyMatchEnd,
    notifyRankChange,
} from './discordService';
import cron from 'node-cron';
import { Summoner } from '../types';
import { MatchV5DTOs } from 'twisted/dist/models-dto/matches/match-v5/match.dto';

const lolService = createLolService();

const checkAndHandleSummoner = async (summoner: Summoner) => {
    try {
        await loginClient();

        const recentMatches = await lolService.getMatchesByPUUID(
            summoner.puuid,
            1,
            summoner.regionGroup as any
        );

        if (recentMatches.length === 0) {
            console.log(
                `[Info] No matches found for summoner [${summoner.gameName}]`
            );
            return;
        }

        const mostRecentMatchId = recentMatches[0];
        const storedMatchId = summoner.currentMatchId;

        if (mostRecentMatchId !== storedMatchId) {
            console.log(
                `[Info] New match detected for [${summoner.gameName}]: ${mostRecentMatchId}`
            );
            await handleNewMatchCompleted(summoner, mostRecentMatchId);
        } else {
            console.log(`[Info] No new matches for [${summoner.gameName}]`);
        }
    } catch (error) {
        console.error(
            `[Error] [${summoner.gameName}] (PUUID=${summoner.puuid}): ${error}`
        );
    }
};

const handleNewMatchCompleted = async (
    summoner: Summoner,
    newMatchId: string
) => {
    const { puuid, gameName: summonerName } = summoner;

    const fullMatchId = newMatchId; // The match ID is already in full format from the API

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
    const participants = info.participants ?? [];
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
                `[Info] Stored match detail for [${summonerName}] (matchId: ${fullMatchId})`
            );
        } else {
            console.log(
                `[Info] Match detail already exists for [${summonerName}], skipping insert (matchId: ${fullMatchId})`
            );
        }
    } catch (error: any) {
        // For other database errors, log and re-throw to maintain current error handling
        console.error(
            `[Error] Failed to create match detail for [${summonerName}]:`,
            error
        );
        throw error;
    }

    const participant = participants.find((p) => p.puuid === puuid);
    const gameDuration = info.gameDuration ?? 0;

    let result = 'Lose';
    if (gameDuration < 300) result = 'Remake';
    else if (participant?.win) result = 'Win';

    const queueName = getQueueNameById(info.queueId ?? 0);
    const kdaStr = `${participant?.kills ?? 0}/${participant?.deaths ?? 0}/${participant?.assists ?? 0}`;
    const champion = participant?.championName || 'Unknown';
    const role =
        participant?.individualPosition || participant?.teamPosition || 'N/A';
    const damage = participant?.totalDamageDealtToChampions ?? 0;

    let newRankMsg = 'Unranked N/A (0 LP)';
    let lpChangeMsg = 0;
    let checkForRankUp = 'no_change';

    try {
        const rankEntriesPost = await lolService.getRankEntriesByPUUID(puuid);
        const soloRankPost = rankEntriesPost?.find(
            (e) =>
                e.queueType === 'RANKED_SOLO_5x5' ||
                e.queueType === 'RANKED_FLEX_SR'
        );

        const queueType = soloRankPost ? soloRankPost.queueType : 'None';

        let oldRankInfo = await getMostRecentRankByParticipantIdAndQueueType(
            puuid,
            queueType
        );

        if (soloRankPost) {
            const summonerNewRankInfo = {
                tier: soloRankPost.tier,
                rank: soloRankPost.rank,
                lp: soloRankPost.leaguePoints,
                puuid,
            };

            await createRankHistory(
                newMatchId,
                puuid,
                summonerNewRankInfo.tier,
                summonerNewRankInfo.rank,
                summonerNewRankInfo.lp,
                queueType
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
    } catch (error) {
        console.error(
            `[Error] Failed to fetch updated rank for ${summonerName}: ${error}`
        );
    }

    const matchSummary = {
        summonerName,
        queueName,
        result,
        newRankMsg,
        lpChangeMsg,
        championDisplay: champion,
        role: getRoleNameTranslation(role),
        kdaStr,
        damage,
        discordChannelId: summoner.discordChannelId || '',
        deepLolLink: summoner.deepLolLink || '',
    };

    const messageSent = await notifyMatchEnd(matchSummary);
    if (messageSent) {
        await setSummonerCurrentMatchIdByPuuid(puuid, newMatchId);
    }

    if (checkForRankUp !== 'no_change') {
        const rankChangeInfo = {
            summonerName,
            direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
            newRankMsg,
            lpChangeMsg,
            discordChannelId: summoner.discordChannelId || '',
            deepLolLink: summoner.deepLolLink || '',
        };
        await notifyRankChange(rankChangeInfo);
    }
};

cron.schedule('*/20 * * * * *', async () => {
    if (process.env.STOP_BOT) {
        console.log(
            `[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`
        );
        return;
    }
    const apiValid = await lolService.checkConnection();
    if (apiValid) {
        console.log(
            `[Info] [${new Date().toISOString()}] Starting cron check for completed matches...`
        );
        for (const player of trackedSummoners) {
            const summoner = await getSummonerByPuuid(player.puuid);
            if (summoner) {
                await checkAndHandleSummoner(summoner);
            } else {
                console.log(
                    `[Info] Player PUUID[${player.puuid}] was not found in database.`
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
});
