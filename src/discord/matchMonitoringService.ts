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

const lolService = createLolService();

const checkAndHandleSummoner = async (summoner: Summoner) => {
    try {
        await loginClient();
        await updateMissingData(summoner);
        const activeGameData = await lolService.getActiveGameByPuuid(
            summoner.puuid
        );
        if (activeGameData) {
            await handleMatchStart(summoner, activeGameData);
        } else {
            console.log(
                `[Info] Summoner [${summoner.gameName}] is not in an active game...`
            );
            await handleMatchEnd(summoner);
        }
    } catch (error) {
        console.error(
            `[Error] [${summoner.gameName}] (PUUID=${summoner.puuid}), ${error}`
        );
    }
};

const handleMatchStart = async (summoner: Summoner, activeGameData: any) => {
    const puuid = summoner.puuid;
    const summonerName = summoner.gameName;
    const currentMatchId = summoner.currentMatchId;
    if (!currentMatchId) {
        const rankEntries = await lolService.getRankEntriesByPUUID(puuid);
        const soloRank =
            rankEntries?.find((e) => e.queueType === 'RANKED_SOLO_5x5') || null;
        const summonerCurrentRankInfo = {
            tier: soloRank ? soloRank.tier : 'Unranked',
            rank: soloRank ? soloRank.rank : 'N/A',
            lp: soloRank ? soloRank.leaguePoints : 0,
            puuid,
        };
        await updateSummonerRank(summonerCurrentRankInfo);
        const participant = activeGameData.participants.find(
            (p: any) => p.puuid === puuid
        );
        let championDisplay = 'Unknown Champion';
        if (participant) {
            const champInfo = await getChampionInfoById(participant.championId);
            championDisplay = champInfo?.name || championDisplay;
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
    }
};

const handleMatchEnd = async (summoner: Summoner) => {
    const puuid = summoner.puuid;
    const summonerName = summoner.gameName;
    const tier = summoner.tier;
    const rank = summoner.rank;
    const lp = summoner.lp;
    const currentMatchId = summoner.currentMatchId;
    const matchRegionPrefix = summoner.matchRegionPrefix;
    if (currentMatchId) {
        const fullMatchId = `${matchRegionPrefix}_${currentMatchId}`;
        const matchSummaryData = await lolService.getMatchSummary(fullMatchId);
        if (matchSummaryData?.info) {
            const matchDetails = {
                matchId: fullMatchId,
                entryPlayerPuuid: puuid,
                gameCreation: matchSummaryData.info.gameCreation,
                gameStartTime: matchSummaryData.info.gameStartTimestamp,
                gameEndTime: matchSummaryData.info.gameEndTimestamp,
                gameVersion: matchSummaryData.info.gameVersion,
                gameDuration: matchSummaryData.info.gameDuration,
                gameMode: matchSummaryData.info.gameMode,
                gameType: matchSummaryData.info.gameType,
                queueId: matchSummaryData.info.queueId,
                mapName: matchSummaryData.info.mapId,
                participants: JSON.stringify(
                    matchSummaryData.info.participants
                ),
                teams: JSON.stringify(matchSummaryData.info.teams),
            };
            await createMatchDetail(matchDetails);
            const participant = matchSummaryData.info.participants.find(
                (p) => p.puuid === puuid
            );
            let result = 'Lose';
            if (matchSummaryData.info.gameDuration < 300) {
                result = 'Remake';
            } else if (participant?.win) {
                result = 'Win';
            }
            const queueId = matchDetails.queueId;
            const queueName = getQueueNameById(queueId);
            const kdaStr = `${participant?.kills ?? 0}/${participant?.deaths ?? 0}/${participant?.assists ?? 0}`;
            const champion = participant?.championName || 'Unknown';
            const role =
                participant?.individualPosition ||
                participant?.teamPosition ||
                'N/A';
            const damage = participant?.totalDamageDealtToChampions || 0;
            const oldRankInfo = { tier, rank, lp };
            const rankEntriesPost =
                await lolService.getRankEntriesByPUUID(puuid);
            const soloRankPost =
                rankEntriesPost?.find(
                    (e) => e.queueType === 'RANKED_SOLO_5x5'
                ) || null;
            let newRankMsg = 'Unranked N/A (0 LP)';
            let lpChangeMsg = 0;
            let checkForRankUp = 'no_change';
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
                    direction:
                        checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
                    newRankMsg,
                    lpChangeMsg,
                    discordChannelId: summoner.discordChannelId || '',
                    deepLolLink: summoner.deepLolLink || '',
                };
                await notifyRankChange(rankChangeInfo);
            }
        }
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
