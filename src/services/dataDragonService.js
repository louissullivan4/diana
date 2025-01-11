// services/dataDragonService.js
const axios = require('axios');
const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

let cachedLatestVersion = null;
let championDataCache = null;

async function getLatestVersion() {
  if (cachedLatestVersion) {
    return cachedLatestVersion;
  }
  const { data: versions } = await axios.get(VERSIONS_URL);
  cachedLatestVersion = versions[0];
  return cachedLatestVersion;
}

async function getChampionData() {
  if (championDataCache) {
    return championDataCache;
  }

  const version = await getLatestVersion();
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const { data } = await axios.get(url);

  championDataCache = data.data;
  return championDataCache;
}

module.exports = {
  getChampionData,
};
