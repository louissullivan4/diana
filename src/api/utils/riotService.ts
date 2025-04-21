import { LolApi, Constants, RiotApi } from 'twisted';
import 'dotenv/config';
import axios from 'axios';
import { Account } from '../../types';
import { LeagueEntryDTO, MatchDto } from 'twisted/dist/models-dto';

const riotApi = new RiotApi({ key: process.env.RIOT_API_KEY });
const lolApi = new LolApi({ key: process.env.RIOT_API_KEY });

export const checkConnection = async () => {
    try {
        await lolApi.StatusV4.get(Constants.Regions.EU_WEST);
        return true;
    } catch {
        return false;
    }
};

export const getAccountByAccountName = async (
    summonerName: string,
    tagLine: string,
    region: string
): Promise<Account> => {
    const resByRiotId = (
        await riotApi.Account.getByRiotId(
            summonerName,
            tagLine,
            Constants.RegionGroups.EUROPE
        )
    ).response;

    return { ...resByRiotId, region };
};

export const getMatchesByPUUID = async (
    puuid: string,
    count = 20,
    region = Constants.RegionGroups.EUROPE
) => {
    const { response: matchIds } = await lolApi.MatchV5.list(puuid, region, {
        count,
    });
    return matchIds;
};

export const getMatchDataById = async (matchId: string) => {
    const matchData = (
        await lolApi.MatchV5.timeline(matchId, Constants.RegionGroups.EUROPE)
    ).response;
    return matchData;
};

export async function getMatchSummary(
    matchId: string,
    regionGroup = Constants.RegionGroups.EUROPE
) {
    try {
        const matchDetails = await lolApi.MatchV5.get(matchId, regionGroup);
        return matchDetails.response;
    } catch (error) {
        console.error('Error in getMatchSummary:');
        throw error;
    }
}

export async function getRankEntriesByPUUID(puuid: string, region = 'euw1') {
    try {
        const summonerUrl = `https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${process.env.RIOT_API_KEY}`;
        const summonerResponse = await axios.get<{ id: string }>(summonerUrl);
        const summoner = summonerResponse.data;

        const summonerId = summoner.id;

        const leagueUrl = `https://${region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}?api_key=${process.env.RIOT_API_KEY}`;
        const leagueResponse = await axios.get<any[]>(leagueUrl);

        return leagueResponse.data;
    } catch (error) {
        console.error('Error in getRankEntriesByPUUID:', error);
        throw error;
    }
}

export async function getActiveGameByPuuid(puuid: string, region = 'euw1') {
    try {
        const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}?api_key=${process.env.RIOT_API_KEY}`;

        const response = await axios.get<MatchDto>(url);

        return response.data;
    } catch (error: any) {
        if (error.response && error.response.status === 404) {
            return null;
        }
        console.error('Error in getActiveGameBySummonerId:', error);
        throw error;
    }
}
