import 'dotenv/config';
import { Role, Summoner, SummonerSummary } from '../types';
import { createMatchDetail, getMatchDetailsByPuuid } from '../api/matches/matchService';
import { getMatchesByPUUID, getMatchSummary } from '../api/utils/riotService';
import { notifyMissingData } from './discordService';
import {
    getQueueNameById,
    getChampionInfoById,
    getRoleNameTranslation,
} from '../api/utils/dataDragonService';
import { updateSummonerMissingDataNotificationTimeByPuuid } from '../api/summoners/summonerService';

async function missingDataNotificationDue(missing_data_last_sent_time: number) {
    try {
        if (!missing_data_last_sent_time) {
            return true;
        }
        const lastSentTime = new Date(missing_data_last_sent_time);
        const currentTime = new Date();
        const timeDiff = Math.abs(
            currentTime.getTime() - lastSentTime.getTime()
        );
        const diffHours = Math.ceil(timeDiff / (1000 * 3600));
        if (diffHours >= 24) {
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error retrieving lastSentTime:', error);
        return false;
    }
}

export async function updateMissingData(summoner: Summoner) {
    // check if summoner has played in the last 7 days, send message if they have
    const lastPlayedDate = new Date(summoner.lastUpdated);
    const currentDate = new Date();
    const timeDiff = Math.abs(currentDate.getTime() - lastPlayedDate.getTime());
    const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (diffDays > 7) {
        console.info(
            `[Info] Summoner ${summoner.gameName} has not played in the last 7 days, skipping...`
        );
        return;
    }
    const puuid = summoner.puuid;
    const notificationDue = await missingDataNotificationDue(
        summoner.missingDataLastSentTime
    );
    if (!notificationDue) {
        console.info(
            `[Info] Missing data notification not due for: ${summoner.gameName}`
        );
        return;
    }
    const existingDetails = await getMatchDetailsByPuuid(puuid, 50);
    const existingMatchIds = existingDetails.map((m) => String(m.matchid));

    const storedIds = new Set(existingMatchIds);

    if (existingMatchIds.length === 0) {
        console.info(
            `[Info] No stored matches found for: ${summoner.gameName}`
        );
    }

    const allIds = await getMatchesByPUUID(puuid, 50);
    if (!Array.isArray(allIds) || allIds.length === 0) {
        console.info(
            `[Info] Riot returned no matches for: ${summoner.gameName}`
        );
        return;
    }

    const missingIds = allIds
        .map((id) => String(id))
        .filter((id) => !storedIds.has(id));

    if (missingIds.length === 0) {
        console.info(
            `[Info] No missing matches to update for: ${summoner.gameName}`
        );
        return;
    }

    console.info(
        `[Info] Found ${missingIds.length} missing matches for: ${summoner.gameName}`
    );

    let totalGames = 0;
    let wins = 0;
    let losses = 0;
    let totalDuration = 0;
    let championCount: any = {};
    let totalDamageDealtToChampions = 0;
    let roleCount: any = {};

    for (const matchId of missingIds) {
        try {
            const data = await getMatchSummary(matchId);
            const info = data.info;
            if (!info) {
                console.warn(`[Warn] No info block for match ${matchId}`);
                continue;
            }

            const record = {
                matchId,
                entryPlayerPuuid: puuid,
                gameVersion: info.gameVersion,
                gameCreation: info.gameCreation,
                gameStartTime: info.gameStartTimestamp,
                gameEndTime: info.gameEndTimestamp,
                gameDuration: info.gameDuration,
                gameMode: info.gameMode,
                gameType: info.gameType,
                queueId: info.queueId,
                mapName: info.mapId,
                participants: JSON.stringify(info.participants),
                teams: JSON.stringify(info.teams),
            };

            if (getQueueNameById(info.queueId) !== 'Ranked Solo') {
                continue;
            }

            if (record.gameDuration < 300) {
                continue;
            }

            totalGames++;
            totalDuration += info.gameDuration;

            const participant = info.participants.find(
                (p) => p.puuid === puuid
            );
            if (participant && participant.win) {
                wins++;
            } else {
                losses++;
            }

            const player = info.participants.find((p) => p.puuid === puuid);
            if (player) {
                championCount[player.championId] =
                    (championCount[player.championId] || 0) + 1;
                totalDamageDealtToChampions +=
                    player.totalDamageDealtToChampions || 0;
                roleCount[player.teamPosition] =
                    (roleCount[player.teamPosition] || 0) + 1;
            }

            await createMatchDetail(record);
        } catch (err: any) {
            console.error(
                `[Error] Failed to fetch/save match ${matchId}:`,
                err.message || err
            );
        }
    }

    const getMostPlayed = (countObj: Record<string, number>) => 
        Object.keys(countObj).reduce((a, b) => (countObj[+a] > countObj[+b] ? a : b), '') || '0';
    
    const formatWinRate = (wins: number, totalGames: number) => 
        ((wins / totalGames) * 100).toFixed(2) + '%';
    
    const formatDamage = (totalDamage: number, totalGames: number) => 
        (totalDamage / totalGames).toFixed(0) || '0';
    
    const formatTime = (totalDuration: number) => 
        (totalDuration / 3600 || 0).toFixed(0) + ' hours';
    
    const getMostPlayedChampionInfo = async (championId: string) => 
        (await getChampionInfoById(championId)) || { name: 'Unknown Champion', tagString: 'Unknown' };
    
    const mostPlayedChampionId = getMostPlayed(championCount);
    const mostPlayedChampion = await getMostPlayedChampionInfo(mostPlayedChampionId);
    const mostPlayedRole = getMostPlayed(roleCount);
    const winRate = formatWinRate(wins, totalGames);
    const averageDamageDealtToChampions = formatDamage(totalDamageDealtToChampions, totalGames);
    const totalTimeInHours = formatTime(totalDuration);
    
    let summonerSummary: SummonerSummary = {
        name: summoner.gameName,
        tier: summoner.tier,
        rank: summoner.rank,
        lp: summoner.lp,
        totalGames,
        wins,
        losses,
        winRate,
        totalTimeInHours,
        mostPlayedChampion,
        averageDamageDealtToChampions,
        mostPlayedRole: getRoleNameTranslation(mostPlayedRole as unknown as Role),
        discordChannelId: summoner.discordChannelId,
    };

    await notifyMissingData(summonerSummary);
    await updateSummonerMissingDataNotificationTimeByPuuid(summoner.puuid);

    return summonerSummary;
}
