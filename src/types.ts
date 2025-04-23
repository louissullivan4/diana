import { AccountDto } from 'twisted/dist/models-dto/account/account.dto';
import { CurrentGameInfoDTO } from 'twisted/dist/models-dto/spectator';
import { SummonerLeagueDto } from 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto';
import {
    MatchV5DTOs,
    MatchV5TimelineDTOs,
} from 'twisted/dist/models-dto/matches/match-v5';

export interface Account extends AccountDto {
    region: string;
}

export interface SummonerSummary {
    name: string;
    tier: string;
    rank: string;
    lp: number;
    totalGames: number;
    wins: number;
    losses: number;
    winRate: string;
    totalTimeInHours: string;
    mostPlayedChampion: Record<string, string>;
    averageDamageDealtToChampions: string;
    mostPlayedRole: string;
    discordChannelId: string;
}

export interface Summoner {
    gameName: string;
    tagLine: string;
    region: string;
    puuid: string;
    tier: string;
    rank: string;
    lp: number;
    currentMatchId: string;
    lastUpdated: string;
    lastMissingDataNotification: number;
    discordChannelId: string;
    deepLolLink: string;
    matchRegionPrefix: string;
    regionGroup: string;
}

export enum Role {
    TOP,
    JUNGLE,
    MIDDLE,
    BOTTOM,
    UTILITY,
}

export interface Rank {
    tier: string;
    division?: string;
    lp: number;
    rank: string;
}
export interface ILolService {
    checkConnection(): Promise<boolean>;
    getMatchesByPUUID(puuid: string, count?: number): Promise<string[]>;
    getMatchDataById(
        matchId: string
    ): Promise<MatchV5TimelineDTOs.MatchTimelineDto>;
    getMatchSummary(matchId: string): Promise<MatchV5DTOs.MatchDto>;
    getRankEntriesByPUUID(puuid: string): Promise<SummonerLeagueDto[]>;
    getActiveGameByPuuid(puuid: string): Promise<CurrentGameInfoDTO>;
}
