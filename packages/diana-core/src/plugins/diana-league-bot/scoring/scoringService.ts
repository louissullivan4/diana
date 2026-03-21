import { db } from '../api/utils/db';
import type { PlayerScore } from './scoringAlgorithm';

export interface MatchScoreRow {
    sid: number;
    matchId: string;
    puuid: string;
    score: number;
    placement: number;
    role: string;
    win: boolean;
    createdAt: string;
}

/**
 * Persist scores for every participant in a match.
 *
 * Idempotent — uses ON CONFLICT DO NOTHING so calling this twice for the same
 * match (e.g. when two tracked summoners play together) is safe.
 */
export async function saveMatchScores(
    matchId: string,
    scores: PlayerScore[]
): Promise<void> {
    for (const s of scores) {
        await db.query(
            `INSERT INTO match_scores ("matchId", "puuid", "score", "placement", "role", "win")
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT ("matchId", "puuid") DO NOTHING`,
            [matchId, s.puuid, s.score, s.placement, s.role, s.win]
        );
    }
}

/** Retrieve the score row for a specific participant in a match. */
export async function getMatchScore(
    matchId: string,
    puuid: string
): Promise<MatchScoreRow | null> {
    try {
        const result = await db.query(
            `SELECT * FROM match_scores WHERE "matchId" = $1 AND "puuid" = $2`,
            [matchId, puuid]
        );
        return result.rows[0] ?? null;
    } catch (error) {
        console.error('Error retrieving match score:', error);
        return null;
    }
}

/** Retrieve all participant scores for a match, ordered by placement. */
export async function getMatchScores(
    matchId: string
): Promise<MatchScoreRow[]> {
    try {
        const result = await db.query(
            `SELECT * FROM match_scores WHERE "matchId" = $1 ORDER BY "placement" ASC`,
            [matchId]
        );
        return result.rows;
    } catch (error) {
        console.error('Error retrieving match scores:', error);
        return [];
    }
}
