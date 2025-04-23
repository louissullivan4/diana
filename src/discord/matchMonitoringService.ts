import 'dotenv/config';
import { trackedSummoners } from '../config/trackedSummoners';
import {
    getChampionInfoById,
    getQueueNameById,
} from '../api/utils/dataDragonService';
import { createMatchDetail } from '../api/matches/matchService';
import {
    calculateRankChange,
    determineRankMovement,
} from '../api/utils/rankService';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import {
    updateSummonerRank,
    setSummonerActiveMatchIdByPuuid,
    getSummonerByPuuid,
} from '../api/summoners/summonerService';
import { updateMissingData } from './updateMissingDataService';
import {
    loginClient,
    notifyMatchStart,
    notifyMatchEnd,
    notifyRankChange,
} from './discordService';
import cron from 'node-cron';
import { Summoner } from '../types';
import { MatchV5DTOs } from 'twisted/dist/models-dto/matches/match-v5/match.dto';
import { LolApiError } from '../api/utils/lolService/lolService';

const lolService = createLolService();

const checkAndHandleSummoner = async (summoner: Summoner) => {
    try {
        await loginClient();
        await updateMissingData(summoner);

        const activeGameData = await lolService.getActiveGameByPuuid(
            summoner.puuid
        );
        await handleMatchStart(summoner, activeGameData);
    } catch (error) {
        if (error instanceof LolApiError && error.status === 404) {
            console.log(
                `[Info] Summoner [${summoner.gameName}] is not in an active game...`
            );
            await handleMatchEnd(summoner);
        } else {
            console.error(
                `[Error] [${summoner.gameName}] (PUUID=${summoner.puuid}): ${error}`
            );
        }
    }
};

const handleMatchStart = async (summoner: Summoner, activeGameData: any) => {
    const puuid = summoner.puuid;
    const summonerName = summoner.gameName;
    const currentMatchId = summoner.currentMatchId;

    if (currentMatchId) return;

    let summonerCurrentRankInfo = {
        tier: 'Unranked',
        rank: 'N/A',
        lp: 0,
        puuid,
    };
    try {
        const rankEntries = await lolService.getRankEntriesByPUUID(puuid);
        const solo = rankEntries.find((e) => e.queueType === 'RANKED_SOLO_5x5');

        if (solo) {
            summonerCurrentRankInfo = {
                tier: solo.tier,
                rank: solo.rank,
                lp: solo.leaguePoints,
                puuid,
            };
        }
    } catch {
        console.error(`[Error] [${summonerName}]: Failed to fetch rank info.`);
    }

    await updateSummonerRank(summonerCurrentRankInfo);

    const participant = activeGameData.participants.find(
        (p: any) => p.puuid === puuid
    );
    let championDisplay = 'Unknown Champion';

    if (participant) {
        try {
            const champInfo = await getChampionInfoById(participant.championId);
            championDisplay = champInfo?.name || championDisplay;
        } catch {
            console.error(
                `[Error] [${summonerName}] (PUUID=${puuid}) Failed to fetch champion info.`
            );
        }
    }

    const queueId = activeGameData.gameQueueConfigId;
    const queueName = getQueueNameById(queueId);

    const matchStartInfo = {
        summonerName,
        queueName,
        championDisplay,
        rankString: `${summonerCurrentRankInfo.tier} ${summonerCurrentRankInfo.rank} (${summonerCurrentRankInfo.lp} LP)`,
        discordChannelId: summoner.discordChannelId || '',
        deepLolLink: summoner.deepLolLink || '',
    };

    const messageSent = await notifyMatchStart(matchStartInfo);
    if (messageSent) {
        await setSummonerActiveMatchIdByPuuid(puuid, activeGameData.gameId);
    }
};

const handleMatchEnd = async (summoner: Summoner) => {
    const {
        puuid,
        gameName: summonerName,
        tier,
        rank,
        lp,
        currentMatchId,
        matchRegionPrefix,
    } = summoner;

    if (!currentMatchId) return;

    const fullMatchId = `${matchRegionPrefix}_${currentMatchId}`;

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
        mapName: info.mapId ?? 'Unknown',
        participants: JSON.stringify(participants),
        teams: JSON.stringify(teams),
    };

    await createMatchDetail(matchDetails);

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

    const oldRankInfo = { tier, rank, lp };
    let newRankMsg = 'Unranked N/A (0 LP)';
    let lpChangeMsg = 0;
    let checkForRankUp = 'no_change';

    try {
        const rankEntriesPost = await lolService.getRankEntriesByPUUID(puuid);
        const soloRankPost = rankEntriesPost?.find(
            (e) => e.queueType === 'RANKED_SOLO_5x5'
        );
        if (soloRankPost) {
            const summonerNewRankInfo = {
                tier: soloRankPost.tier,
                rank: soloRankPost.rank,
                lp: soloRankPost.leaguePoints,
                puuid,
            };
            const rankChange = calculateRankChange(
                oldRankInfo,
                summonerNewRankInfo
            );
            checkForRankUp = await determineRankMovement(
                oldRankInfo,
                summonerNewRankInfo
            );
            await updateSummonerRank(summonerNewRankInfo);

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
        role,
        kdaStr,
        damage,
        discordChannelId: summoner.discordChannelId || '',
        deepLolLink: summoner.deepLolLink || '',
    };

    const messageSent = await notifyMatchEnd(matchSummary);
    if (messageSent) {
        await setSummonerActiveMatchIdByPuuid(puuid, '');
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
            `[Info] [${new Date().toISOString()}] Starting cron check for active matches...`
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
