const express = require("express");
const {
  createMatchDetailHandler,
  getMatchDetailsHandler,
  getMatchDetailsByMatchIdHandler,
  updateMatchDetailHandler,
  deleteMatchDetailHandler,
  createMatchTimelineHandler,
  fetchMatchTimelineHandler,
  updateMatchTimelineHandler,
  deleteMatchTimelineHandler,
} = require("../controllers/matchController");

const router = express.Router();

router.get("/:puuid", getMatchDetailsHandler);
router.get("/:matchId", getMatchDetailsByMatchIdHandler);
router.post("/", createMatchDetailHandler);
router.put("/:matchId", updateMatchDetailHandler);
router.delete("/:matchId", deleteMatchDetailHandler);

router.get("/timeline/:puuid", createMatchTimelineHandler);
router.post("/timeline/", fetchMatchTimelineHandler);
router.put("/timeline/:matchId", updateMatchTimelineHandler);
router.delete("/timeline/:matchId", deleteMatchTimelineHandler);

module.exports = router;
