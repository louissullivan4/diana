// services/matchMonitoringService.js
const cron = require('node-cron');
const {
  getMatchSummary,
  getRankEntriesByPUUID,
  getActiveGameByPuuid
} = require('./riotService');
const {
  setSummonerCurrentGame,
  getSummonerCurrentGame,
  clearSummonerCurrentGame
} = require('./gameTracker');
const {
  setPreviousRank,
  getPreviousRank,
  clearPreviousRank
} = require('./rankTracker');
const { sendDiscordMessage } = require('./discordService');

const { getChampionInfoById } = require('./championLookup');
const { getQueueNameById } = require('./queueLookup');

const trackedSummoners = require('../config/trackedSummoners');

cron.schedule('*/5 * * * * *', async () => {
  console.log(`[Info] [${new Date().toISOString()}] Starting cron check for active matches...`);

  for (const player of trackedSummoners) {
    const {
      puuid,
      summonerName,
      tagLine,
      discordChannelId,
      regionGroup,
      matchRegionPrefix
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
            const preRankInfo = {
              tier: soloRank.tier,
              rank: soloRank.rank,
              lp: soloRank.leaguePoints,
              divisionString: `${soloRank.tier} ${soloRank.rank}`,
            };
            setPreviousRank(puuid, preRankInfo);

            rankString = `${soloRank.tier} ${soloRank.rank} (${soloRank.leaguePoints} LP)`;
            console.log(`[Info] [${summonerName}] Found existing rank: ${preRankInfo.divisionString} ${preRankInfo.lp} LP`);
          } else {
            setPreviousRank(puuid, null);
            console.log(`[Info] [${summonerName}] User is unranked or has no RANKED_SOLO_5x5 data.`);
          }

          const participant = activeGameData.participants
            .find(p => p.puuid === puuid);

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

          const startMessage = `
**${summonerName}** is now in a **${queueName}** match!
Champion: **${championDisplay}**
Current Rank: **${rankString}**
          `.trim();

          console.log(`[Info] Sending start-of-match message for ${summonerName}:`, startMessage);
          await sendDiscordMessage(discordChannelId, startMessage);
        }

      } else {
        // -- USER IS NOT IN GAME --
        // const storedGameId = getSummonerCurrentGame(puuid);
        const storedGameId = "7263098496";

        if (storedGameId) {
          console.log(`[Info] [${summonerName}] Match ended (previous gameId=${storedGameId}). Fetching final match data...`);
          const fullMatchId = `${matchRegionPrefix}_${storedGameId}`;

          const matchSummary = await getMatchSummary(fullMatchId);
          if (!matchSummary?.info) {
            console.log(`[Warning] No final match data for matchId=${fullMatchId}`);
          } else {
            const participant = matchSummary.info.participants.find(p => p.puuid === puuid);

            let result = 'Lose';
            if (matchSummary.info.gameDuration < 300) {
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

            let rankChangeMsg = 'Unranked -> Unranked';
            let lpChangeMsg = 'N/A';

            const rankEntriesPost = await getRankEntriesByPUUID(puuid);
            const soloRankPost = rankEntriesPost.find(e => e.queueType === 'RANKED_SOLO_5x5');
            const oldRankInfo = getPreviousRank(puuid);

            if (soloRankPost) {
              const newTier = soloRankPost.tier;
              const newRank = soloRankPost.rank;
              const newLp = soloRankPost.leaguePoints;

              let oldTier = 'UNRANKED';
              let oldRank = '';
              let oldLp = 0;

              if (oldRankInfo) {
                oldTier = oldRankInfo.tier;
                oldRank = oldRankInfo.rank;
                oldLp = oldRankInfo.lp;
              }

              const oldRankStr = oldRankInfo
                ? `${oldTier} ${oldRank} ${oldLp} LP`
                : 'UNRANKED';
              const newRankStr = `${newTier} ${newRank} ${newLp} LP`;
              rankChangeMsg = `${oldRankStr} -> ${newRankStr}`;

              const lpDiff = newLp - oldLp;
              const sign = lpDiff >= 0 ? '+' : '';
              lpChangeMsg = `${sign}${lpDiff}`;
            } else {
              rankChangeMsg = 'Unranked -> Unranked';
              lpChangeMsg = '0';
            }

            const endMessage = `
**${summonerName}'s match has ended!**  

:checkered_flag: **Result:** \`${result}\`  
:chart_with_upwards_trend: **Rank Update:** \`${rankChangeMsg}\`  
:arrow_up_down: **LP Change:** \`${lpChangeMsg}\`  
:shield: **Champion:** \`${champion}\`  
:video_game: **Role:** \`${role}\`  
:crossed_swords: **KDA:** \`${kdaStr}\`  
:boom: **Damage Dealt:** \`${damage}\`
`;
            console.log(`[Info] Sending end-of-match message for ${summonerName}:`, endMessage);
            await sendDiscordMessage(discordChannelId, endMessage);
          }

          clearSummonerCurrentGame(puuid);
          clearPreviousRank(puuid);

        } else {
          console.log(`[Info] ${summonerName} is not in game:`);
        }
      }
    } catch (error) {
      console.error(`[Error] [${summonerName}] (PUUID=${puuid}): ${error?.message || error}`);
    }
  }

  console.log(`[Info] [${new Date().toISOString()}] Finished cron check.\n`);
});
