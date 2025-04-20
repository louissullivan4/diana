import { AccountDto } from 'twisted/dist/models-dto/account/account.dto';

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
    missingDataLastSentTime: number;
    discordChannelId: string;
    deepLolLink: string;
    matchRegionPrefix: string;
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
