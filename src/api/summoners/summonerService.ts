import { db } from '../utils/db';
import { Summoner } from '../../types';

export const getSummonerByAccountName = async (
    accountName: string,
    tagLine: string,
    region: string
) => {
    try {
        const query = `
            SELECT * FROM summoners
            WHERE "gameName" = $1 AND "tagLine" = $2 AND "region" = $3
        `;
        const params = [accountName, tagLine, region];
        const result = await db.query(query, params);
        const summoner = result.rows[0];
        if (!summoner) {
            console.info(
                `Summoner ${accountName}#${tagLine} (${region}) not found.`
            );
            return { msg: 'No summoner found' };
        }
        return summoner;
    } catch (error) {
        console.error('Error retrieving summoner details:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

export const getSummonerByPuuid = async (puuid: string) => {
    try {
        const query = `SELECT * FROM summoners WHERE "puuid" = $1`;
        const params = [puuid];
        const result = await db.query(query, params);
        const summoner = result.rows[0];
        if (!summoner) {
            console.info(`Summoner with PUUID ${puuid} not found.`);
            return { msg: 'No summoner found' };
        }
        return summoner;
    } catch (error) {
        console.error('Error retrieving summoner by PUUID:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

export const getSummonerCurrentGame = async (puuid: string) => {
    try {
        const query = `
            SELECT "currentMatchId" FROM summoners
            WHERE puuid = $1
        `;
        const params = [puuid];
        const result = await db.query(query, params);
        const matchId = result.rows[0];
        if (!matchId) {
            console.info(`Summoner with PUUID ${puuid} has no current game`);
            return {};
        }
        return matchId;
    } catch (error) {
        console.error('Error retrieving summoner by PUUID:', error);
        throw new Error('Failed to retrieve summoner details.');
    }
};

export const createSummoner = async (summonerData: Partial<Summoner>) => {
    try {
        const query = `
            INSERT INTO summoners ("puuid", "gameName", "tagLine", "region", "matchRegionPrefix", "deepLolLink", "tier", "rank", "lp", "discordChannelId", "regionGroup")
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const params = [
            summonerData.puuid,
            summonerData.gameName,
            summonerData.tagLine,
            summonerData.region,
            summonerData.matchRegionPrefix,
            summonerData.deepLolLink,
            summonerData.tier,
            summonerData.rank,
            summonerData.lp,
            summonerData.discordChannelId,
            summonerData.regionGroup,
        ];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating summoner:', error);
        throw new Error('Failed to create summoner.');
    }
};

export const updateSummonerRank = async (
    summoner: Pick<Summoner, 'tier' | 'rank' | 'lp' | 'puuid'>
) => {
    try {
        const query = `
            UPDATE summoners
            SET 
                "tier" = $1,
                "rank" = $2,
                "lp" = $3,
                "lastUpdated" = NOW()
            WHERE "puuid" = $4
            RETURNING *;
        `;
        const params = [
            summoner.tier,
            summoner.rank,
            summoner.lp,
            summoner.puuid,
        ];
        const result = await db.query(query, params);
        const updatedSummoner = result.rows[0];
        if (!updatedSummoner) {
            console.info(`Summoner with PUUID ${summoner.puuid} not found.`);
            return { msg: 'No summoner found' };
        }
        return updatedSummoner;
    } catch (error) {
        console.error('Error updating summoner rank:', error);
        throw new Error('Failed to update summoner rank.');
    }
};

export const deleteSummoner = async (puuid: string) => {
    try {
        const query = `
            DELETE FROM summoners
            WHERE "puuid" = $1
            RETURNING *;
        `;
        const params = [puuid];
        const result = await db.query(query, params);
        const deletedSummoner = result.rows[0];
        if (!deletedSummoner) {
            return { msg: 'No summoner found' };
        }
        return deletedSummoner;
    } catch (error) {
        console.error('Error deleting summoner:', error);
        throw new Error('Failed to delete summoner.');
    }
};

export const setSummonerActiveMatchIdByPuuid = async (
    puuid: string,
    matchId: string
) => {
    try {
        const query = `
            UPDATE summoners
            SET 
                "currentMatchId" = $1,
                "lastUpdated" = NOW()
            WHERE "puuid" = $2
            RETURNING *;
        `;
        const params = [matchId, puuid];
        const result = await db.query(query, params);
        const updatedSummoner = result.rows[0];
        if (!updatedSummoner) {
            return { msg: 'No summoner found' };
        }
        return updatedSummoner;
    } catch (error) {
        console.error('Error setting summoner:', error);
        throw new Error('Failed to delete summoner.');
    }
};

export async function updateSummonerMissingDataNotificationTimeByPuuid(
    summonerPuuid: string
) {
    try {
        const query = `
            UPDATE summoners
            SET "lastMissingDataNotification" = NOW()
            WHERE puuid = $1
        `;
        const params = [summonerPuuid];
        await db.query(query, params);
        console.info(
            `[Info] Updated missing data notification time for PUUID: ${summonerPuuid}`
        );
    } catch (error) {
        console.error('Error updating missing data notification time:', error);
    }
}
