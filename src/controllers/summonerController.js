const { getSummoner } = require('../services/summonerService');
const { getMatchIds, getMatchDetailsById } = require('../services/matchService');

const fetchSummonerData = async (req, res) => {
    try {
        const { accountName, tagLine, region } = req.params;

        if (!accountName || !tagLine || !region) {
            return res.status(400).json({ error: 'Missing required parameters: accountName, tagLine, or region.' });
        }

        const summoner = await getSummoner(accountName, tagLine, region);

        if (!summoner || Object.keys(summoner).length === 0) {
            return res.status(404).json({ error: 'Summoner not found.' });
        }

        res.status(200).json({ summoner });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch summoner data.' });
    }
};

const fetchMatchIds = async (req, res) => {
    try {
        const { puuid } = req.params;
        console.log(puuid)
        const { numberOfMatches } = req.query || 20;

        if (!puuid ) {
            return res.status(400).json({
                error: 'Missing required parameters: puuid.',
            });
        }

        const matchIds = await getMatchIds(puuid, numberOfMatches);
        if (!matchIds || matchIds.length === 0) {
            return res.status(404).json({ error: 'No match IDs found for the summoner.' });
        }

        res.status(200).json({ matchIds });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match IDs.' });
    }
};

const fetchMatchIdDetails = async (req, res) => {
    try {
        const { matchId } = req.params;

        if ( !matchId ) {
            return res.status(400).json({
                error: 'Missing required parameters: matchId',
            });
        }

        const match = await getMatchDetailsById(matchId)
        res.status(200).json({ match });
    } catch (error) {
        console.error('Error fetching match details:');
    }
};


module.exports = { fetchSummonerData, fetchMatchIds, fetchMatchIdDetails };
