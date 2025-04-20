import { Router } from 'express';
import {
    getMatchDetailsHandler,
    getMatchDetailsByMatchIdHandler,
    createMatchDetailHandler,
    updateMatchDetailHandler,
    deleteMatchDetailHandler,
    createMatchTimelineHandler,
    fetchMatchTimelineHandler,
    updateMatchTimelineHandler,
    deleteMatchTimelineHandler,
} from '../controllers/matchController';

export const matchRouter = Router();

matchRouter.get('/:puuid', getMatchDetailsHandler);
matchRouter.get('/:matchId', getMatchDetailsByMatchIdHandler);
matchRouter.post('/', createMatchDetailHandler);
matchRouter.put('/:matchId', updateMatchDetailHandler);
matchRouter.delete('/:matchId', deleteMatchDetailHandler);

matchRouter.get('/timeline/:puuid', createMatchTimelineHandler);
matchRouter.post('/timeline/', fetchMatchTimelineHandler);
matchRouter.put('/timeline/:matchId', updateMatchTimelineHandler);
matchRouter.delete('/timeline/:matchId', deleteMatchTimelineHandler);
