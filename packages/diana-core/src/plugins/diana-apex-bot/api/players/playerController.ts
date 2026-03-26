import type { Request, Response } from 'express';
import { createApexService } from '../utils/apexServiceFactory.js';
import {
    getApexPlayerByName,
    getApexPlayerByUid,
    createApexPlayer,
    deleteApexPlayer,
    searchApexPlayerNames,
} from './playerService.js';

const apexService = createApexService();

export const getPlayerHandler = async (req: Request, res: Response): Promise<void> => {
    const name = String(req.params['name'] ?? '');
    const platform = String(req.params['platform'] ?? 'PC');
    try {
        const data = await apexService.getPlayerByName(name, platform.toUpperCase());
        res.json(data);
    } catch (err: any) {
        const status = err?.status ?? 500;
        res.status(status).json({ error: err.message ?? 'Failed to fetch player.' });
    }
};

export const addPlayerHandler = async (req: Request, res: Response): Promise<void> => {
    const { gameName, platform } = req.body as { gameName?: string; platform?: string };
    if (!gameName || !platform) {
        res.status(400).json({ error: 'gameName and platform are required.' });
        return;
    }

    try {
        const bridgeData = await apexService.getPlayerByName(gameName, platform.toUpperCase());
        const { name, uid, rank } = bridgeData.global;
        const uidStr = String(uid);

        const existing = await getApexPlayerByUid(uidStr);
        if (existing) {
            res.status(409).json({ error: 'Player already tracked.', player: existing });
            return;
        }

        const player = await createApexPlayer({
            uid: uidStr,
            gameName: name,
            platform: platform.toUpperCase(),
            tier: rank.rankName,
            rankDiv: rank.rankDiv,
            rp: rank.rankScore,
        });
        res.status(201).json(player);
    } catch (err: any) {
        const status = err?.status ?? 500;
        res.status(status).json({ error: err.message ?? 'Failed to add player.' });
    }
};

export const deletePlayerHandler = async (req: Request, res: Response): Promise<void> => {
    const uid = String(req.params['uid'] ?? '');
    try {
        const deleted = await deleteApexPlayer(uid);
        if (!deleted) {
            res.status(404).json({ error: 'Player not found.' });
            return;
        }
        res.json(deleted);
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'Failed to delete player.' });
    }
};

export const searchPlayerNamesHandler = async (req: Request, res: Response): Promise<void> => {
    const search = String(req.query.search ?? '');
    const guildId = req.query.guildId ? String(req.query.guildId) : undefined;
    try {
        const names = await searchApexPlayerNames(search, 25, guildId);
        res.json(names);
    } catch (err: any) {
        res.status(500).json({ error: err.message ?? 'Failed to search players.' });
    }
};
