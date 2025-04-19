const {
  getSummonerByAccountName,
  getSummonerByPuuid,
  createSummoner,
  updateSummonerRank,
  deleteSummoner,
} = require("../services/summonerService");

const fetchSummonerByAccountName = async (req, res) => {
  try {
    const { accountName, tagLine, region } = req.params;
    if (!accountName || !tagLine || !region) {
      return res.status(400).json({
        error: "Missing required parameters: accountName, tagLine, or region.",
      });
    }
    const summoner = await getSummonerByAccountName(
      accountName,
      tagLine,
      region,
    );
    if (!summoner || Object.keys(summoner).length === 0) {
      return res.status(404).json({ error: "Summoner not found." });
    }
    res.status(200).json({ summoner });
  } catch (error) {
    console.error("Error fetching summoner:", error);
    res.status(500).json({ error: "Failed to fetch summoner data." });
  }
};

const createSummonerHandler = async (req, res) => {
  try {
    const { gameName, tagLine, region, puuid, tier, rank, lp } = req.body;
    if (!gameName || !tagLine || !region || !puuid || !tier || !rank || !lp) {
      return res.status(400).json({ error: "Missing required fields." });
    }
    const newSummoner = await createSummoner({
      gameName,
      tagLine,
      region,
      puuid,
      tier,
      rank,
      lp,
    });
    res.status(201).json({ newSummoner });
  } catch (error) {
    console.error("Error creating summoner:", error);
    res.status(500).json({ error: "Failed to create summoner." });
  }
};

const updateSummonerRankByPuuid = async (req, res) => {
  try {
    const { puuid } = req.params;
    const { tier, rank, lp } = req.body;
    if (!puuid || !tier || !rank || !lp) {
      return res.status(400).json({
        error: "Missing required parameters: puuid, tier, rank, or lp.",
      });
    }
    const summoner = await getSummonerByPuuid(puuid);
    if (!summoner || Object.keys(summoner).length === 0) {
      return res.status(404).json({ error: "Summoner not found." });
    }
    summoner.tier = tier;
    summoner.rank = rank;
    summoner.lp = lp;
    const updatedSummonerRank = await updateSummonerRank(summoner);
    if (!updatedSummonerRank || Object.keys(updatedSummonerRank).length === 0) {
      return res.status(404).json({ error: "Summoner not updated." });
    }
    res.status(200).json({ updatedSummonerRank });
  } catch (error) {
    console.error("Error updating summoner rank:", error);
    res.status(500).json({ error: "Failed to update summoner data." });
  }
};

const deleteSummonerByPuuid = async (req, res) => {
  try {
    const { puuid } = req.params;
    if (!puuid) {
      return res
        .status(400)
        .json({ error: "Missing required parameter: puuid." });
    }
    const deletedSummoner = await deleteSummoner(puuid);
    if (!deletedSummoner || Object.keys(deletedSummoner).length === 0) {
      return res.status(404).json({ error: "Summoner not found." });
    }
    res.status(200).json({ deletedSummoner });
  } catch (error) {
    console.error("Error deleting summoner:", error);
    res.status(500).json({ error: "Failed to delete summoner." });
  }
};

module.exports = {
  fetchSummonerByAccountName,
  createSummonerHandler,
  updateSummonerRankByPuuid,
  deleteSummonerByPuuid,
};
