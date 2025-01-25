const db = require('../models/db');

const createMatchDetail = async (matchDetail) => {
    try {
        const query = `
            INSERT INTO match_details (
                matchId, entryPlayerPuuid, gameVersion, gameCreation, 
                gameStartTime, gameEndTime, gameDuration, gameMode, 
                gameType, queueType, mapName, participants, teams, lastUpdated
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
            )
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
            matchDetail.mapName,
            matchDetail.participants,
            matchDetail.teams,
        ];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating match detail:', error);
        throw new Error('Failed to create match detail.');
    }
};

const getMatchDetailsByPuuid = async (puuid, numberOfMatches = 20) => {
    try {
        const query = `
            SELECT * 
            FROM match_details
            WHERE entryPlayerPuuid = $1
            ORDER BY gameCreation DESC
            LIMIT $2;
        `;
        const params = [puuid, numberOfMatches];
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error retrieving match details by PUUID:', error);
        throw new Error('Failed to retrieve match details.');
    }
};

const getMatchDetailsByMatchId = async (matchId) => {
    try {
        const query = `
            SELECT * 
            FROM match_details
            WHERE matchId = $1
        `;
        const params = [matchId];
        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error retrieving match details by matchID:', error);
        throw new Error('Failed to retrieve match details.');
    }
};


const updateMatchDetail = async (matchId, updatedDetails) => {
    try {
        const query = `
            UPDATE match_details
            SET 
                gameVersion = $1,
                gameCreation = $2,
                gameStartTime = $3,
                gameEndTime = $4,
                gameDuration = $5,
                gameMode = $6,
                gameType = $7,
                queueType = $8,
                mapName = $9,
                participants = $10,
                teams = $11,
                lastUpdated = NOW()
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

const deleteMatchDetail = async (matchId) => {
    try {
        const query = `
            DELETE FROM match_details
            WHERE matchId = $1
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

const createMatchTimeline = async (data) => {
    const query = `
        INSERT INTO match_timeline (
            matchId, timelineData, createdAt
        ) VALUES ($1, $2, NOW())
        RETURNING *
    `
    const params = [
        data.matchId,
        data.timelineData
    ]
    const result = await db.query(query, params)
    return result.rows[0]
}

const getMatchTimeline = async (matchId) => {
    const query = `
        SELECT *
        FROM match_timeline
        WHERE matchId = $1
    `
    const params = [matchId]
    const result = await db.query(query, params)
    return result.rows
}

const updateMatchTimeline = async (timelineId, data) => {
    const query = `
        UPDATE match_timeline
        SET matchId = $1,
            timelineData = $2,
            updatedAt = NOW()
        WHERE id = $3
        RETURNING *
    `
    const params = [
        data.matchId,
        data.timelineData,
        timelineId
    ]
    const result = await db.query(query, params)
    return result.rows[0]
}

const deleteMatchTimeline = async (timelineId) => {
    const query = `
        DELETE FROM match_timeline
        WHERE id = $1
        RETURNING *
    `
    const params = [timelineId]
    const result = await db.query(query, params)
    return result.rows[0]
}

module.exports = {
    createMatchDetail,
    getMatchDetailsByPuuid,
    getMatchDetailsByMatchId,
    updateMatchDetail,
    deleteMatchDetail,
    createMatchTimeline,
    getMatchTimeline,
    updateMatchTimeline,
    deleteMatchTimeline
};
