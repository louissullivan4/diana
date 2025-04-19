// services/matchMonitoringService.js
require("dotenv").config();
const cron = require("node-cron");
const {
  checkConnection,
  getMatchSummary,
  getRankEntriesByPUUID,
  getActiveGameByPuuid,
} = require("../services/riotService");
const { createMatchDetail } = require("../services/matchService");
const {
  getSummonerByPuuid,
  updateSummonerRank,
  setSummonerActiveMatchIdByPuuid,
} = require("../services/summonerService");
const {
  calculateRankChange,
  determineRankMovement,
} = require("../services/rankService");
const {
  loginClient,
  notifyMatchEnd,
  notifyMatchStart,
  notifyRankChange,
} = require("./discordService");
const {
  getChampionInfoById,
  getQueueNameById,
} = require("../services/dataDragonService");
const { updateMissingData } = require("../services/updateMissingDataService");
const trackedSummoners = require("../config/trackedSummoners");

const checkAndHandleSummoner = async (player) => {
  try {
    await loginClient();
    // eslint-disable-next-line no-unused-vars
    const summary = await updateMissingData({ summoner: player });
    const activeGameData = await getActiveGameByPuuid(player.puuid);
    if (activeGameData) {
      await handleMatchStart(player, activeGameData);
    } else {
      console.log(
        `[Info] Summoner [${player.gamename}] is not in an active game...`,
      );
      await handleMatchEnd(player);
    }
  } catch (error) {
    console.error(
      `[Error] [${player.gamename}] (PUUID=${player.puuid}), ${error}`,
    );
  }
};

const handleMatchStart = async (player, activeGameData) => {
  const puuid = player.puuid;
  const summonerName = player.gamename;
  const currentMatchId = player.currentmatchid;
  if (!currentMatchId) {
    const rankEntries = await getRankEntriesByPUUID(puuid);
    const soloRank = rankEntries.find((e) => e.queueType === "RANKED_SOLO_5x5");
    const summonerCurrentRankInfo = {
      tier: soloRank ? soloRank.tier : "Unranked",
      rank: soloRank ? soloRank.rank : "N/A",
      lp: soloRank ? soloRank.leaguePoints : 0,
      puuid,
    };
    await updateSummonerRank(summonerCurrentRankInfo);
    const participant = activeGameData.participants.find(
      (p) => p.puuid === puuid,
    );
    let championDisplay = "Unknown Champion";
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
      discordChannelId: player.discordchannelid || "",
      deepLolLink: player.deeplollink || "",
    };
    const messageSent = await notifyMatchStart(matchStartInfo);
    if (messageSent) {
      await setSummonerActiveMatchIdByPuuid(puuid, activeGameData.gameId);
    }
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
        gameCreation: matchSummaryData.info.gameCreation,
        gameStartTime: matchSummaryData.info.gameStartTimestamp,
        gameEndTime: matchSummaryData.info.gameEndTimestamp,
        gameVersion: matchSummaryData.info.gameVersion,
        gameDuration: matchSummaryData.info.gameDuration,
        gameMode: matchSummaryData.info.gameMode,
        gameType: matchSummaryData.info.gameType,
        queueId: matchSummaryData.info.queueId,
        mapName: matchSummaryData.info.mapId,
        participants: JSON.stringify(matchSummaryData.info.participants),
        teams: JSON.stringify(matchSummaryData.info.teams),
      };
      await createMatchDetail(matchDetails);
      const participant = matchSummaryData.info.participants.find(
        (p) => p.puuid === puuid,
      );
      let result = "Lose";
      if (matchSummaryData.info.gameDuration < 300) {
        result = "Remake";
      } else if (participant?.win) {
        result = "Win";
      }
      const queueId = matchDetails.queueId;
      const queueName = getQueueNameById(queueId);
      const kdaStr = `${participant?.kills ?? 0}/${participant?.deaths ?? 0}/${participant?.assists ?? 0}`;
      const champion = participant?.championName || "Unknown";
      const role =
        participant?.individualPosition || participant?.teamPosition || "N/A";
      const damage = participant?.totalDamageDealtToChampions || 0;
      const oldRankInfo = { tier, rank, lp };
      const rankEntriesPost = await getRankEntriesByPUUID(puuid);
      const soloRankPost = rankEntriesPost.find(
        (e) => e.queueType === "RANKED_SOLO_5x5",
      );
      let newRankMsg = "Unranked N/A (0 LP)";
      let lpChangeMsg = 0;
      let checkForRankUp = "no_change";
      if (soloRankPost) {
        const summonerNewRankInfo = {
          tier: soloRankPost.tier,
          rank: soloRankPost.rank,
          lp: soloRankPost.leaguePoints,
          puuid,
        };
        const rankChange = calculateRankChange(
          oldRankInfo,
          summonerNewRankInfo,
        );
        checkForRankUp = await determineRankMovement(
          oldRankInfo,
          summonerNewRankInfo,
        );
        await updateSummonerRank(summonerNewRankInfo);
        newRankMsg = `${summonerNewRankInfo.tier} ${summonerNewRankInfo.rank} (${summonerNewRankInfo.lp} LP)`;
        lpChangeMsg = rankChange.lpChange.toString();
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
        discordChannelId: player.discordchannelid || "",
        deepLolLink: player.deeplollink || "",
      };
      const messageSent = await notifyMatchEnd(matchSummary);
      if (messageSent) {
        await setSummonerActiveMatchIdByPuuid(puuid, "");
      }
      if (checkForRankUp !== "no_change") {
        const rankChangeInfo = {
          summonerName,
          direction: checkForRankUp === "promoted" ? "promoted" : "demoted",
          newRankMsg,
          lpChangeMsg,
          discordChannelId: player.discordchannelid || "",
          deepLolLink: player.deeplollink || "",
        };
        await notifyRankChange(rankChangeInfo);
      }
    }
  }
};

cron.schedule("*/30 * * * * *", async () => {
  if (process.env.STOP_BOT) {
    console.log(
      `[Info] [${new Date().toISOString()}] Stop bot enabled, skipping run...`,
    );
    return;
  }
  const apiValid = await checkConnection();
  if (apiValid) {
    console.log(
      `[Info] [${new Date().toISOString()}] Starting cron check for active matches...`,
    );
    for (const player of trackedSummoners) {
      const summoner = await getSummonerByPuuid(player.puuid);
      if (summoner) {
        await checkAndHandleSummoner(summoner);
      } else {
        console.log(
          `[Info] Player PUUID[${player.puuid}] was not found in database.`,
        );
      }
    }
    console.log(`[Info] [${new Date().toISOString()}] Finished cron check.\n`);
  } else {
    console.log(
      `[Error] [${new Date().toISOString()}] API connection failed, skipping run...`,
    );
  }
});

module.exports = {
  checkAndHandleSummoner,
  handleMatchStart,
  handleMatchEnd,
};
