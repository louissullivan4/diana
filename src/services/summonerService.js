const db = require('../models/db');

const getSummonerByAccountName = async (accountName, tagLine, region) => {
    try {
        const query = `
            SELECT * FROM summoners
            WHERE gameName = $1 AND tagLine = $2 AND region = $3
        `;
        const params = [accountName, tagLine, region];
        const result = await db.query(query, params);
        const summoner = result.rows[0];
        if (!summoner) {
            console.info(`Summoner ${accountName}#${tagLine} (${region}) not found.`);
            return { msg: "No summoner found" };
        }
        return summoner;
    } catch (error) {
        console.error('Error retrieving summoner details:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

const getSummonerByPuuid = async (puuid) => {
    try {
        const query = `
            SELECT * FROM summoners
            WHERE puuid = $1
        `;
        const params = [puuid];
        const result = await db.query(query, params);
        const summoner = result.rows[0];
        if (!summoner) {
            console.info(`Summoner with PUUID ${puuid} not found.`);
            return { msg: "No summoner found" };
        }
        return summoner;
    } catch (error) {
        console.error('Error retrieving summoner by PUUID:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

const createSummoner = async (summonerData) => {
    try {
        const query = `
            INSERT INTO summoners (gameName, tagLine, region, puuid, tier, rank, lp, lastUpdated)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING *;
        `;
        const params = [
            summonerData.gameName,
            summonerData.tagLine,
            summonerData.region,
            summonerData.puuid,
            summonerData.tier,
            summonerData.rank,
            summonerData.lp
        ];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating summoner:', error);
        throw new Error('Failed to create summoner.');
    }
};

const updateSummonerRank = async (summoner) => {
    try {
        const query = `
            UPDATE summoners
            SET 
                tier = $1,
                rank = $2,
                lp = $3,
                lastUpdated = NOW()
            WHERE puuid = $4
            RETURNING *;
        `;
        const params = [summoner.tier, summoner.rank, summoner.lp, summoner.puuid];
        const result = await db.query(query, params);
        const updatedSummoner = result.rows[0];
        if (!updatedSummoner) {
            console.info(`Summoner with PUUID ${summoner.puuid} not found.`);
            return { msg: "No summoner found" };
        }
        return updatedSummoner;
    } catch (error) {
        console.error('Error updating summoner rank:', error);
        throw new Error('Failed to update summoner rank.');
    }
};

const deleteSummoner = async (puuid) => {
    try {
        const query = `
            DELETE FROM summoners
            WHERE puuid = $1
            RETURNING *;
        `;
        const params = [puuid];
        const result = await db.query(query, params);
        const deletedSummoner = result.rows[0];
        if (!deletedSummoner) {
            return { msg: "No summoner found" };
        }
        return deletedSummoner;
    } catch (error) {
        console.error('Error deleting summoner:', error);
        throw new Error('Failed to delete summoner.');
    }
};

module.exports = { getSummonerByAccountName, getSummonerByPuuid, createSummoner, updateSummonerRank, deleteSummoner };
