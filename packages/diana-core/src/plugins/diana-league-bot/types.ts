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
export interface ChampionRotation {
    freeChampionIds: number[];
    freeChampionIdsForNewPlayers: number[];
    maxNewPlayerLevel: number;
}

export interface LiveGameParticipant {
    puuid: string;
    teamId: number;
    championId: number;
    riotId?: string;
    [key: string]: unknown;
}

export interface LiveGameBannedChampion {
    championId: number;
    teamId: number;
    pickTurn?: number;
}

export interface LiveGameInfo {
    gameId: number;
    gameMode: string;
    gameQueueConfigId: number;
    gameStartTime?: number;
    /** Seconds since game start (can be slightly negative in loading screen) */
    gameLength?: number;
    participants: LiveGameParticipant[];
    bannedChampions?: LiveGameBannedChampion[];
    [key: string]: unknown;
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
    getRankEntriesByPUUID(
        puuid: string,
        region?: string
    ): Promise<SummonerLeagueDto[]>;
    getAccountByPUUID(puuid: string, regionGroup?: string): Promise<AccountDto>;
    getAccountByRiotId(
        gameName: string,
        tagLine: string,
        regionGroup?: string
    ): Promise<AccountDto>;
    getActiveRegionByPUUID(
        puuid: string,
        regionGroup?: string
    ): Promise<AccountRegionDto>;
    getChampionRotation(region?: string): Promise<ChampionRotation>;
    /** Current live game for a player, or null when not in game */
    getActiveGame(puuid: string, region?: string): Promise<LiveGameInfo | null>;
}

/**
 * League Bot plugin configuration
 */
export interface LeagueBotConfig {
    /** Cron schedule for match checking (default: every minute) */
    matchCheckCron: string;
    /** Cron schedule for the weekly digest post (server-local time, 6-field) */
    weeklyDigestCron: string;
    /** Cron schedule for the free-rotation post (server-local time, 6-field) */
    rotationPostCron: string;
}
