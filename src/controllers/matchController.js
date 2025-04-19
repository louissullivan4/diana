const {
  createMatchDetail,
  getMatchDetailsByPuuid,
  getMatchDetailsByMatchId,
  updateMatchDetail,
  deleteMatchDetail,
  createMatchTimeline,
  getMatchTimeline,
  updateMatchTimeline,
  deleteMatchTimeline,
} = require("../services/matchService");

const createMatchDetailHandler = async (req, res) => {
  try {
    const matchDetail = req.body;
    const createdMatch = await createMatchDetail(matchDetail);
    res.status(201).json(createdMatch);
  } catch (error) {
    console.error(`[ERROR] ${error}`);
    res.status(500).json({ error: "Failed to create match detail." });
  }
};

const getMatchDetailsHandler = async (req, res) => {
  try {
    const { puuid } = req.params;
    const numberOfMatches = req.query.numberOfMatches || 20;

    if (!puuid) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: puuid." });
    }

    const matchDetails = await getMatchDetailsByPuuid(puuid, numberOfMatches);

    if (!matchDetails || matchDetails.length === 0) {
      return res.status(404).json({ error: "No match details found." });
    }

    res.status(200).json(matchDetails);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to fetch match details.`,
      error,
    );
    res.status(500).json({ error: "Failed to fetch match details." });
  }
};

const getMatchDetailsByMatchIdHandler = async (req, res) => {
  try {
    const { matchId } = req.params;

    if (!matchId) {
      console.log(
        `[WARN] Error Code 400 - Missing required parameter: matchId.`,
      );
      return res
        .status(400)
        .json({ error: "Missing required parameter: matchId." });
    }

    const matchDetails = await getMatchDetailsByMatchId(matchId);

    if (!matchDetails || matchDetails.length === 0) {
      console.log(`[WARN] Error Code 404 - No match details found.`);
      return res.status(404).json({ error: "No match details found." });
    }

    res.status(200).json(matchDetails);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to fetch match details.`,
      error,
    );
    res.status(500).json({ error: "Failed to fetch match details." });
  }
};

const updateMatchDetailHandler = async (req, res) => {
  try {
    const { matchId } = req.params;
    const updatedDetails = req.body;

    const updatedMatch = await updateMatchDetail(matchId, updatedDetails);

    if (!updatedMatch) {
      console.log(`[WARN] Error Code 404 - Match Details not found.`);
      return res.status(404).json({ error: "Match detail not found." });
    }

    res.status(200).json(updatedMatch);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to update match details.`,
      error,
    );
    res.status(500).json({ error: "Failed to update match detail." });
  }
};

const deleteMatchDetailHandler = async (req, res) => {
  try {
    const { matchId } = req.params;

    const deletedMatch = await deleteMatchDetail(matchId);

    if (!deletedMatch) {
      console.log(`[WARN] Error Code 404 - Match Details not found.`);
      return res.status(404).json({ error: "Match detail not found." });
    }

    res.status(200).json({ message: "Match detail deleted successfully." });
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to delete match detail.`,
      error,
    );
    res.status(500).json({ error: "Failed to delete match detail." });
  }
};

const createMatchTimelineHandler = async (req, res) => {
  try {
    const data = req.body;
    const created = await createMatchTimeline(data);
    res.status(201).json(created);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to delete match detail.`,
      error,
    );
    res.status(500).json({ error: "Failed to create match timeline." });
  }
};

const fetchMatchTimelineHandler = async (req, res) => {
  try {
    const { matchId } = req.params;
    const timeline = await getMatchTimeline(matchId);
    if (!timeline.length) {
      console.log(`[WARN] Error Code 404 - No timeline found.`);
      return res.status(404).json({ error: "No timeline found." });
    }
    res.status(200).json(timeline);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to fetch match timeline.`,
      error,
    );
    res.status(500).json({ error: "Failed to fetch match timeline." });
  }
};

const updateMatchTimelineHandler = async (req, res) => {
  try {
    const { timelineId } = req.params;
    const data = req.body;
    const updated = await updateMatchTimeline(timelineId, data);
    if (!updated) {
      console.log(`[WARN] Error Code 404 - Timeline not found.`);
      return res.status(404).json({ error: "Timeline not found." });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to update match timeline.`,
      error,
    );
    res.status(500).json({ error: "Failed to update match timeline." });
  }
};

const deleteMatchTimelineHandler = async (req, res) => {
  try {
    const { timelineId } = req.params;
    const deleted = await deleteMatchTimeline(timelineId);
    if (!deleted) {
      console.log(`[WARN] Error Code 404 - Timeline not found.`);
      return res.status(404).json({ error: "Timeline not found." });
    }
    res.status(200).json({ message: "Match timeline deleted successfully." });
  } catch (error) {
    console.log(
      `[ERROR] Error Code 500 - Failed to delete match timeline.`,
      error,
    );
    res.status(500).json({ error: "Failed to delete match timeline." });
  }
};

module.exports = {
  createMatchDetailHandler,
  getMatchDetailsHandler,
  getMatchDetailsByMatchIdHandler,
  updateMatchDetailHandler,
  deleteMatchDetailHandler,
  createMatchTimelineHandler,
  fetchMatchTimelineHandler,
  updateMatchTimelineHandler,
  deleteMatchTimelineHandler,
};
