export interface ApexPlayer {
    /** Apex UID stored as string (stored in summoners.puuid column) */
    uid: string;
    gameName: string;
    /** Platform: PC, PS4, X1, SWITCH (stored in summoners.region column) */
    platform: string;
    tier: string;
    rank: string;
    /** Ranked Points (stored in summoners.lp column) */
    rp: number;
    discordChannelId: string | null;
    lastUpdated: string;
}

export interface ApexRank {
    tier: string;
    /** Division number: 4 (I) → 1 (IV). 0 for tiers with no division (Master, Predator) */
    division: number;
    rp: number;
}

export interface ApexLegendStat {
    name: string;
    value: number;
    key: string;
}

export interface ApexLegend {
    name: string;
    stats: ApexLegendStat[];
    imgUrl?: string;
}

/** Response shape from GET /bridge */
export interface ApexBridgeResponse {
    global: {
        name: string;
        uid: number;
        platform: string;
        level: number;
        toNextLevelPercent: number;
        rank: {
            rankScore: number;
            rankName: string;
            rankDiv: number;
            rankImg: string;
            rankedSeason: string;
        };
        arena?: {
            rankScore: number;
            rankName: string;
            rankDiv: number;
        };
    };
    legends: {
        selected: Record<string, ApexLegendData>;
        all: Record<string, ApexLegendData>;
    };
    realtime?: {
        currentStatus: string;
        currentStateSince: number;
        isOnline: number;
    };
}

export interface ApexLegendData {
    data?: Array<{
        name: string;
        value: number;
        key: string;
        rankVal?: number;
        top?: number;
    }>;
    gameInfo?: {
        badges?: Array<{ name: string; value: number }>;
    };
    ImgAssets?: {
        icon: string;
        banner: string;
    };
}

/** Response shape from GET /nametouid */
export interface ApexUidResponse {
    uid: string;
    pid: string;
    name: string;
    avatar: string;
    platform: string;
}

/** Response shape from GET /predator */
export interface ApexPredatorResponse {
    RP: {
        PC: { val: number; uid: number; updateTimestamp: number };
        PS4: { val: number; uid: number; updateTimestamp: number };
        SWITCH: { val: number; uid: number; updateTimestamp: number };
        X1: { val: number; uid: number; updateTimestamp: number };
    };
    AP: {
        PC: { val: number; uid: number; updateTimestamp: number };
        PS4: { val: number; uid: number; updateTimestamp: number };
        SWITCH: { val: number; uid: number; updateTimestamp: number };
        X1: { val: number; uid: number; updateTimestamp: number };
    };
}

export interface IApexService {
    checkConnection(): Promise<boolean>;
    getPlayerByName(name: string, platform: string): Promise<ApexBridgeResponse>;
    getPlayerByUid(uid: string, platform: string): Promise<ApexBridgeResponse>;
    getUidByName(name: string, platform: string): Promise<string>;
    getPredatorRanks(): Promise<ApexPredatorResponse>;
}

/** Apex bot plugin configuration */
export interface ApexBotConfig {
    /** Cron schedule for rank polling (default: every 5 minutes) */
    rankCheckCron: string;
    /** Default Discord channel ID for notifications */
    defaultDiscordChannelId?: string;
}

export const APEX_GAME_ID = 'apex_legends';

export const APEX_PLATFORMS = ['PC', 'PS4', 'X1', 'SWITCH'] as const;
export type ApexPlatform = (typeof APEX_PLATFORMS)[number];

/** Apex ranked tier order from lowest to highest */
export const APEX_TIER_ORDER = [
    'Rookie',
    'Bronze',
    'Silver',
    'Gold',
    'Platinum',
    'Diamond',
    'Master',
    'Apex Predator',
] as const;
