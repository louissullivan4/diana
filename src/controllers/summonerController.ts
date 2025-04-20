import {
    createSummoner,
    deleteSummoner,
    getSummonerByAccountName,
    getSummonerByPuuid,
    updateSummonerRank,
} from '../services/summonerService';
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

export const updateSummonerRankByPuuid = async (
    req: Request,
    res: Response
) => {
    try {
        const { puuid } = req.params;
        const { tier, rank, lp } = req.body;
        if (!puuid || !tier || !rank || !lp) {
            res.status(400).json({
                error: 'Missing required parameters: puuid, tier, rank, or lp.',
            });
            return;
        }
        const summoner = await getSummonerByPuuid(puuid);
        if (!summoner || Object.keys(summoner).length === 0) {
            res.status(404).json({ error: 'Summoner not found.' });
        }
        summoner.tier = tier;
        summoner.rank = rank;
        summoner.lp = lp;
        const updatedSummonerRank = await updateSummonerRank(summoner);
        if (
            !updatedSummonerRank ||
            Object.keys(updatedSummonerRank).length === 0
        ) {
            res.status(404).json({ error: 'Summoner not updated.' });
        }
        res.status(200).json({ updatedSummonerRank });
        return;
    } catch (error) {
        console.error('Error updating summoner rank:', error);
        res.status(500).json({ error: 'Failed to update summoner data.' });
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
