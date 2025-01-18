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

module.exports = { getSummonerByAccountName, getSummonerByPuuid, updateSummonerRank };
