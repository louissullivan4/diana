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
} = require('./rankService');
const { notifyMatchEnd, notifyMatchStart, notifyRankChange } = require('./discordService');

const { getChampionInfoById, getQueueNameById } = require('./dataDragonService');

const trackedSummoners = require('../config/trackedSummoners');

cron.schedule('*/5 * * * * *', async () => {
  if (process.env.STOP_BOT){
    console.log(`[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`);
  } else {
    console.log(`[Info] [${new Date().toISOString()}] Starting cron check for active matches...`);

    for (const player of trackedSummoners) {
      const {
        puuid,
        summonerName,
        tagLine,
        discordChannelId,
        regionGroup,
        matchRegionPrefix,
        deepLolLink
      } = player;

      try {
        const activeGameData = await getActiveGameByPuuid(puuid);
        if (activeGameData) {
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
                divisionString: `${soloRank.tier} ${soloRank.rank}`,
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
            let championTag = 'Unknown';
            let role = 'N/A';

            if (participant) {
              const champInfo = await getChampionInfoById(participant.championId);
              championDisplay = champInfo.name;
              championTag = champInfo.tagString;

              role = participant.individualPosition
                || participant.teamPosition
                || 'N/A';
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

        } else {
          // -- USER IS NOT IN GAME --
          const storedGameId = getSummonerCurrentGame(puuid);

          if (storedGameId) {
            console.log(`[Info] [${summonerName}] Match ended (previous gameId=${storedGameId}). Fetching final match data...`);
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

              const kills = participant?.kills ?? 0;
              const deaths = participant?.deaths ?? 0;
              const assists = participant?.assists ?? 0;
              const kdaStr = `${kills}/${deaths}/${assists}`;
              const champion = participant?.championName || 'Unknown';
              const role = participant?.individualPosition || participant?.teamPosition || 'N/A';
              const damage = participant?.totalDamageDealtToChampions || 0;

              const rankEntriesPost = await getRankEntriesByPUUID(puuid);
              const soloRankPost = rankEntriesPost.find(e => e.queueType === 'RANKED_SOLO_5x5');
              const oldRankInfo = getPreviousRank(puuid);

              let lpChangeMsg = 'N/A';
              let newRankMsg = 'Unranked';
              let rankChange;
              let checkForRankUp = 'no change'

              if (soloRankPost) {
                const newRankInfo = {
                  tier: soloRankPost.tier,
                  rank: soloRankPost.rank,
                  lp: soloRankPost.leaguePoints,
                  divisionString: `${soloRankPost.tier} ${soloRankPost.rank}`,
                };
                rankChange = calculateRankChange(oldRankInfo, newRankInfo);
                setPreviousRank(puuid, newRankInfo);
                newRankMsg = divisionString;

                checkForRankUp = await determineRankMovement(oldRankInfo, newRankInfo)
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

              if (checkForRankUp !== 'no change'){
                const rankChangeInfo = {
                  summonerName,
                  direction: checkForRankUp === 'promoted' ? 'promoted' : 'demoted',
                  rankChangeMsg,
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
        }
      } catch (error) {
        console.error(`[Error] [${summonerName}] (PUUID=${puuid}): ${error?.message || error}`);
      }
    }

    console.log(`[Info] [${new Date().toISOString()}] Finished cron check.\n`);
  }
});
