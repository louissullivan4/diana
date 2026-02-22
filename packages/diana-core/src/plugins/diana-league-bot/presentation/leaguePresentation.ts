export const rankColors = new Map<string, number>([
    ['UNRANKED', 0x95a5a6],
    ['IRON', 0x7f8c8d],
    ['BRONZE', 0xcd7f32],
    ['SILVER', 0xc0c0c0],
    ['GOLD', 0xffd700],
    ['PLATINUM', 0x40e0d0],
    ['EMERALD', 0x50c878],
    ['DIAMOND', 0xb9f2ff],
    ['MASTER', 0x800080],
    ['GRANDMASTER', 0x8b0000],
    ['CHALLENGER', 0x1e90ff],
]);

export function getRankedEmblem(tier: string) {
    if (!tier) return null;
    const sanitized = tier.replace(/\s+/g, '').toString().toLowerCase();
    return `https://raw.githubusercontent.com/louissullivan4/diana/refs/heads/main/assets/ranked-emblem/${sanitized}.webp`;
}

export function getChampionThumbnail(championName: string) {
    const sanitized = championName.replace(/\s+/g, '');
    return `https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/${encodeURIComponent(
        sanitized
    )}.png`;
}
