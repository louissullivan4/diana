import type { ApexBridgeResponse, ApexLegendData } from '../types.js';
import { formatApexRank } from '../api/utils/rankService.js';

export interface ApexPlayerEmbed {
    playerName: string;
    platform: string;
    level: number;
    rankDisplay: string;
    selectedLegend: string | null;
    topStats: Array<{ name: string; value: string }>;
    colorHex: number;
}

const apexRankColors = new Map<string, number>([
    ['Rookie', 0x8b5a2b],
    ['Bronze', 0xcd7f32],
    ['Silver', 0xc0c0c0],
    ['Gold', 0xffd700],
    ['Platinum', 0x00cfff],
    ['Diamond', 0x00bfff],
    ['Master', 0x9b59b6],
    ['Apex Predator', 0xe74c3c],
]);

export function buildApexPlayerEmbed(data: ApexBridgeResponse): ApexPlayerEmbed {
    const { global, legends } = data;
    const { name, platform, level, rank } = global;

    const rankDisplay = formatApexRank(rank.rankName, rank.rankDiv, rank.rankScore);
    const colorHex = apexRankColors.get(rank.rankName) ?? 0x3498db;

    // Selected legend stats
    const selectedLegendName = Object.keys(legends.selected)[0] ?? null;
    const selectedLegendData: ApexLegendData | null = selectedLegendName
        ? (legends.selected[selectedLegendName] ?? null)
        : null;

    const topStats: Array<{ name: string; value: string }> = [];
    if (selectedLegendData?.data) {
        for (const stat of selectedLegendData.data.slice(0, 3)) {
            topStats.push({
                name: stat.name,
                value: stat.value.toLocaleString(),
            });
        }
    }

    return {
        playerName: name,
        platform,
        level,
        rankDisplay,
        selectedLegend: selectedLegendName,
        topStats,
        colorHex,
    };
}
