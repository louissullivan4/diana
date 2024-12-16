const db = require('../models/db');
const { getMatchesByPUUID, getMatchDataById } = require('../services/riotService');

const getMatchIds = async (summoner, numberOfMatches) => {
    try {
        const { rows: existingMatches } = await db.query(
            `SELECT * FROM match_ids 
             WHERE puuid = $1 
             ORDER BY updatedAt DESC 
             LIMIT $2`,
            [summoner.puuid, numberOfMatches]
        );

        const mostRecentMatchStoredTime = existingMatches.length
            ? new Date(existingMatches[0].updatedAt).getTime()
            : 0;
        const oneHourAgo = Date.now() - 60 * 60 * 1000;

        if (mostRecentMatchStoredTime >= oneHourAgo && existingMatches.length >= numberOfMatches) {
            return existingMatches;
        }

        const matchesCall = await getMatchesByPUUID(summoner.puuid, numberOfMatches);
        if (!matchesCall || matchesCall.length === 0) {
            return existingMatches;
        }

        const currentTime = new Date();

        const updatedMatches = await Promise.all(
            matchesCall.map((matchId) =>
                db.query(
                    `INSERT INTO match_ids (match_id, puuid, updatedAt)
                     VALUES ($1, $2, $3)
                     ON CONFLICT (match_id) DO UPDATE 
                     SET updatedAt = EXCLUDED.updatedAt
                     RETURNING *`,
                    [matchId, summoner.puuid, currentTime]
                )
            )
        );

        return updatedMatches.map((result) => result.rows[0]);
    } catch (error) {
        console.error('Error in getMatchIds:', error);
        throw new Error('Failed to retrieve match IDs.');
    }
};

const getMatchDetailsById = async (matchId) => {
    // const matchDetails = {}
    return await getMatchDataById(matchId);
}

module.exports = { getMatchIds, getMatchDetailsById };
