const {
    createMatchDetail,
    getMatchDetailsByPuuid,
    updateMatchDetail,
    deleteMatchDetail,
} = require('../services/matchService');

const createMatchDetailHandler = async (req, res) => {
    try {
        const matchDetail = req.body;
        const createdMatch = await createMatchDetail(matchDetail);
        res.status(201).json(createdMatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match detail.' });
    }
};

const fetchMatchDetailsHandler = async (req, res) => {
    try {
        const { puuid } = req.params;
        const numberOfMatches = req.query.numberOfMatches || 20;

        if (!puuid) {
            return res.status(400).json({ error: 'Missing required parameter: puuid.' });
        }

        const matchDetails = await getMatchDetailsByPuuid(puuid, numberOfMatches);

        if (!matchDetails || matchDetails.length === 0) {
            return res.status(404).json({ error: 'No match details found.' });
        }

        res.status(200).json(matchDetails);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match details.' });
    }
};

const updateMatchDetailHandler = async (req, res) => {
    try {
        const { matchId } = req.params;
        const updatedDetails = req.body;

        const updatedMatch = await updateMatchDetail(matchId, updatedDetails);

        if (!updatedMatch) {
            return res.status(404).json({ error: 'Match detail not found.' });
        }

        res.status(200).json(updatedMatch);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update match detail.' });
    }
};

const deleteMatchDetailHandler = async (req, res) => {
    try {
        const { matchId } = req.params;

        const deletedMatch = await deleteMatchDetail(matchId);

        if (!deletedMatch) {
            return res.status(404).json({ error: 'Match detail not found.' });
        }

        res.status(200).json({ message: 'Match detail deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete match detail.' });
    }
};

module.exports = {
    createMatchDetailHandler,
    fetchMatchDetailsHandler,
    updateMatchDetailHandler,
    deleteMatchDetailHandler,
};
