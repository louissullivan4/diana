// services/matchMonitoringService.js
require('dotenv').config();
const cron = require('node-cron');
const {
  getMatchSummary,
  getRankEntriesByPUUID,
  getActiveGameByPuuid
} = require('../services/riotService');
const {
  createMatchDetail,
  getMatchDetailsByPuuid,
  getMatchDetailsByMatchId,
  updateMatchDetail,
  deleteMatchDetail,
  createMatchTimeline,
  getMatchTimeline,
  updateMatchTimeline,
  deleteMatchTimeline
} = require('../services/matchService');
const {
  getSummonerCurrentGame,
  getSummonerByAccountName,
  getSummonerByPuuid,
  createSummoner,
  updateSummonerRank,
  setSummonerActiveMatchIdByPuuid
} = require('../services/summonerService');
const {
  setPreviousRank,
  getPreviousRank,
  calculateRankChange,
  determineRankMovement
} = require('../services/rankService');
const {
  loginClient,
  notifyMatchEnd,
  notifyMatchStart,
  notifyRankChange
} = require('./discordService');
const {
  getChampionInfoById,
  getQueueNameById
} = require('../services/dataDragonService');
const trackedSummoners = require('../config/trackedSummoners');

const checkAndHandleSummoner = async (player) => {
  try {
    await loginClient();
    const activeGameData = await getActiveGameByPuuid(player.puuid);
    if (activeGameData) {
      await setSummonerActiveMatchIdByPuuid(player.puuid, activeGameData.gameId)
      await handleMatchStart(player, activeGameData);
    } else {
      console.log(`[Info] Summoner [${player.gamename}] is not in an active game...`);
      await handleMatchEnd(player);
    }
  } catch (error) {
    console.error(`[Error] [${player.gamename}] (PUUID=${player.puuid})`);
  }
};

const handleMatchStart = async (player, activeGameData) => {
  const puuid = player.puuid;
  const summonerName = player.gamename
  const currentMatchId = player.currentmatchid
  if (!currentMatchId) {
    const rankEntries = await getRankEntriesByPUUID(puuid);
    const soloRank = rankEntries.find(e => e.queueType === 'RANKED_SOLO_5x5');
    const summonerCurrentRankInfo = {
      tier: soloRank ? soloRank.tier : 'Unranked',
      rank: soloRank ? soloRank.rank : 'N/A',
      lp: soloRank ? soloRank.leaguePoints : 0,
      puuid
    };
    await updateSummonerRank(summonerCurrentRankInfo);
    const participant = activeGameData.participants.find(p => p.puuid === puuid);
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
      discordChannelId: player.discordchannelid || '',
      deepLolLink: player.deeplollink || ''
    };
    await notifyMatchStart(matchStartInfo);
  }
};

const handleMatchEnd = async (player) => {
  const puuid = player.puuid;
  const summonerName = player.gamename;
  const tier = player.tier;
  const rank = player.rank;
  const lp = player.lp;
  const currentMatchId = player.currentmatchid;
  const matchRegionPrefix = player.matchregionprefix;
  if (currentMatchId) {
    const fullMatchId = `${matchRegionPrefix}_${currentMatchId}`;
    const matchSummaryData = await getMatchSummary(fullMatchId);
    if (matchSummaryData?.info) {
      const matchDetails = {
        matchId: fullMatchId,
        entryPlayerPuuid: puuid,
        gameVersion: matchSummaryData.info.gameVersion,
        gameCreation: matchSummaryData.info.gameCreation,
        gameStartTime: matchSummaryData.info.gameStartTimestamp,
        gameEndTime: matchSummaryData.info.gameEndTimestamp,
        gameVersion: matchSummaryData.info.gameVersion,
        gameDuration: matchSummaryData.info.gameDuration,
        gameMode: matchSummaryData.info.gameMode,
        gameType: matchSummaryData.info.gameType,
        queueId: matchSummaryData.info.queueId,
        mapName: matchSummaryData.info.mapName,
        participants: matchSummaryData.participants,
        teams: matchSummaryData.info.team,
      }
      await createMatchDetail(matchDetails);
      const participant = matchSummaryData.info.participants.find(p => p.puuid === puuid);
      let result = 'Lose';
      if (matchSummaryData.info.gameDuration < 300) {
        result = 'Remake';
      } else if (participant?.win) {
        result = 'Win';
      }
      const kdaStr = `${participant?.kills ?? 0}/${participant?.deaths ?? 0}/${participant?.assists ?? 0}`;
      const champion = participant?.championName || 'Unknown';
      const role = participant?.individualPosition || participant?.teamPosition || 'N/A';
      const damage = participant?.totalDamageDealtToChampions || 0;
      const oldRankInfo = { tier, rank, lp };
      const rankEntriesPost = await getRankEntriesByPUUID(puuid);
      const soloRankPost = rankEntriesPost.find(e => e.queueType === 'RANKED_SOLO_5x5');
      let newRankMsg = 'Unranked N/A (0 LP)';
      let lpChangeMsg = 0;
      let checkForRankUp = 'no_change';
      if (soloRankPost) {
        const summonerNewRankInfo = {
          tier: soloRankPost.tier,
          rank: soloRankPost.rank,
          lp: soloRankPost.leaguePoints,
          puuid
        };
        const rankChange = calculateRankChange(oldRankInfo, summonerNewRankInfo);
        checkForRankUp = await determineRankMovement(oldRankInfo, summonerNewRankInfo);
        await updateSummonerRank(summonerNewRankInfo);
        newRankMsg = `${summonerNewRankInfo.tier} ${summonerNewRankInfo.rank} (${summonerNewRankInfo.lp} LP)`;
        lpChangeMsg = rankChange.lpChange.toString();
      }
      const matchSummary = {
        summonerName,
        result,
        newRankMsg,
        lpChangeMsg,
        champion,
        role,
        kdaStr,
        damage,
        discordChannelId: player.discordchannelid || '',
        deepLolLink: player.deeplollink || ''
      };
      await notifyMatchEnd(matchSummary);
      await setSummonerActiveMatchIdByPuuid(puuid, "");
      if (checkForRankUp !== 'no_change') {
        const rankChangeInfo = {
          summonerName,
          direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
          newRankMsg,
          lpChangeMsg,
          discordChannelId: player.discordchannelid || '',
          deepLolLink: player.deeplollink || ''
        };
        await notifyRankChange(rankChangeInfo);
      }
    }
  }
};

cron.schedule('*/10 * * * * *', async () => {
  if (process.env.STOP_BOT) {
    console.log(`[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`);
    return;
  }
  console.log(`[Info] [${new Date().toISOString()}] Starting cron check for active matches...`);
  for (const player of trackedSummoners) {
    const summoner = await getSummonerByPuuid(player.puuid);
    if (summoner) {
      await checkAndHandleSummoner(summoner);
    } else {
      console.log(`[Info] Player PUUID[${player.puuid}] was not found in database.`);
    }
  }
  console.log(`[Info] [${new Date().toISOString()}] Finished cron check.\n`);
});

module.exports = {
  checkAndHandleSummoner,
  handleMatchStart,
  handleMatchEnd
};