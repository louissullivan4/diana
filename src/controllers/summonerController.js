const { getSummonerByAccountName, getSummonerByPuuid } = require('../services/summonerService');

const fetchSummonerByAccountName = async (req, res) => {
    try {
        const { accountName, tagLine, region } = req.params;
        if (!accountName || !tagLine || !region) {
            return res.status(400).json({ error: 'Missing required parameters: accountName, tagLine, or region.' });
        }
        const summoner = await getSummonerByAccountName(accountName, tagLine, region);
        if (!summoner || Object.keys(summoner).length === 0) {
            return res.status(404).json({ error: 'Summoner not found.' });
        }
        res.status(200).json({ summoner });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch summoner data.' });
    }
};

const updateSummonerRankByPuuid = async (req, res) => {
    try {
        const { puuid } = req.params;
        const { tier, rank, lp } = req.body;

        if (!puuid || !tier || !rank || !lp) {
            return res.status(400).json({ error: 'Missing required parameters: puuid, tier, rank, or lp.' });
        }
        const summoner = await getSummonerByPuuid(puuid);
        if (!summoner || Object.keys(summoner).length === 0) {
            return res.status(404).json({ error: 'Summoner not found.' });
        }

        const updatedSummonerRank = await updateSummonerRank(summoner);
        if (!updatedSummonerRank || Object.keys(updatedSummonerRank).length === 0) {
            return res.status(404).json({ error: 'Summoner not updated.' });
        }

        res.status(200).json({ updatedSummonerRank });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update summoner data.' });
    }
};

module.exports = { 
    fetchSummonerByAccountName, 
    updateSummonerRankByPuuid
};
