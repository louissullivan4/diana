// services/dataDragonService.js
const axios = require('axios');
const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';

async function getLatestVersion() {
  let cachedLatestVersion = null;
  if (cachedLatestVersion) {
    return cachedLatestVersion;
  }
  const { data: versions } = await axios.get(VERSIONS_URL);
  cachedLatestVersion = versions[0];
  return cachedLatestVersion;
}

async function getChampionData() {
  let championDataCache = null;
  if (championDataCache) {
    return championDataCache;
  }

  const version = await getLatestVersion();
  const url = `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;
  const { data } = await axios.get(url);

  championDataCache = data.data;
  return championDataCache;
}

async function loadChampionIdMap() {
  let championIdMapCache = null;
  if (!championIdMapCache) {
    const allChampData = await getChampionData(); 

    championIdMapCache = {};
    Object.keys(allChampData).forEach(champName => {
      const championInfo = allChampData[champName];
      championIdMapCache[championInfo.key] = championInfo;
    });
  }
  return championIdMapCache;
}

async function getChampionInfoById(championId) {
  const champIdMap = await loadChampionIdMap();
  const championInfo = champIdMap[String(championId)];

  if (!championInfo) {
    return {
      name: 'Unknown Champion',
      tagString: 'Unknown',
    };
  }

  const { name, tags } = championInfo;
  const tagString = Array.isArray(tags) && tags.length > 0 
    ? tags.join('/')
    : 'Unknown';

  return {
    name,
    tagString,
  };
}

function getQueueNameById(queueId) {
  const queueMap = {
    0: 'Custom Game',
    420: 'Ranked Solo',
    430: 'Normal Blind',
    440: 'Ranked Flex',
    450: 'ARAM',
    700: 'Clash',
  };
  return queueMap[queueId] || `Unknown Queue (ID: ${queueId})`;
}

module.exports = {
  getChampionInfoById,
  getQueueNameById
};
