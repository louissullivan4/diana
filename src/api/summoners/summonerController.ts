import {
    createSummoner,
    deleteSummoner,
    getSummonerByAccountName,
    fetchRankHistory,
    createRankHistory,
    updateRankHistory,
    deleteRankHistory,
} from './summonerService';
import { Request, Response } from 'express';

export const fetchSummonerByAccountName = async (
    req: Request,
    res: Response
) => {
    try {
        const { accountName, tagLine, region } = req.params;
        if (!accountName || !tagLine || !region) {
            res.status(400).json({
                error: 'Missing required parameters: accountName, tagLine, or region.',
            });
        }
        const summoner = await getSummonerByAccountName(
            accountName,
            tagLine,
            region
        );
        if (!summoner || Object.keys(summoner).length === 0) {
            res.status(404).json({ error: 'Summoner not found.' });
        }
        res.status(200).json({ summoner });
    } catch (error) {
        console.error('Error fetching summoner:', error);
        res.status(500).json({ error: 'Failed to fetch summoner data.' });
    }
};

export const createSummonerHandler = async (req: Request, res: Response) => {
    try {
        const { gameName, tagLine, region, puuid, tier, rank, lp } = req.body;
        if (
            !gameName ||
            !tagLine ||
            !region ||
            !puuid ||
            !tier ||
            !rank ||
            !lp
        ) {
            res.status(400).json({ error: 'Missing required fields.' });
            return;
        }
        const newSummoner = await createSummoner({
            gameName,
            tagLine,
            region,
            puuid,
            tier,
            rank,
            lp,
        });
        res.status(201).json({ newSummoner });
    } catch (error) {
        console.error('Error creating summoner:', error);
        res.status(500).json({ error: 'Failed to create summoner.' });
        return;
    }
};

export const deleteSummonerByPuuid = async (req: Request, res: Response) => {
    try {
        const { puuid } = req.params;
        if (!puuid) {
            res.status(400).json({
                error: 'Missing required parameter: puuid.',
            });
            return;
        }
        const deletedSummoner = await deleteSummoner(puuid);
        if (!deletedSummoner || Object.keys(deletedSummoner).length === 0) {
            res.status(404).json({ error: 'Summoner not found.' });
            return;
        }
        res.status(200).json({ deletedSummoner });
        return;
    } catch (error) {
        console.error('Error deleting summoner:', error);
        res.status(500).json({ error: 'Failed to delete summoner.' });
        return;
    }
};

export const fetchRankHistoryByParticipantId = async (
    req: Request,
    res: Response
) => {
    try {
        const { entryParticipantId } = req.params;
        const { startDate, endDate, queueType } = req.query;
        if (!entryParticipantId) {
            res.status(400).json({
                error: 'Missing required parameter: entryParticipantId (puuid).',
            });
            return;
        }
        const rankHistory = await fetchRankHistory(
            entryParticipantId,
            startDate as string,
            endDate as string,
            queueType as string
        );
        if (!rankHistory || rankHistory.length === 0) {
            res.status(404).json({ error: 'No rank history found.' });
            return;
        }
        res.status(200).json({ rankHistory });
        return;
    } catch (error) {
        console.error('Error fetching rank history:', error);
        res.status(500).json({ error: 'Failed to fetch rank history.' });
    }
};

export const createRankHistoryHandler = async (req: Request, res: Response) => {
    try {
        const { matchId, entryParticipantId, tier, rank, lp, queueType } =
            req.body;
        if (
            !matchId ||
            !entryParticipantId ||
            !tier ||
            !rank ||
            lp === undefined ||
            !queueType
        ) {
            res.status(400).json({ error: 'Missing required fields.' });
            return;
        }
        const newRankHistory = await createRankHistory(
            matchId,
            entryParticipantId,
            tier,
            rank,
            lp,
            queueType
        );
        res.status(201).json({ newRankHistory });
    } catch (error) {
        console.error('Error creating rank history:', error);
        res.status(500).json({ error: 'Failed to create rank history.' });
        return;
    }
};

export const updateRankHistoryByRid = async (req: Request, res: Response) => {
    try {
        const { rid } = req.params;
        const { tier, rank, lp, queueType } = req.body;
        if (!rid || !tier || !rank || lp === undefined || !queueType) {
            res.status(400).json({ error: 'Missing required fields.' });
            return;
        }
        const updatedRankHistory = await updateRankHistory(
            parseInt(rid),
            tier,
            rank,
            lp,
            queueType
        );
        res.status(200).json({ updatedRankHistory });
    } catch (error) {
        console.error('Error updating rank history:', error);
        res.status(500).json({ error: 'Failed to update rank history.' });
        return;
    }
};

export const deleteRankHistoryByRid = async (req: Request, res: Response) => {
    try {
        const { rid } = req.params;
        if (!rid) {
            res.status(400).json({ error: 'Missing required parameter: rid.' });
            return;
        }
        const deletedRankHistory = await deleteRankHistory(parseInt(rid));
        res.status(200).json({ deletedRankHistory });
    } catch (error) {
        console.error('Error deleting rank history:', error);
        res.status(500).json({ error: 'Failed to delete rank history.' });
        return;
    }
};
