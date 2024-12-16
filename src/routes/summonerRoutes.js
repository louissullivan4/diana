const express = require('express');
const { fetchSummonerData, fetchMatchIds, fetchMatchIdDetails } = require('../controllers/summonerController');
const router = express.Router();

router.get('/:accountName/:tagLine/:region', fetchSummonerData);
router.get('/:puuid/matches', fetchMatchIds);
router.get('/:matchId', fetchMatchIdDetails);

module.exports = router;
