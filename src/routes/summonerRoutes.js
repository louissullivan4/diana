const express = require("express");
const {
  fetchSummonerByAccountName,
  createSummonerHandler,
  updateSummonerRankByPuuid,
  deleteSummonerByPuuid,
} = require("../controllers/summonerController");
const router = express.Router();

router.get("/:accountName/:tagLine/:region", fetchSummonerByAccountName);
router.post("/", createSummonerHandler);
router.put("/:puuid", updateSummonerRankByPuuid);
router.delete("/:puuid", deleteSummonerByPuuid);

module.exports = router;
