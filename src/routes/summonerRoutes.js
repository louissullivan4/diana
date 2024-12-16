const express = require('express');
const { fetchSummonerData, fetchMatchIds, fetchMatchIdDetails } = require('../controllers/summonerController');
const router = express.Router();

router.get('/:accountName/:tagLine/:region', fetchSummonerData);
router.get('/matches/:puuid', fetchMatchIds);
router.get('/match/:matchId', fetchMatchIdDetails);

module.exports = router;
