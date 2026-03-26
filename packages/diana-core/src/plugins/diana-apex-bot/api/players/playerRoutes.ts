import { Router } from 'express';
import {
    getPlayerHandler,
    addPlayerHandler,
    deletePlayerHandler,
    searchPlayerNamesHandler,
} from './playerController.js';

export const playerRouter = Router();

/** GET /apex/players/search?search=NAME&guildId=GUILD */
playerRouter.get('/search', searchPlayerNamesHandler);

/** GET /apex/players/:name/:platform */
playerRouter.get('/:name/:platform', getPlayerHandler);

/** POST /apex/players - body: { gameName, platform } */
playerRouter.post('/', addPlayerHandler);

/** DELETE /apex/players/:uid */
playerRouter.delete('/:uid', deletePlayerHandler);
