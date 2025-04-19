// services/updateMissingService.js
require("dotenv").config();

const { getMatchDetailsByPuuid, createMatchDetail } = require("./matchService");
const { getMatchesByPUUID, getMatchSummary } = require("./riotService");
const {
  getChampionInfoById,
  getQueueNameById,
  getRoleNameTranslation,
} = require("./dataDragonService");
const { notifyMissingData } = require("../discord/discordService");

const {
  updateSummonerMissingDataNotificationTimeByPuuid,
} = require("./summonerService");

async function missingDataNotificationDue(missing_data_last_sent_time) {
  try {
    if (!missing_data_last_sent_time) {
      return true;
    }
    const lastSentTime = new Date(missing_data_last_sent_time);
    const currentTime = new Date();
    const timeDiff = Math.abs(currentTime - lastSentTime);
    const diffHours = Math.ceil(timeDiff / (1000 * 3600));
    if (diffHours >= 24) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error retrieving lastSentTime:", error);
    return false;
  }
}

async function updateMissingData({ summoner }) {
  // check if summoner has played in the last 7 days, send message if they have
  const lastPlayedDate = new Date(summoner.lastupdated);
  const currentDate = new Date();
  const timeDiff = Math.abs(currentDate - lastPlayedDate);
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  if (diffDays > 7) {
    console.info(
      `[Info] Summoner ${summoner.gamename} has not played in the last 7 days, skipping...`,
    );
    return;
  }
  const puuid = summoner.puuid;
  const notificationDue = await missingDataNotificationDue(
    summoner.missing_data_last_sent_time,
  );
  if (!notificationDue) {
    console.info(
      `[Info] Missing data notification not due for: ${summoner.gamename}`,
    );
    return;
  }
  const existingDetails = await getMatchDetailsByPuuid(puuid, 50);
  const existingMatchIds = existingDetails.map((m) => String(m.matchid));

  const storedIds = new Set(existingMatchIds);

  if (existingMatchIds.length === 0) {
    console.info(`[Info] No stored matches found for: ${summoner.gamename}`);
  }

  const allIds = await getMatchesByPUUID(puuid, 50);
  if (!Array.isArray(allIds) || allIds.length === 0) {
    console.info(`[Info] Riot returned no matches for: ${summoner.gamename}`);
    return;
  }

  const missingIds = allIds
    .map((id) => String(id))
    .filter((id) => !storedIds.has(id));

  if (missingIds.length === 0) {
    console.info(
      `[Info] No missing matches to update for: ${summoner.gamename}`,
    );
    return;
  }

  console.info(
    `[Info] Found ${missingIds.length} missing matches for: ${summoner.gamename}`,
  );

  let totalGames = 0;
  let wins = 0;
  let losses = 0;
  let totalDuration = 0;
  let championCount = {};
  let totalDamageDealtToChampions = 0;
  let roleCount = {};

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

      if (getQueueNameById(info.queueId) !== "Ranked Solo") {
        continue;
      }

      if (record.gameDuration < 300) {
        continue;
      }

      totalGames++;
      totalDuration += info.gameDuration;

      const participant = info.participants.find((p) => p.puuid === puuid);
      if (participant && participant.win) {
        wins++;
      } else {
        losses++;
      }

      const player = info.participants.find((p) => p.puuid === puuid);
      if (player) {
        championCount[player.championId] =
          (championCount[player.championId] || 0) + 1;
        totalDamageDealtToChampions += player.totalDamageDealtToChampions || 0;
        roleCount[player.teamPosition] =
          (roleCount[player.teamPosition] || 0) + 1;
      }

      await createMatchDetail(record);
    } catch (err) {
      console.error(
        `[Error] Failed to fetch/save match ${matchId}:`,
        err.message || err,
      );
    }
  }

  const totalTimeInHours = (totalDuration / 3600 || 0).toFixed(0) + " hours";
  const mostPlayedChampionId =
    Object.keys(championCount).reduce((a, b) =>
      championCount[a] > championCount[b] ? a : b,
    ) || null;
  const mostPlayedChampion = (await getChampionInfoById(
    mostPlayedChampionId,
  )) || {
    name: "Unknown Champion",
    tagString: "Unknown",
  };
  const averageDamageDealtToChampions =
    (totalDamageDealtToChampions / totalGames).toFixed(0) || 0;
  const mostPlayedRole =
    Object.keys(roleCount).reduce((a, b) =>
      roleCount[a] > roleCount[b] ? a : b,
    ) || null;
  const winRate = ((wins / totalGames) * 100).toFixed(2) || 0 + "%";

  let summonerSummary = {
    name: summoner.gamename,
    tier: summoner.tier,
    rank: summoner.rank,
    lp: summoner.lp,
    totalGames: totalGames,
    wins: wins,
    losses: losses,
    winRate: winRate,
    totalTimeInHours: totalTimeInHours,
    mostPlayedChampion: mostPlayedChampion,
    averageDamageDealtToChampions: averageDamageDealtToChampions,
    mostPlayedRole: getRoleNameTranslation(mostPlayedRole),
    discordChannelId: summoner.discordchannelid,
  };

  await notifyMissingData({ summoner: summonerSummary });
  await updateSummonerMissingDataNotificationTimeByPuuid(summoner.puuid);

  return summonerSummary;
}

module.exports = {
  updateMissingData,
};
