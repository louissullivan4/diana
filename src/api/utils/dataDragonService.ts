import axios from 'axios';
import { Role } from '../../types';

const VERSIONS_URL = 'https://ddragon.leagueoflegends.com/api/versions.json';
const CHAMPION_URL = (version: string) =>
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`;

let cachedLatestVersion: string;
let championDataCache: Record<string, any>;
let championIdMapCache: Record<string, any>;

const fetchLatestVersion = async () => {
    if (!cachedLatestVersion) {
        const { data: versions } = await axios.get(VERSIONS_URL);
        cachedLatestVersion = versions[0];
    }
    return cachedLatestVersion;
};

export const fetchChampionData = async () => {
    if (!championDataCache) {
        const version = await fetchLatestVersion();
        const { data } = await axios.get(CHAMPION_URL(version));
        championDataCache = data.data;
    }
    return championDataCache;
};

export const buildChampionIdMap = async () => {
    if (!championIdMapCache) {
        const champions = await fetchChampionData();
        championIdMapCache = Object.values(champions).reduce((acc, champ) => {
            acc[champ.key] = champ;
            return acc;
        }, {});
    }
    return championIdMapCache;
};

export const getChampionInfoById = async (championId: string) => {
    const champIdMap = await buildChampionIdMap();
    const champion = champIdMap[String(championId)];
    if (!champion) {
        return { name: 'Unknown Champion', tagString: 'Unknown' };
    }
    const tagString =
        champion.tags && champion.tags.length
            ? champion.tags.join('/')
            : 'Unknown';
    return { name: champion.name, tagString };
};

export const getQueueNameById = (queueId: number) => {
    const queueMap = new Map<number, string>([
        [0, 'Custom Game'],
        [420, 'Ranked Solo'],
        [430, 'Normal Blind'],
        [440, 'Ranked Flex'],
        [450, 'ARAM'],
        [480, 'Swiftplay'],
        [700, 'Clash'],
        [900, 'ARURF'],
    ]);
    return queueMap.get(queueId) || `Unknown Queue (ID: ${queueId})`;
};

export const getRoleNameTranslation = (role: Role) => {
    const roleMap = new Map<Role, string>([
        [Role.TOP, 'Top'],
        [Role.JUNGLE, 'Jungle'],
        [Role.MIDDLE, 'Mid'],
        [Role.BOTTOM, 'ADC'],
        [Role.UTILITY, 'Support'],
    ]);

    return roleMap.get(role) || 'Unknown Role';
};
