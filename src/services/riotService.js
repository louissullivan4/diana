// riotService.js
const { LolApi, Constants, RiotApi } = require('twisted');
require('dotenv').config();

const riotApi = new RiotApi({ key: process.env.RIOT_API_KEY });
const lolApi = new LolApi({ key: process.env.RIOT_API_KEY });

const getRegion = (region) => {
    switch (region) {
        case 'americas':
            return Constants.Region.AMERICAS;
        case 'asia':
            return Constants.Region.ASIA;
        case 'europe':
            return Constants.Region.EUROPE;
        case 'sea':
            return Constants.Region.SEA;
        default:
            return Constants.Region.EUROPE;
    }
};

const getAccountByAccountName = async (summonerName, tagLine, region) => {
    const regionConst = getRegion(region);
    const resByRiotId = (await riotApi.Account.getByRiotId(summonerName, tagLine, regionConst)).response;
    resByRiotId.set('region', region);
    return resByRiotId;
};

const getMatchesByPUUID = async (puuid, count = 20) => {
    const matchIds = await (lolApi.MatchV5.getMatchIdsByPUUID(puuid, count)).response;
    return matchIds;
};

const getMatchDataById = async (matchId) => {
    const matchData = (await lolApi.MatchV5.getMatchById(matchId)).response;
    return matchData;
};

module.exports = {
    getAccountByAccountName,
    getMatchesByPUUID,
    getMatchDataById
};
