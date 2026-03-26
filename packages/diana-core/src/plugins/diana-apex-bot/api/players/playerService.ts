import { db } from '../../../diana-league-bot/api/utils/db.js';
import {
    APEX_GAME_ID,
    APEX_IN_GAME_PREFIX,
    type ApexPlayer,
    type ApexStatSnapshot,
    type ApexLegendData,
} from '../../types.js';

export const getApexPlayerByUid = async (
    uid: string
): Promise<ApexPlayer | null> => {
    const result = await db.query(
        `SELECT * FROM summoners WHERE "puuid" = $1 AND game_id = $2`,
        [uid, APEX_GAME_ID]
    );
    return rowToApexPlayer(result.rows[0]) ?? null;
};

export const getApexPlayerByName = async (
    gameName: string,
    platform: string
): Promise<ApexPlayer | null> => {
    const result = await db.query(
        `SELECT * FROM summoners WHERE "gameName" = $1 AND "region" = $2 AND game_id = $3`,
        [gameName, platform, APEX_GAME_ID]
    );
    return rowToApexPlayer(result.rows[0]) ?? null;
};

export const createApexPlayer = async (data: {
    uid: string;
    gameName: string;
    platform: string;
    tier: string;
    rankDiv: number;
    rp: number;
    discordChannelId?: string | null;
}): Promise<ApexPlayer> => {
    const result = await db.query(
        `INSERT INTO summoners
            ("puuid", "gameName", "tagLine", "region", "tier", "rank", "lp", "discordChannelId", "game_id")
         VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
            data.uid,
            data.gameName,
            data.platform,
            data.tier,
            String(data.rankDiv),
            data.rp,
            data.discordChannelId ?? null,
            APEX_GAME_ID,
        ]
    );
    return rowToApexPlayer(result.rows[0])!;
};

export const updateApexPlayerRank = async (
    uid: string,
    tier: string,
    rankDiv: number,
    rp: number
): Promise<void> => {
    await db.query(
        `UPDATE summoners
         SET "tier" = $1, "rank" = $2, "lp" = $3, "lastUpdated" = NOW()
         WHERE "puuid" = $4 AND game_id = $5`,
        [tier, String(rankDiv), rp, uid, APEX_GAME_ID]
    );
};

export const deleteApexPlayer = async (
    uid: string
): Promise<ApexPlayer | null> => {
    const result = await db.query(
        `DELETE FROM summoners WHERE "puuid" = $1 AND game_id = $2 RETURNING *`,
        [uid, APEX_GAME_ID]
    );
    return rowToApexPlayer(result.rows[0]) ?? null;
};

export const searchApexPlayerNames = async (
    search: string,
    limit = 25,
    guildId?: string
): Promise<string[]> => {
    const trimmed = search.trim();
    if (guildId) {
        const query = trimmed
            ? `SELECT DISTINCT s."gameName"
               FROM summoners s
               JOIN guild_summoners gs ON gs.puuid = s.puuid
               WHERE gs.guild_id = $1 AND s."gameName" ILIKE $2 AND s.game_id = $3
               ORDER BY s."gameName" ASC LIMIT $4`
            : `SELECT DISTINCT s."gameName"
               FROM summoners s
               JOIN guild_summoners gs ON gs.puuid = s.puuid
               WHERE gs.guild_id = $1 AND s.game_id = $2
               ORDER BY s."gameName" ASC LIMIT $3`;
        const params = trimmed
            ? [guildId, `${trimmed}%`, APEX_GAME_ID, limit]
            : [guildId, APEX_GAME_ID, limit];
        const result = await db.query(query, params);
        return result.rows.map((r: { gameName: string }) => r.gameName);
    }

    const query = trimmed
        ? `SELECT DISTINCT "gameName" FROM summoners
           WHERE "gameName" ILIKE $1 AND game_id = $2
           ORDER BY "gameName" ASC LIMIT $3`
        : `SELECT DISTINCT "gameName" FROM summoners
           WHERE game_id = $1
           ORDER BY "gameName" ASC LIMIT $2`;
    const params = trimmed
        ? [`${trimmed}%`, APEX_GAME_ID, limit]
        : [APEX_GAME_ID, limit];
    const result = await db.query(query, params);
    return result.rows.map((r: { gameName: string }) => r.gameName);
};

export const getAllTrackedApexPlayers = async (): Promise<ApexPlayer[]> => {
    const result = await db.query(
        `SELECT DISTINCT s.*
         FROM summoners s
         JOIN guild_summoners gs ON gs.puuid = s.puuid
         WHERE s.game_id = $1`,
        [APEX_GAME_ID]
    );
    return result.rows.map(rowToApexPlayer).filter(Boolean) as ApexPlayer[];
};

export const getGuildsTrackingApexPlayer = async (
    uid: string
): Promise<
    Array<{ guild_id: string; channel_id: string; live_posting: boolean }>
> => {
    const result = await db.query(
        `SELECT gc.guild_id, gc.channel_id, gc.live_posting
         FROM guild_summoners gs
         JOIN guild_config gc ON gc.guild_id = gs.guild_id
         WHERE gs.puuid = $1 AND gc.channel_id IS NOT NULL`,
        [uid]
    );
    return result.rows;
};

export const isApexPlayerInGuild = async (
    guildId: string,
    uid: string
): Promise<boolean> => {
    const result = await db.query(
        `SELECT 1 FROM guild_summoners gs
         JOIN summoners s ON s.puuid = gs.puuid
         WHERE gs.guild_id = $1 AND gs.puuid = $2 AND s.game_id = $3`,
        [guildId, uid, APEX_GAME_ID]
    );
    return (result.rowCount ?? 0) > 0;
};

export const createApexRankHistory = async (
    matchId: string,
    uid: string,
    tier: string,
    div: number,
    rp: number
): Promise<void> => {
    await db.query(
        `INSERT INTO rank_tracking
            ("matchId", "entryParticipantId", "tier", "rank", "lp", "queueType", "game_id")
         VALUES ($1, $2, $3, $4, $5, 'RANKED_BATTLE_ROYALE', $6)
         ON CONFLICT ON CONSTRAINT unique_rank_tracking_participant DO NOTHING`,
        [matchId, uid, tier, String(div), rp, APEX_GAME_ID]
    );
};

export const getMostRecentApexRank = async (
    uid: string
): Promise<{ tier: string; rank: string; lp: number } | null> => {
    const result = await db.query(
        `SELECT tier, rank, lp FROM rank_tracking
         WHERE "entryParticipantId" = $1 AND game_id = $2
         ORDER BY "lastUpdated" DESC LIMIT 1`,
        [uid, APEX_GAME_ID]
    );
    return result.rows[0] ?? null;
};

export const setApexPlayerMatchId = async (
    uid: string,
    matchId: string | null
): Promise<void> => {
    await db.query(
        `UPDATE summoners SET "currentMatchId" = $1, "lastUpdated" = NOW()
         WHERE "puuid" = $2 AND game_id = $3`,
        [matchId, uid, APEX_GAME_ID]
    );
};

export const getApexPlayerCurrentMatchId = async (
    uid: string
): Promise<string | null> => {
    const result = await db.query(
        `SELECT "currentMatchId" FROM summoners WHERE "puuid" = $1 AND game_id = $2`,
        [uid, APEX_GAME_ID]
    );
    return result.rows[0]?.currentMatchId ?? null;
};

/** Extract kills, damage, and wins from a legend's data array */
export function extractLegendStats(
    legendData: ApexLegendData | undefined | null
): ApexStatSnapshot {
    const stats: ApexStatSnapshot = { kills: 0, damage: 0, wins: 0 };
    if (!legendData?.data) return stats;
    for (const entry of legendData.data) {
        const key = (entry.key ?? '').toLowerCase();
        const name = (entry.name ?? '').toLowerCase();
        if (key === 'kills' || name === 'kills') {
            stats.kills = entry.value;
        } else if (key === 'damage' || name.includes('damage')) {
            stats.damage = entry.value;
        } else if (key === 'wins' || name === 'wins') {
            stats.wins = entry.value;
        }
    }
    return stats;
}

/** True when currentMatchId indicates player is in an active (tracked) match */
export function isInActiveMatch(
    currentMatchId: string | null | undefined
): boolean {
    return (
        typeof currentMatchId === 'string' &&
        currentMatchId.startsWith(APEX_IN_GAME_PREFIX)
    );
}

/** Extract the apex_match_details.id from the stored currentMatchId */
export function extractMatchRecordId(currentMatchId: string): number {
    return parseInt(currentMatchId.replace(APEX_IN_GAME_PREFIX, ''), 10);
}

function rowToApexPlayer(row: any): ApexPlayer | null {
    if (!row) return null;
    return {
        uid: row.puuid,
        gameName: row.gameName,
        platform: row.region,
        tier: row.tier ?? 'Unranked',
        rank: row.rank ?? '0',
        rp: row.lp ?? 0,
        currentMatchId: row.currentMatchId ?? null,
        discordChannelId: row.discordChannelId ?? null,
        lastUpdated: row.lastUpdated,
    };
}
