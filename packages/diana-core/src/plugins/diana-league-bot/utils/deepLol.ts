// Maps a Riot platform routing value (matchRegionPrefix, e.g. 'VN2') to the
// region slug deeplol.gg expects in its summoner URLs (e.g. 'vn'). deeplol
// uses op.gg-style slugs, not the raw platform id, so 'VN2' must become 'vn'
// and 'NA1' must become 'na' — a naive lowercase would produce broken links.
const DEEPLOL_REGION_BY_PREFIX: Record<string, string> = {
    EUW1: 'euw',
    EUN1: 'eune',
    NA1: 'na',
    LA1: 'lan',
    LA2: 'las',
    KR: 'kr',
    JP1: 'jp',
    BR1: 'br',
    TR1: 'tr',
    RU: 'ru',
    OC1: 'oce',
    SG2: 'sg',
    TW2: 'tw',
    VN2: 'vn',
    ME1: 'me',
};

const DEFAULT_DEEPLOL_REGION = 'euw';

export const getDeepLolRegion = (matchRegionPrefix?: string | null): string =>
    (matchRegionPrefix && DEEPLOL_REGION_BY_PREFIX[matchRegionPrefix]) ||
    DEFAULT_DEEPLOL_REGION;

export const buildDeepLolLink = (
    gameName: string,
    tagLine: string,
    matchRegionPrefix?: string | null
): string => {
    const region = getDeepLolRegion(matchRegionPrefix);
    return `https://www.deeplol.gg/summoner/${region}/${encodeURIComponent(
        gameName
    )}-${encodeURIComponent(tagLine)}`;
};
