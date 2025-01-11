// services/championLookup.js
const { getChampionData } = require('./dataDragonService');
let championIdMapCache = null;

async function loadChampionIdMap() {
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

module.exports = {
  getChampionInfoById,
};
