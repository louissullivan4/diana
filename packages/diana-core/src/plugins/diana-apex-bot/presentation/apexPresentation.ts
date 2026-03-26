import type {
    ApexBridgeResponse,
    ApexLegendData,
    ApexMatchResult,
} from '../types.js';
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

export function buildApexPlayerEmbed(
    data: ApexBridgeResponse
): ApexPlayerEmbed {
    const { global, legends } = data;
    const { name, platform, level, rank } = global;

    const rankDisplay = formatApexRank(
        rank.rankName,
        rank.rankDiv,
        rank.rankScore
    );
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

export interface ApexMatchHistoryLine {
    legend: string;
    result: string;
    kills: number;
    damage: number;
    rpChange: number;
    durationDisplay: string;
    dateDisplay: string;
}

export function formatMatchHistory(
    matches: ApexMatchResult[]
): ApexMatchHistoryLine[] {
    return matches.map((m) => {
        const mins = Math.floor(m.duration_secs / 60);
        const secs = m.duration_secs % 60;
        const durationDisplay = `${mins}:${String(secs).padStart(2, '0')}`;
        const dateDisplay = m.match_start
            ? new Date(Number(m.match_start)).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
              })
            : '?';
        const rpSign = m.rp_change > 0 ? '+' : '';
        const resultEmoji =
            m.result === 'WIN' ? '🏆' : m.result === 'LOSS' ? '💀' : '🎮';
        return {
            legend: m.legend ?? 'Unknown',
            result: `${resultEmoji} ${m.result}`,
            kills: m.kills_gained,
            damage: m.damage_gained,
            rpChange: m.rp_change,
            durationDisplay,
            dateDisplay,
        };
    });
}
