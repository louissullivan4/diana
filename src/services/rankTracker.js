// services/rankTracker.js
const previousRankState = new Map();


function setPreviousRank(puuid, rankInfo) {
  previousRankState.set(puuid, rankInfo);
}

function getPreviousRank(puuid) {
  return previousRankState.get(puuid) || null;
}

function clearPreviousRank(puuid) {
  previousRankState.delete(puuid);
}

module.exports = {
  setPreviousRank,
  getPreviousRank,
  clearPreviousRank
};
