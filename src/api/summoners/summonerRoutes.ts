import express from 'express';
import {
    fetchSummonerByAccountName,
    createSummonerHandler,
    updateSummonerRankByPuuid,
    deleteSummonerByPuuid,
} from './summonerController';

export const summonerRouter = express.Router();

summonerRouter.get(
    '/:accountName/:tagLine/:region',
    fetchSummonerByAccountName
);
summonerRouter.post('/', createSummonerHandler);
summonerRouter.put('/:puuid', updateSummonerRankByPuuid);
summonerRouter.delete('/:puuid', deleteSummonerByPuuid);
