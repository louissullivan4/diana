import { db } from '../../../diana-league-bot/api/utils/db.js';
import {
    APEX_GAME_ID,
    type ApexMatchDetail,
    type ApexMatchResult,
} from '../../types.js';

/** Create a pending match record at the moment a match starts */
export const createApexMatchRecord = async (data: {
    player_uid: string;
    match_start: number;
    legend: string | null;
    kills_before: number;
    damage_before: number;
    wins_before: number;
    rp_before: number;
    tier_before: string;
}): Promise<ApexMatchDetail> => {
    const result = await db.query(
        `INSERT INTO apex_match_details
            (player_uid, match_start, legend, kills_before, damage_before, wins_before, rp_before, tier_before, game_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
            data.player_uid,
            data.match_start,
            data.legend,
            data.kills_before,
            data.damage_before,
            data.wins_before,
            data.rp_before,
            data.tier_before,
            APEX_GAME_ID,
        ]
    );
    return result.rows[0];
};

/** Finalise a match record when the match ends */
export const finishApexMatchRecord = async (data: {
    id: number;
    match_end: number;
    kills_after: number;
    damage_after: number;
    wins_after: number;
    rp_after: number;
    tier_after: string;
}): Promise<ApexMatchDetail | null> => {
    const result = await db.query(
        `UPDATE apex_match_details
         SET match_end   = $1,
             kills_after = $2,
             damage_after = $3,
             wins_after  = $4,
             rp_after    = $5,
             tier_after  = $6
         WHERE id = $7 AND game_id = $8
         RETURNING *`,
        [
            data.match_end,
            data.kills_after,
            data.damage_after,
            data.wins_after,
            data.rp_after,
            data.tier_after,
            data.id,
            APEX_GAME_ID,
        ]
    );
    return result.rows[0] ?? null;
};

export const getApexMatchRecord = async (
    id: number
): Promise<ApexMatchDetail | null> => {
    const result = await db.query(
        `SELECT * FROM apex_match_details WHERE id = $1`,
        [id]
    );
    return result.rows[0] ?? null;
};

/** Fetch recent completed matches for a player, most recent first */
export const getRecentApexMatches = async (
    playerUid: string,
    limit = 10
): Promise<ApexMatchResult[]> => {
    const result = await db.query(
        `SELECT * FROM apex_match_details
         WHERE player_uid = $1
           AND game_id = $2
           AND match_end IS NOT NULL
         ORDER BY match_start DESC
         LIMIT $3`,
        [playerUid, APEX_GAME_ID, limit]
    );
    return result.rows.map(toMatchResult);
};

function toMatchResult(row: any): ApexMatchResult {
    const killsGained = (row.kills_after ?? 0) - (row.kills_before ?? 0);
    const damageGained = (row.damage_after ?? 0) - (row.damage_before ?? 0);
    const winsGained = (row.wins_after ?? 0) - (row.wins_before ?? 0);
    const rpChange =
        (row.rp_after ?? row.rp_before ?? 0) - (row.rp_before ?? 0);
    const durationSecs =
        row.match_end && row.match_start
            ? Math.floor(
                  (Number(row.match_end) - Number(row.match_start)) / 1000
              )
            : 0;

    let result: 'WIN' | 'LOSS' | 'UNKNOWN' = 'UNKNOWN';
    if (row.wins_after !== null) {
        result = winsGained > 0 ? 'WIN' : 'LOSS';
    }

    return {
        ...row,
        kills_gained: killsGained,
        damage_gained: damageGained,
        wins_gained: winsGained,
        rp_change: rpChange,
        result,
        duration_secs: durationSecs,
    };
}
