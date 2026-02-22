declare module 'twisted' {
    export const Constants: {
        Regions: {
            readonly EU_WEST: 'EU_WEST';
            [key: string]: string;
        };
        RegionGroups: {
            readonly EUROPE: 'EUROPE';
            readonly SEA: 'SEA';
            [key: string]: string;
        };
        Games: {
            readonly LOL: 'LOL';
            [key: string]: string;
        };
        Divisions: {
            readonly I: 'I';
            readonly II: 'II';
            readonly III: 'III';
            readonly IV: 'IV';
            [key: string]: string;
        };
    };

    export class LolApi {
        constructor(options: { key: string });
        [key: string]: any;
    }

    export class RiotApi {
        constructor(options: { key: string });
        [key: string]: any;
    }
}

declare module 'twisted/dist/models-dto/league/summoner-league/summoner-league.dto' {
    export interface SummonerLeagueDto {
        [key: string]: any;
    }
}

declare module 'twisted/dist/models-dto/account/account.dto' {
    export interface AccountDto {
        [key: string]: any;
    }
}

declare module 'twisted/dist/models-dto/account/account-region.dto' {
    export interface AccountRegionDto {
        [key: string]: any;
    }
}

declare module 'twisted/dist/models-dto/matches/match-v5' {
    export namespace MatchV5DTOs {
        export interface ParticipantDto {
            puuid: string;
            win?: boolean;
            championName?: string;
            individualPosition?: string;
            teamPosition?: string;
            totalDamageDealtToChampions?: number;
            kills?: number;
            deaths?: number;
            assists?: number;
            riotIdGameName?: string;
            riotIdTagline?: string;
            summonerName?: string;
        }

        export interface MatchDto {
            metadata: {
                dataVersion: string;
                matchId: string;
                participants: string[];
            };
            info: {
                gameCreation?: number;
                gameDuration?: number;
                gameEndTimestamp?: number;
                gameId?: number;
                gameMode?: string;
                gameName?: string;
                gameStartTimestamp?: number;
                gameType?: string;
                gameVersion?: string;
                mapId?: number;
                participants?: ParticipantDto[];
                platformId?: string;
                queueId?: number;
                teams?: unknown[];
                tournamentCode?: string;
                endOfGameResult?: string;
            };
        }
    }

    export namespace MatchV5TimelineDTOs {
        export interface MatchTimelineDto {
            [key: string]: any;
        }
    }
}

declare module 'twisted/dist/models-dto/matches/match-v5/match.dto' {
    export namespace MatchV5DTOs {
        export interface ParticipantDto {
            puuid: string;
            [key: string]: any;
        }

        export interface MatchDto {
            metadata: {
                dataVersion: string;
                matchId: string;
                participants: string[];
            };
            info: {
                [key: string]: any;
            };
        }
    }
}
