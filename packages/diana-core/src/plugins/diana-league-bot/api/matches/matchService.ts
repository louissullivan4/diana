import { db } from '../utils/db.js';

interface MatchDetail {
    gameVersion: string;
    gameCreation: number;
    gameStartTime: number;
    gameEndTime: number;
    gameDuration: number;
    gameMode: string;
    gameType: string;
    queueId: number;
    queueType: string;
    mapName: number;
    participants: string;
    teams: string;
    matchId: string;
    entryPlayerPuuid: string;
}

export const createMatchDetail = async (
    matchDetail: Partial<MatchDetail>
): Promise<MatchDetail | null> => {
    try {
        const query = `
            INSERT INTO match_details (
                "matchId", "entryPlayerPuuid", "gameVersion", "gameCreation", 
                "gameStartTime", "gameEndTime", "gameDuration", "gameMode", 
                "gameType", "queueType", "queueId", "mapName", "participants", "teams", "lastUpdated"
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
            )
            ON CONFLICT ("matchId", "entryPlayerPuuid") DO NOTHING
            RETURNING *;
        `;
        const params = [
            matchDetail.matchId,
            matchDetail.entryPlayerPuuid,
            matchDetail.gameVersion,
            matchDetail.gameCreation,
            matchDetail.gameStartTime,
            matchDetail.gameEndTime,
            matchDetail.gameDuration,
            matchDetail.gameMode,
            matchDetail.gameType,
            matchDetail.queueType,
            matchDetail.queueId,
            matchDetail.mapName,
            matchDetail.participants,
            matchDetail.teams,
        ];
        const result = await db.query(query, params);
        return result.rows[0] ?? null;
    } catch (error: any) {
        console.error('Error creating match detail:', error);
        throw new Error('Failed to create match detail.');
    }
};

export const getMatchDetailsByPuuid = async (
    puuid: string,
    numberOfMatches = 20
) => {
    try {
        const query = `
            SELECT * 
            FROM match_details
            WHERE "entryPlayerPuuid" = $1
            ORDER BY "gameCreation" DESC
            LIMIT $2;
        `;
        const params = [puuid, numberOfMatches.toString()];
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error retrieving match details by PUUID:', error);
        throw new Error('Failed to retrieve match details.');
    }
};

export const getMatchDetailsByMatchId = async (matchId: string) => {
    try {
        const query = `
            SELECT * 
            FROM match_details
            WHERE "matchId" = $1
        `;
        const params = [matchId];
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error retrieving match details by matchID:', error);
        throw new Error('Failed to retrieve match details.');
    }
};

export const listRecentMatchDetails = async (
    limit = 20,
    offset = 0,
    filters?: {
        entryPlayerPuuid?: string;
        queueId?: number;
        result?: 'Win' | 'Lose' | 'Remake';
    }
) => {
    try {
        const params: any[] = [];
        let whereClause = 'WHERE 1=1';
        if (filters?.entryPlayerPuuid) {
            params.push(filters.entryPlayerPuuid);
            whereClause += ` AND md."entryPlayerPuuid" = $${params.length}`;
        }
        if (typeof filters?.queueId === 'number') {
            params.push(filters.queueId);
            whereClause += ` AND md."queueId" = $${params.length}`;
        }
        if (filters?.result) {
            params.push(filters.result);
            whereClause += ` AND (CASE 
                WHEN md."gameDuration" < 300 THEN 'Remake'
                WHEN (p.entryParticipant->>'win')::boolean THEN 'Win'
                ELSE 'Lose'
            END) = $${params.length}`;
        }
        params.push(limit, offset);

        const query = `
            SELECT
                md.*,
                p.entryParticipant,
                CASE 
                    WHEN md."gameDuration" < 300 THEN 'Remake'
                    WHEN (p.entryParticipant->>'win')::boolean THEN 'Win'
                    ELSE 'Lose'
                END AS match_result
            FROM match_details md
            LEFT JOIN LATERAL (
                SELECT elem AS entryParticipant
                FROM jsonb_array_elements(md."participants") elem
                WHERE elem->>'puuid' = md."entryPlayerPuuid"
                LIMIT 1
            ) p ON true
            ${whereClause}
            ORDER BY md."gameCreation" DESC
            LIMIT $${params.length - 1}
            OFFSET $${params.length};
        `;
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error retrieving recent match details:', error);
        throw new Error('Failed to retrieve recent match details.');
    }
};

