const db = require('../models/db');
const { getAccountByAccountName } = require('../services/riotService');

const getSummoner = async (accountName, tagLine, region) => {
    try {
        const { rows: existingSummoner } = await db.query(
            `SELECT * FROM summoners
             WHERE name = $1 AND tagLine = $2 AND region = $3`,
            [accountName, tagLine, region]
        );

        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        if (existingSummoner.length) {
            const lastUpdated = new Date(existingSummoner[0].updatedAt).getTime();

            if (lastUpdated > twentyFourHoursAgo) {
                return existingSummoner[0];
            }
        }

        const account = await getAccountByAccountName(accountName, tagLine, region);
        if (!account || !account.puuid) {
            throw new Error('Failed to retrieve account details from Riot API');
        }

        const currentTime = new Date();
        const { rows: updatedSummoner } = await db.query(
            `INSERT INTO summoners (puuid, name, tagLine, region, updatedAt)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (puuid) DO UPDATE 
             SET name = EXCLUDED.name, tagLine = EXCLUDED.tagLine, region = EXCLUDED.region, updatedAt = EXCLUDED.updatedAt
             RETURNING *`,
            [account.puuid, account.gameName, account.tagLine, region, currentTime]
        );

        return updatedSummoner[0];
    } catch (error) {
        console.error('Error in getSummoner:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

module.exports = { getSummoner };
