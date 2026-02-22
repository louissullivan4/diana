import { AccountDto } from 'twisted/dist/models-dto/account/account.dto';
import { SummonerLeagueDto } from 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto';
import {
    MatchV5DTOs,
    MatchV5TimelineDTOs,
} from 'twisted/dist/models-dto/matches/match-v5';
import { AccountRegionDto } from 'twisted/dist/models-dto/account/account-region.dto';

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
    getMatchesByPUUID(
        puuid: string,
        count?: number,
        regionGroup?: string
    ): Promise<string[]>;
    getMatchDataById(
        matchId: string,
        regionGroup?: string
    ): Promise<MatchV5TimelineDTOs.MatchTimelineDto>;
    getMatchSummary(
        matchId: string,
        regionGroup?: string
    ): Promise<MatchV5DTOs.MatchDto>;
    getRankEntriesByPUUID(puuid: string): Promise<SummonerLeagueDto[]>;
    getAccountByPUUID(puuid: string, regionGroup?: string): Promise<AccountDto>;
    getActiveRegionByPUUID(
        puuid: string,
        regionGroup?: string
    ): Promise<AccountRegionDto>;
}

/**
 * Tracked summoner configuration
 */
export interface TrackedSummonerConfig {
    /** Riot PUUID of the summoner */
    puuid: string;
    /** Display name (optional, for dashboard display) */
    name?: string;
    /** Override Discord channel for this summoner's notifications */
    discordChannelId?: string;
}

/**
 * League Bot plugin configuration
 */
export interface LeagueBotConfig {
    /** List of summoners to track for match notifications */
    trackedSummoners: TrackedSummonerConfig[];
    /** Cron schedule for match checking (default: every 20 seconds) */
    matchCheckCron: string;
    /** Default Discord channel ID for notifications */
    defaultDiscordChannelId?: string;
}
