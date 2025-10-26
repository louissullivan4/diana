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
            WHERE "gameName" = $1 AND "tagLine" = $2 AND "matchRegionPrefix" = $3
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

export async function searchSummonerGameNames(
    search: string,
    limit = 25
): Promise<string[]> {
    try {
        const trimmedSearch = search.trim();
        const query = trimmedSearch
            ? `
                SELECT DISTINCT "gameName"
                FROM summoners
                WHERE "gameName" ILIKE $1
                ORDER BY "gameName" ASC
                LIMIT $2
            `
            : `
                SELECT DISTINCT "gameName"
                FROM summoners
                ORDER BY "gameName" ASC
                LIMIT $1
            `;

        const params = trimmedSearch ? [`${trimmedSearch}%`, limit] : [limit];

        const result = await db.query(query, params);
        return result.rows.map((row: { gameName: string }) => row.gameName);
    } catch (error) {
        console.error('Error searching summoner game names:', error);
        throw new Error('Failed to search summoner game names.');
    }
}

interface SummonerTagSuggestion {
    tagLine: string;
    matchRegionPrefix: string | null;
}

export async function searchSummonerTags(
    gameName: string | null | undefined,
    search: string,
    limit = 25
): Promise<SummonerTagSuggestion[]> {
    try {
        const trimmedSearch = search.trim();
        const trimmedName = gameName ? gameName.trim() : null;
        const conditions: string[] = ['"tagLine" IS NOT NULL'];
        const params: Array<string | number> = [];

        if (trimmedName) {
            params.push(trimmedName);
            conditions.push(`"gameName" = $${params.length}`);
        }

        if (trimmedSearch) {
            params.push(`${trimmedSearch}%`);
            conditions.push(`"tagLine" ILIKE $${params.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        params.push(limit);
        const limitIndex = params.length;

        const query = `
            SELECT DISTINCT "tagLine", "matchRegionPrefix"
            FROM summoners
            ${whereClause}
            ORDER BY "tagLine" ASC
            LIMIT $${limitIndex}
        `;

        const result = await db.query(query, params);
        return result.rows.map(
            (row: { tagLine: string; matchRegionPrefix: string | null }) => ({
                tagLine: row.tagLine,
                matchRegionPrefix: row.matchRegionPrefix,
            })
        );
    } catch (error) {
        console.error('Error searching summoner tags:', error);
        throw new Error('Failed to search summoner tags.');
    }
}

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

export const setSummonerCurrentMatchIdByPuuid = async (
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

export const fetchRankHistory = async (
    entryParticipantId: string,
    startDate?: string,
    endDate?: string,
    queueType?: string
) => {
    try {
        const conditions: string[] = ['"entryParticipantId" = $1'];
        const params: Array<string> = [entryParticipantId];

        if (startDate) {
            params.push(startDate);
            conditions.push(`"lastUpdated" >= $${params.length}`);
        }

        if (endDate) {
            params.push(endDate);
            conditions.push(`"lastUpdated" <= $${params.length}`);
        }

        if (queueType) {
            params.push(queueType);
            conditions.push(`"queueType" = $${params.length}`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const query = `
            SELECT * FROM rank_tracking
            ${whereClause}
            ORDER BY "lastUpdated" DESC
        `;

        const result = await db.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error fetching rank history:', error);
        throw new Error('Failed to fetch rank history.');
    }
};

export const getMostRecentRankByParticipantIdAndQueueType = async (
    entryParticipantId: string,
    queueType: string
): Promise<any> => {
    try {
        const query = `
            SELECT * FROM rank_tracking
            WHERE "entryParticipantId" = $1 AND "queueType" = $2
            ORDER BY "lastUpdated" DESC
            LIMIT 1
        `;
        const params = [entryParticipantId, queueType];
        const result = await db.query(query, params);
        const mostRecentRank = result.rows[0];
        if (!mostRecentRank) {
            console.info(
                `No rank history found for participant ID ${entryParticipantId} and queue type ${queueType}.`
            );
            return {
                matchId: '0',
                rid: 0,
                entryParticipantId,
                tier: 'Unranked',
                rank: 'N/A',
                lp: 0,
                queueType,
                lastUpdated: new Date().toISOString(),
            };
        }
        return mostRecentRank;
    } catch (error) {
        console.error('Error retrieving most recent rank history:', error);
        throw new Error('Failed to retrieve rank history.');
    }
};

export const createRankHistory = async (
    matchId: string,
    entryParticipantId: string,
    tier: string,
    rank: string,
    lp: number,
    queueType: string
) => {
    try {
        const query = `
            INSERT INTO rank_tracking (
                "matchId",
                "entryParticipantId",
                "tier",
                "rank",
                "lp",
                "queueType"
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const params = [matchId, entryParticipantId, tier, rank, lp, queueType];
        const result = await db.query(query, params);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating rank history:', error);
        throw new Error('Failed to create rank history.');
    }
};

export const updateRankHistory = async (
    rid: number,
    tier: string,
    rank: string,
    lp: number,
    queueType: string
) => {
    try {
        const query = `
            UPDATE rank_tracking
            SET 
                "tier" = $1,
                "rank" = $2,
                "lp" = $3,
                "queueType" = $4,
                "lastUpdated" = NOW()
            WHERE "rid" = $5
            RETURNING *;
        `;
        const params = [tier, rank, lp, queueType, rid];
        const result = await db.query(query, params);
        const updatedRankHistory = result.rows[0];
        if (!updatedRankHistory) {
            console.info(`Rank history with RID ${rid} not found.`);
            return { msg: 'No rank history found' };
        }
        return updatedRankHistory;
    } catch (error) {
        console.error('Error updating rank history:', error);
        throw new Error('Failed to update rank history.');
    }
};

export const deleteRankHistory = async (rid: number) => {
    try {
        const query = `
            DELETE FROM rank_tracking
            WHERE "rid" = $1
            RETURNING *;
        `;
        const params = [rid];
        const result = await db.query(query, params);
        const deletedRankHistory = result.rows[0];
        if (!deletedRankHistory) {
            return { msg: 'No rank history found' };
        }
        return deletedRankHistory;
    } catch (error) {
        console.error('Error deleting rank history:', error);
        throw new Error('Failed to delete rank history.');
    }
};
