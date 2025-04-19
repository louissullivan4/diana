// services/dataDragonService.js
const axios = require("axios");

const VERSIONS_URL = "https://ddragon.leagueoflegends.com/api/versions.json";
const CHAMPION_URL = (version) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;

let cachedLatestVersion = null;
let championDataCache = null;
let championIdMapCache = null;

const fetchLatestVersion = async () => {
  if (!cachedLatestVersion) {
    const { data: versions } = await axios.get(VERSIONS_URL);
    cachedLatestVersion = versions[0];
  }
  return cachedLatestVersion;
};

const fetchChampionData = async () => {
  if (!championDataCache) {
    const version = await fetchLatestVersion();
    const { data } = await axios.get(CHAMPION_URL(version));
    championDataCache = data.data;
  }
  return championDataCache;
};

const buildChampionIdMap = async () => {
  if (!championIdMapCache) {
    const champions = await fetchChampionData();
    championIdMapCache = Object.values(champions).reduce((acc, champ) => {
      acc[champ.key] = champ;
      return acc;
    }, {});
  }
  return championIdMapCache;
};

const getChampionInfoById = async (championId) => {
  const champIdMap = await buildChampionIdMap();
  const champion = champIdMap[String(championId)];
  if (!champion) {
    return { name: "Unknown Champion", tagString: "Unknown" };
  }
  const tagString =
    champion.tags && champion.tags.length ? champion.tags.join("/") : "Unknown";
  return { name: champion.name, tagString };
};

const getQueueNameById = (queueId) => {
  const queueMap = {
    0: "Custom Game",
    420: "Ranked Solo",
    430: "Normal Blind",
    440: "Ranked Flex",
    450: "ARAM",
    480: "Swiftplay",
    700: "Clash",
    900: "ARURF",
  };
  return queueMap[queueId] || `Unknown Queue (ID: ${queueId})`;
};

const getRoleNameTranslation = (role) => {
  const roleMap = {
    TOP: "Top",
    JUNGLE: "Jungle",
    MIDDLE: "Mid",
    BOTTOM: "ADC",
    UTILITY: "Support",
  };
  return roleMap[role] || "Unknown Role";
};

module.exports = {
  getChampionInfoById,
  getQueueNameById,
  fetchLatestVersion,
  getRoleNameTranslation,
};
