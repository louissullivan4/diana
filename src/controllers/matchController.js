const {
    createMatchDetail,
    getMatchDetailsByPuuid,
    getMatchDetailsByMatchId,
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

const getMatchDetailsHandler = async (req, res) => {
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

const getMatchDetailsByMatchIdHandler = async (req, res) => {
    try {
        const { matchId } = req.params;

        if (!matchId) {
            return res.status(400).json({ error: 'Missing required parameter: matchId.' });
        }

        const matchDetails = await getMatchDetailsByMatchId(puuid);

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

const createMatchTimelineHandler = async (req, res) => {
    try {
        const data = req.body
        const created = await createMatchTimeline(data)
        res.status(201).json(created)
    } catch (error) {
        res.status(500).json({ error: 'Failed to create match timeline.' })
    }
}

const fetchMatchTimelineHandler = async (req, res) => {
    try {
        const { matchId } = req.params
        const timeline = await getMatchTimeline(matchId)
        if (!timeline.length) {
            return res.status(404).json({ error: 'No timeline found.' })
        }
        res.status(200).json(timeline)
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch match timeline.' })
    }
}

const updateMatchTimelineHandler = async (req, res) => {
    try {
        const { timelineId } = req.params
        const data = req.body
        const updated = await updateMatchTimeline(timelineId, data)
        if (!updated) {
            return res.status(404).json({ error: 'Timeline not found.' })
        }
        res.status(200).json(updated)
    } catch (error) {
        res.status(500).json({ error: 'Failed to update match timeline.' })
    }
}

const deleteMatchTimelineHandler = async (req, res) => {
    try {
        const { timelineId } = req.params
        const deleted = await deleteMatchTimeline(timelineId)
        if (!deleted) {
            return res.status(404).json({ error: 'Timeline not found.' })
        }
        res.status(200).json({ message: 'Match timeline deleted successfully.' })
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete match timeline.' })
    }
}

module.exports = {
    createMatchDetailHandler,
    getMatchDetailsHandler,
    getMatchDetailsByMatchIdHandler,
    updateMatchDetailHandler,
    deleteMatchDetailHandler,
    createMatchTimelineHandler,
    fetchMatchTimelineHandler,
    updateMatchTimelineHandler,
    deleteMatchTimelineHandler
};
