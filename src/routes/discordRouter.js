const express = require('express');
const router = express.Router();
const { notifyMatchStart, notifyMatchEnd } = require('../controllers/discordController');

router.post('/start', notifyMatchStart);

router.post('/end', notifyMatchEnd);

module.exports = router;
