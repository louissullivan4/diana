import { Router } from 'express';
import {
    getMatchDetailsHandler,
    getMatchDetailsByMatchIdHandler,
    getRecentMatchDetailsHandler,
    getMatchFiltersHandler,
    createMatchDetailHandler,
    updateMatchDetailHandler,
    deleteMatchDetailHandler,
    createMatchTimelineHandler,
    fetchMatchTimelineHandler,
    updateMatchTimelineHandler,
    deleteMatchTimelineHandler,
} from './matchController.js';

export const matchRouter = Router();

matchRouter.get('/filters', getMatchFiltersHandler);
matchRouter.get('/recent', getRecentMatchDetailsHandler);
matchRouter.get('/:puuid', getMatchDetailsHandler);
matchRouter.get('/:matchId', getMatchDetailsByMatchIdHandler);
matchRouter.post('/', createMatchDetailHandler);
matchRouter.put('/:matchId', updateMatchDetailHandler);
matchRouter.delete('/:matchId', deleteMatchDetailHandler);

matchRouter.get('/timeline/:puuid', createMatchTimelineHandler);
matchRouter.post('/timeline/', fetchMatchTimelineHandler);
matchRouter.put('/timeline/:matchId', updateMatchTimelineHandler);
matchRouter.delete('/timeline/:matchId', deleteMatchTimelineHandler);
