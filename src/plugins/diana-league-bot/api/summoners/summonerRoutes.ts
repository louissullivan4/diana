import express from 'express';
import {
    fetchSummonerByAccountName,
    createSummonerHandler,
    deleteSummonerByPuuid,
    fetchRankHistoryByParticipantId,
    createRankHistoryHandler,
    updateRankHistoryByRid,
    deleteRankHistoryByRid,
} from './summonerController';

export const summonerRouter = express.Router();

summonerRouter.get(
    '/:accountName/:tagLine/:region',
    fetchSummonerByAccountName
);
summonerRouter.post('/', createSummonerHandler);
summonerRouter.delete('/:puuid', deleteSummonerByPuuid);

summonerRouter.get(
    '/rank-history/:entryParticipantId',
    fetchRankHistoryByParticipantId
);
summonerRouter.post('/rank-history', createRankHistoryHandler);
summonerRouter.put('/rank-history/:rid', updateRankHistoryByRid);
summonerRouter.delete('/rank-history/:rid', deleteRankHistoryByRid);
