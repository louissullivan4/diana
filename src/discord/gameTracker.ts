const ongoingGames = new Map();

export function setSummonerCurrentGame(puuid: string, gameId: string) {
    ongoingGames.set(puuid, gameId);
}

export function getSummonerCurrentGame(puuid: string) {
    return ongoingGames.get(puuid) || null;
}

export function clearSummonerCurrentGame(puuid: string) {
    ongoingGames.delete(puuid);
}
