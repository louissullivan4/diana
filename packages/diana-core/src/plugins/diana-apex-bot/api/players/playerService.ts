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
    const result = await db.query(`SELECT * FROM apex_players WHERE uid = $1`, [
        uid,
    ]);
    return rowToApexPlayer(result.rows[0]) ?? null;
};

export const getApexPlayerByName = async (
    gameName: string,
    platform: string
): Promise<ApexPlayer | null> => {
    const result = await db.query(
        `SELECT * FROM apex_players WHERE "gameName" = $1 AND platform = $2`,
        [gameName, platform]
    );
    return rowToApexPlayer(result.rows[0]) ?? null;
};

/** Look up a player's UID by name (no platform required). Returns null if not found. */
export const getApexPlayerUidByName = async (
    gameName: string
): Promise<string | null> => {
    const result = await db.query(
        `SELECT uid FROM apex_players WHERE "gameName" = $1 LIMIT 1`,
        [gameName]
    );
    return result.rows[0]?.uid ?? null;
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
        `INSERT INTO apex_players
            (uid, "gameName", platform, tier, division, rp, "discordChannelId")
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
            data.uid,
            data.gameName,
            data.platform,
            data.tier,
            data.rankDiv,
            data.rp,
            data.discordChannelId ?? null,
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
        `UPDATE apex_players
         SET tier = $1, division = $2, rp = $3, "lastUpdated" = NOW()
         WHERE uid = $4`,
        [tier, rankDiv, rp, uid]
    );
};

export const deleteApexPlayer = async (
    uid: string
): Promise<ApexPlayer | null> => {
    const result = await db.query(
        `DELETE FROM apex_players WHERE uid = $1 RETURNING *`,
        [uid]
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
            ? `SELECT DISTINCT a."gameName"
               FROM apex_players a
               JOIN guild_apex_players gap ON gap.uid = a.uid
               WHERE gap.guild_id = $1 AND a."gameName" ILIKE $2
               ORDER BY a."gameName" ASC LIMIT $3`
            : `SELECT DISTINCT a."gameName"
               FROM apex_players a
               JOIN guild_apex_players gap ON gap.uid = a.uid
               WHERE gap.guild_id = $1
               ORDER BY a."gameName" ASC LIMIT $2`;
        const params = trimmed
            ? [guildId, `${trimmed}%`, limit]
            : [guildId, limit];
        const result = await db.query(query, params);
        return result.rows.map((r: { gameName: string }) => r.gameName);
    }

    const query = trimmed
        ? `SELECT DISTINCT "gameName" FROM apex_players
           WHERE "gameName" ILIKE $1
           ORDER BY "gameName" ASC LIMIT $2`
        : `SELECT DISTINCT "gameName" FROM apex_players
           ORDER BY "gameName" ASC LIMIT $1`;
    const params = trimmed ? [`${trimmed}%`, limit] : [limit];
    const result = await db.query(query, params);
    return result.rows.map((r: { gameName: string }) => r.gameName);
};

export const getAllTrackedApexPlayers = async (): Promise<ApexPlayer[]> => {
    const result = await db.query(
        `SELECT DISTINCT a.*
         FROM apex_players a
         JOIN guild_apex_players gap ON gap.uid = a.uid`,
        []
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
         FROM guild_apex_players gap
         JOIN guild_config gc ON gc.guild_id = gap.guild_id
         WHERE gap.uid = $1 AND gc.channel_id IS NOT NULL`,
        [uid]
    );
    return result.rows;
};

export const isApexPlayerInGuild = async (
    guildId: string,
    uid: string
): Promise<boolean> => {
    const result = await db.query(
        `SELECT 1 FROM guild_apex_players WHERE guild_id = $1 AND uid = $2`,
        [guildId, uid]
    );
    return (result.rowCount ?? 0) > 0;
};

export const addApexPlayerToGuild = async (
    guildId: string,
    uid: string,
    addedBy?: string | null
): Promise<void> => {
    await db.query(
        `INSERT INTO guild_apex_players (guild_id, uid, added_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (guild_id, uid) DO NOTHING`,
        [guildId, uid, addedBy ?? null]
    );
};

export const removeApexPlayerFromGuild = async (
    guildId: string,
    uid: string
): Promise<boolean> => {
    const result = await db.query(
        `DELETE FROM guild_apex_players WHERE guild_id = $1 AND uid = $2`,
        [guildId, uid]
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
        `UPDATE apex_players SET "currentMatchId" = $1, "lastUpdated" = NOW()
         WHERE uid = $2`,
        [matchId, uid]
    );
};

export const getApexPlayerCurrentMatchId = async (
    uid: string
): Promise<string | null> => {
    const result = await db.query(
        `SELECT "currentMatchId" FROM apex_players WHERE uid = $1`,
        [uid]
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
        uid: row.uid,
        gameName: row.gameName,
        platform: row.platform,
        tier: row.tier ?? 'Unranked',
        division: row.division ?? 0,
        rp: row.rp ?? 0,
        currentMatchId: row.currentMatchId ?? null,
        discordChannelId: row.discordChannelId ?? null,
        lastUpdated: row.lastUpdated,
    };
}
