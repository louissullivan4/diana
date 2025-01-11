const ongoingGames = new Map();

function setSummonerCurrentGame(puuid, gameId) {
  ongoingGames.set(puuid, gameId);
}

function  getSummonerCurrentGame(puuid) {
  return ongoingGames.get(puuid) || null;
}

function clearSummonerCurrentGame(puuid) {
  ongoingGames.delete(puuid);
}

module.exports = {
  setSummonerCurrentGame,
  getSummonerCurrentGame,
  clearSummonerCurrentGame
};
