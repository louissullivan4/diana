// services/matchMonitoringService.js
require('dotenv').config();
const cron = require('node-cron');
const {
  getMatchSummary,
  getRankEntriesByPUUID,
  getActiveGameByPuuid
} = require('../services/riotService');
const {
  setSummonerCurrentGame,
  getSummonerCurrentGame,
  clearSummonerCurrentGame
} = require('./gameTracker');
const {
  setPreviousRank,
  getPreviousRank,
  calculateRankChange,
  determineRankMovement
} = require('../services/rankService');
const { notifyMatchEnd, notifyMatchStart, notifyRankChange } = require('./discordService');
const { getChampionInfoById, getQueueNameById } = require('../services/dataDragonService');
const trackedSummoners = require('../config/trackedSummoners');

const checkAndHandleSummoner = async (player) => {
  const {
    puuid,
    summonerName,
    discordChannelId,
    matchRegionPrefix,
    deepLolLink
  } = player;

  try {
    const activeGameData = await getActiveGameByPuuid(puuid);
    if (activeGameData) {
      await handleMatchStart(player, activeGameData);
    } else {
      await handleMatchEnd(player);
    }
  } catch (error) {
    console.error(error);
    console.error(`[Error] [${summonerName}] (PUUID=${puuid}): ${error?.message || error}`);
  }
};

const handleMatchStart = async (player, activeGameData) => {
  const { puuid, summonerName, discordChannelId, deepLolLink } = player;
  const storedGameId = getSummonerCurrentGame(puuid);
  console.log(`[Info] [${summonerName}] Active game ID from DB:`, storedGameId);

  if (!storedGameId) {
    const newGameId = activeGameData.gameId;
    setSummonerCurrentGame(puuid, newGameId);
    console.log(`[Info] [${summonerName}] Starting new match (gameId=${newGameId}). Fetching rank info...`);

    const rankEntries = await getRankEntriesByPUUID(puuid);
    const soloRank = rankEntries.find(e => e.queueType === 'RANKED_SOLO_5x5');

    let rankString = 'Unranked';
    if (soloRank) {
      const currentRankInfo = {
        tier: soloRank.tier,
        rank: soloRank.rank,
        lp: soloRank.leaguePoints,
        divisionString: `${soloRank.tier} ${soloRank.rank}`
      };
      setPreviousRank(puuid, currentRankInfo);
      rankString = `${soloRank.tier} ${soloRank.rank} (${soloRank.leaguePoints} LP)`;
      console.log(`[Info] [${summonerName}] Found existing rank: ${currentRankInfo.divisionString} ${currentRankInfo.lp} LP`);
    } else {
      setPreviousRank(puuid, null);
      console.log(`[Info] [${summonerName}] User is unranked or has no RANKED_SOLO_5x5 data.`);
    }

    const participant = activeGameData.participants.find(p => p.puuid === puuid);
    let championDisplay = 'Unknown Champion';

    if (participant) {
      const champInfo = await getChampionInfoById(participant.championId);
      championDisplay = champInfo.name;
    }

    const queueId = activeGameData.gameQueueConfigId;
    const queueName = getQueueNameById(queueId);

    const matchStartInfo = {
      summonerName,
      queueName,
      championDisplay,
      rankString,
      discordChannelId,
      deepLolLink
    };

    console.log(`[Info] Sending start-of-match message for ${summonerName}:`, matchStartInfo);
    await notifyMatchStart(matchStartInfo);
  }
};

const handleMatchEnd = async (player) => {
  const { puuid, summonerName, discordChannelId, matchRegionPrefix, deepLolLink } = player;
  const storedGameId = getSummonerCurrentGame(puuid);

  if (storedGameId) {
    console.log(`[Info] [${summonerName}] Match ended (gameId=${storedGameId}). Fetching final match data...`);
    const fullMatchId = `${matchRegionPrefix}_${storedGameId}`;
    const matchSummaryData = await getMatchSummary(fullMatchId);

    if (!matchSummaryData?.info) {
      console.log(`[Warning] No final match data for matchId=${fullMatchId}`);
    } else {
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

      const rankEntriesPost = await getRankEntriesByPUUID(puuid);
      const soloRankPost = rankEntriesPost.find(e => e.queueType === 'RANKED_SOLO_5x5');
      const oldRankInfo = getPreviousRank(puuid);

      let lpChangeMsg = 'N/A';
      let newRankMsg = 'Unranked';
      let checkForRankUp = 'no_change';

      if (soloRankPost) {
        const newRankInfo = {
          tier: soloRankPost.tier,
          rank: soloRankPost.rank,
          lp: soloRankPost.leaguePoints,
          divisionString: `${soloRankPost.tier} ${soloRankPost.rank}`
        };
        const rankChange = calculateRankChange(oldRankInfo, newRankInfo);
        setPreviousRank(puuid, newRankInfo);
        newRankMsg =`${soloRankPost.tier} ${soloRankPost.rank} (${soloRankPost.leaguePoints} LP)`
        lpChangeMsg = rankChange.lpChange.toString();
        checkForRankUp = await determineRankMovement(oldRankInfo, newRankInfo);
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
        discordChannelId,
        deepLolLink
      };

      console.log(`[Info] Sending end-of-match message for ${summonerName}:`, matchSummary);
      await notifyMatchEnd(matchSummary);

      if (checkForRankUp !== 'no_change') {
        const rankChangeInfo = {
          summonerName,
          direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
          newRankMsg,
          lpChangeMsg,
          discordChannelId,
          deepLolLink
        };
        await notifyRankChange(rankChangeInfo);
      }
    }
    clearSummonerCurrentGame(puuid);
  } else {
    console.log(`[Info] ${summonerName} is not in game.`);
  }
};

cron.schedule('*/5 * * * * *', async () => {
  if (process.env.STOP_BOT) {
    console.log(`[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`);
    return;
  }

  console.log(`[Info] [${new Date().toISOString()}] Starting cron check for active matches...`);

  for (const player of trackedSummoners) {
    await checkAndHandleSummoner(player);
  }

  console.log(`[Info] [${new Date().toISOString()}] Finished cron check.\n`);
});
