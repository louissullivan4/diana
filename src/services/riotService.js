// riotService.js
const { LolApi, Constants, RiotApi } = require("twisted");
const axios = require("axios");
require("dotenv").config();

const riotApi = new RiotApi({ key: process.env.RIOT_API_KEY });
const lolApi = new LolApi({ key: process.env.RIOT_API_KEY });

const checkConnection = async () => {
  try {
    await lolApi.StatusV4.get(Constants.Regions.EU_WEST);
    return true;
    // eslint-disable-next-line no-unused-vars
  } catch (error) {
    return false;
  }
};

const getAccountByAccountName = async (summonerName, tagLine, region) => {
  const resByRiotId = (
    await riotApi.Account.getByRiotId(
      summonerName,
      tagLine,
      Constants.RegionGroups.EUROPE,
    )
  ).response;
  let summonerObj = {};
  summonerObj = resByRiotId;
  summonerObj["region"] = region;
  return summonerObj;
};

const getMatchesByPUUID = async (
  puuid,
  count = 20,
  region = Constants.RegionGroups.EUROPE,
) => {
  const { response: matchIds } = await lolApi.MatchV5.list(puuid, region, {
    count,
  });
  return matchIds;
};

const getMatchDataById = async (matchId) => {
  const matchData = (
    await lolApi.MatchV5.timeline(matchId, Constants.RegionGroups.EUROPE)
  ).response;
  return matchData;
};

async function getMatchSummary(
  matchId,
  regionGroup = Constants.RegionGroups.EUROPE,
) {
  try {
    const matchDetails = await lolApi.MatchV5.get(matchId, regionGroup);
    return matchDetails.response;
  } catch (error) {
    console.error("Error in getMatchSummary:");
    throw error;
  }
}

async function getRankEntriesByPUUID(puuid, region = "euw1") {
  try {
    const summonerUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY}`;
    const summonerResponse = await axios.get(summonerUrl);
    const summoner = summonerResponse.data;

    const summonerId = summoner.id;

    const leagueUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${process.env.RIOT_API_KEY}`;
    const leagueResponse = await axios.get(leagueUrl);

    return leagueResponse.data;
  } catch (error) {
    console.error("Error in getRankEntriesByPUUID:", error);
    throw error;
  }
}

async function getActiveGameByPuuid(puuid, region = "euw1") {
  try {
    const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${process.env.RIOT_API_KEY}`;

    const response = await axios.get(url);

    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null;
    }
    console.error("Error in getActiveGameBySummonerId:", error);
    throw error;
  }
}

module.exports = {
  getAccountByAccountName,
  getMatchesByPUUID,
  getMatchDataById,
  getMatchSummary,
  getRankEntriesByPUUID,
  getActiveGameByPuuid,
  checkConnection,
};
