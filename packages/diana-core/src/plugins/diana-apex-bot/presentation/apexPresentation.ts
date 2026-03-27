import type {
    ApexBridgeResponse,
    ApexLegendData,
    ApexMatchResult,
} from '../types.js';
import { formatApexRank } from '../api/utils/rankService.js';

// wiki.gg hosts all rank tiers except Rookie (added S17, not yet on CDN).
// Legend icons come from the same CDN as the API's ImgAssets.icon field.
const apexRankEmblemUrls = new Map<string, string>([
    ['Bronze', 'https://apexlegends.wiki.gg/images/Ranked_Tier1_Bronze.png'],
    ['Silver', 'https://apexlegends.wiki.gg/images/Ranked_Tier2_Silver.png'],
    ['Gold', 'https://apexlegends.wiki.gg/images/Ranked_Tier3_Gold.png'],
    [
        'Platinum',
        'https://apexlegends.wiki.gg/images/Ranked_Tier4_Platinum.png',
    ],
    ['Diamond', 'https://apexlegends.wiki.gg/images/Ranked_Tier5_Diamond.png'],
    ['Master', 'https://apexlegends.wiki.gg/images/Ranked_Tier6_Master.png'],
    [
        'Apex Predator',
        'https://apexlegends.wiki.gg/images/Ranked_Tier7_Apex_Predator.png',
    ],
]);

/** Returns the wiki.gg rank emblem URL for a given tier name, or null for Rookie/unknown. */
export function getApexRankEmblem(tier: string): string | null {
    return apexRankEmblemUrls.get(tier) ?? null;
}

/** Returns the legend icon URL from the apexlegendsstatus CDN (same source as ImgAssets.icon). */
export function getApexLegendIcon(legendName: string): string | null {
    if (!legendName || legendName === 'Unknown') return null;
    const sanitized = legendName.toLowerCase().replace(/\s+/g, '');
    return `https://api.apexlegendsstatus.com/assets/icons/${sanitized}.png`;
}

export interface ApexPlayerEmbed {
    playerName: string;
    platform: string;
    level: number;
    levelProgress: number;
    rankDisplay: string;
    /** "🟢 Online" | "🎮 In Game" | "🔴 Offline" */
    status: string;
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
    const { global, legends, realtime } = data;
    const { name, platform, level, toNextLevelPercent, rank } = global;

    const rankDisplay = formatApexRank(
        rank.rankName,
        rank.rankDiv,
        rank.rankScore
    );
    const colorHex = apexRankColors.get(rank.rankName) ?? 0x3498db;

    // Online status
    let status: string;
    if (realtime?.isInGame === 1) {
        status = '🎮 In Game';
    } else if (realtime?.isOnline === 1) {
        status = '🟢 Online';
    } else {
        status = '🔴 Offline';
    }

    // Top tracker stats from selected legend
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
        levelProgress: toNextLevelPercent,
        rankDisplay,
        status,
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