export const listMatchFilterOptions = async () => {
    try {
        const playersResult = await db.query(
            `SELECT "puuid", "gameName", "tagLine"
             FROM summoners
             ORDER BY "gameName" ASC`,
            []
        );
        const matchTypeResult = await db.query(
            `SELECT DISTINCT "queueId"
             FROM match_details
             ORDER BY "queueId" ASC`,
            []
        );
        return {
            players: playersResult.rows,
            queueIds: matchTypeResult.rows.map((r: any) => r.queueId),
        };
    } catch (error) {
        console.error('Error retrieving match filters:', error);
        throw new Error('Failed to retrieve match filters.');
    }
};

export const getRankForMatch = async (
    matchId: string,
    entryParticipantId: string
) => {
    try {
        const query = `
            SELECT "tier", "rank", "lp", "queueType"
            FROM rank_tracking
            WHERE "matchId" = $1 AND "entryParticipantId" = $2
            LIMIT 1;
        `;
        const params = [matchId, entryParticipantId];
        const result = await db.query(query, params);
        return result.rows[0] ?? null;
    } catch (error) {
        console.error('Error retrieving rank for match:', error);
        return null;
    }
};

export const getPreviousRankForMatch = async (
    entryParticipantId: string,
    queueType: string,
    matchId: string
) => {
    try {
        const query = `
            SELECT "tier", "rank", "lp", "matchId", "lastUpdated"
            FROM rank_tracking
            WHERE "entryParticipantId" = $1 AND "queueType" = $2
            ORDER BY "lastUpdated" DESC
            LIMIT 2;
        `;
        const params = [entryParticipantId, queueType];
        const result = await db.query(query, params);
        if (!result.rows.length) return null;
        const [latest, previous] = result.rows;
        if (latest?.matchId === matchId) {
            return previous ?? null;
        }
        return latest ?? null;
    } catch (error) {
        console.error('Error retrieving previous rank for match:', error);
        return null;
    }
};

export const updateMatchDetail = async (
    matchId: string,
    updatedDetails: MatchDetail
) => {
    try {
        const query = `
            UPDATE match_details
            SET 
                "gameVersion" = $1,
                "gameCreation" = $2,
                "gameStartTime" = $3,
                "gameEndTime" = $4,
                "gameDuration" = $5,
                "gameMode" = $6,
                "gameType" = $7,
                "queueType" = $8,
                "mapName" = $9,
                "participants" = $10,
                "teams" = $11,
                "lastUpdated" = NOW()
            WHERE matchId = $12
            RETURNING *;
        `;
        const params = [
            updatedDetails.gameVersion,
            updatedDetails.gameCreation,
            updatedDetails.gameStartTime,
            updatedDetails.gameEndTime,
            updatedDetails.gameDuration,
            updatedDetails.gameMode,
            updatedDetails.gameType,
            updatedDetails.queueType,
            updatedDetails.mapName,
            updatedDetails.participants,
            updatedDetails.teams,
            matchId,
        ];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error updating match detail:', error);
        throw new Error('Failed to update match detail.');
    }
};

export const deleteMatchDetail = async (matchId: string) => {
    try {
        const query = `
            DELETE FROM match_details
            WHERE "matchId" = $1
            RETURNING *;
        `;
        const params = [matchId];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error deleting match detail:', error);
        throw new Error('Failed to delete match detail.');
    }
};

interface MatchTimelineData {
    [key: string]: string;
}
export const createMatchTimeline = async (data: MatchTimelineData) => {
    const query = `
        INSERT INTO match_timeline (
            "matchId", "timelineData", "createdAt"
        ) VALUES ($1, $2, NOW())
        RETURNING *
    `;
    const params = [data.matchId, data.timelineData];
    const result = await db.query(query, params);
    return result.rows[0];
};

export const getMatchTimeline = async (matchId: string) => {
    const query = `
        SELECT *
        FROM match_timeline
        WHERE "matchId" = $1
    `;
    const params = [matchId];
    const result = await db.query(query, params);
    return result.rows;
};

export const updateMatchTimeline = async (
    timelineId: string,
    data: MatchTimelineData
) => {
    const query = `
        UPDATE match_timeline
        SET "matchId" = $1,
            "timelineData" = $2,
            "updatedAt" = NOW()
        WHERE "id" = $3
        RETURNING *
    `;
    const params = [data.matchId, data.timelineData, timelineId];
    const result = await db.query(query, params);
    return result.rows[0];
};

export const deleteMatchTimeline = async (timelineId: string) => {
    const query = `
        DELETE FROM match_timeline
        WHERE "id" = $1
        RETURNING *
    `;
    const params = [timelineId];
    const result = await db.query(query, params);
    return result.rows[0];
};
