export interface ApexPlayer {
    /** Apex UID — primary key in apex_players table */
    uid: string;
    gameName: string;
    /** Platform: PC, PS4, X1, SWITCH */
    platform: string;
    tier: string;
    /** Division number: 4 = I, 3 = II, 2 = III, 1 = IV; 0 for Master/Predator */
    division: number;
    /** Ranked Points */
    rp: number;
    currentMatchId: string | null;
    discordChannelId: string | null;
    lastUpdated: string;
    /** Lifetime kills from the player's banner tracker (null = not yet captured) */
    killsSnapshot: number | null;
    /** Lifetime damage from the player's banner tracker (null = not yet captured) */
    damageSnapshot: number | null;
    /** Lifetime wins from the player's banner tracker (null = not yet captured) */
    winsSnapshot: number | null;
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
        currentStatus?: string;
        currentStateSince?: number;
        isOnline?: number;
        /** 1 = currently in a match, 0 = not in a match */
        isInGame?: number;
        selectedLegend?: string;
        lobbyState?: string;
        canJoin?: number;
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
    getPlayerByName(
        name: string,
        platform: string
    ): Promise<ApexBridgeResponse>;
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

/** A row from apex_match_details */
export interface ApexMatchDetail {
    id: number;
    player_uid: string;
    match_start: number;
    match_end: number | null;
    legend: string | null;
    kills_before: number;
    damage_before: number;
    wins_before: number;
    kills_after: number | null;
    damage_after: number | null;
    wins_after: number | null;
    rp_before: number;
    rp_after: number | null;
    tier_before: string | null;
    tier_after: string | null;
    game_id: string;
    created_at: string;
}

/** Computed match result fields (derived from ApexMatchDetail) */
export interface ApexMatchResult extends ApexMatchDetail {
    kills_gained: number;
    damage_gained: number;
    wins_gained: number;
    rp_change: number;
    result: 'WIN' | 'LOSS' | 'UNKNOWN';
    duration_secs: number;
}

/** Extracted legend stats from /bridge response */
export interface ApexStatSnapshot {
    kills: number;
    damage: number;
    wins: number;
}

export const APEX_GAME_ID = 'apex_legends';
/** Prefix used for currentMatchId when a player is in a match */
export const APEX_IN_GAME_PREFIX = 'APEX_IN_GAME_';

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
