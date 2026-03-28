import type {
    MessageAdapter,
    MessagePayload,
} from '../../../core/pluginTypes.js';

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

// ─── Rank Change ──────────────────────────────────────────────────────────────

interface RankChangeInput {
    playerName: string;
    direction: 'promoted' | 'demoted';
    newRankMsg: string;
    rpChange: number;
    rankIconUrl?: string | null;
    rpToNextRank: { rpNeeded: number; nextRankName: string } | null;
    discordChannelId: string;
}

export function buildApexRankChangeMessage({
    playerName,
    direction,
    newRankMsg,
    rpChange,
    rankIconUrl,
    rpToNextRank,
}: Omit<RankChangeInput, 'discordChannelId'>): MessagePayload {
    const isPromotion = direction === 'promoted';
    const tier = newRankMsg.split(' ')[0] ?? '';
    const colorHex = apexRankColors.get(tier) ?? 0x3498db;
    const rpSign = rpChange > 0 ? '+' : '';

    const fields: MessagePayload['fields'] = [
        {
            name: '🏆 **New Rank**',
            value: `**${newRankMsg}**`,
            inline: true,
        },
        {
            name: '🔄 **RP Change**',
            value: `**${rpSign}${rpChange} RP**`,
            inline: true,
        },
    ];

    if (rpToNextRank !== null) {
        fields.push({
            name: '🎯 **Next Rank**',
            value: `**${rpToNextRank.rpNeeded} RP** to ${rpToNextRank.nextRankName}`,
            inline: true,
        });
    }

    return {
        title: isPromotion ? '📈 **Rank Up!**' : '📉 **Rank Down...**',
        description: isPromotion
            ? `${playerName} has ranked up in Apex Legends!`
            : `${playerName} has been demoted in Apex Legends.`,
        colorHex,
        thumbnailUrl: rankIconUrl ?? undefined,
        fields,
        footer: 'Apex Legends Rank Notification',
        timestamp: new Date().toISOString(),
    };
}

export async function notifyApexRankChange(
    adapter: MessageAdapter | null | undefined,
    input: RankChangeInput
): Promise<boolean> {
    const { discordChannelId, ...payload } = input;
    const message = buildApexRankChangeMessage(payload);
    return sendWithAdapter(adapter, discordChannelId, message, 'rank change');
}

// ─── Session Summary ──────────────────────────────────────────────────────────

interface SessionInput {
    playerName: string;
    /** Currently selected legend name, e.g. "Wraith" */
    legend: string;
    /** Legend icon URL (from ImgAssets.icon or apexlegendsstatus CDN) */
    legendIconUrl?: string | null;
    rpChange: number;
    newRankMsg: string;
    /** Kills gained this session — null if snapshot not available */
    killsGained: number | null;
    /** Damage dealt this session — null if snapshot not available */
    damageGained: number | null;
    /** Wins gained this session — null if snapshot not available */
    winsGained: number | null;
    discordChannelId: string;
}

export function buildApexSessionMessage({
    playerName,
    legend,
    legendIconUrl,
    rpChange,
    newRankMsg,
    killsGained,
    damageGained,
    winsGained,
}: Omit<SessionInput, 'discordChannelId'>): MessagePayload {
    const tier = newRankMsg.split(' ')[0] ?? '';
    const colorHex = apexRankColors.get(tier) ?? 0x95a5a6;
    const rpSign = rpChange > 0 ? '+' : '';

    const fields: MessagePayload['fields'] = [
        {
            name: '🔄 **RP Change**',
            value: `**${rpSign}${rpChange} RP**`,
            inline: true,
        },
        {
            name: '🏅 **Current Rank**',
            value: `**${newRankMsg}**`,
            inline: true,
        },
        {
            name: '🦸 **Legend**',
            value: `**${legend}**`,
            inline: true,
        },
    ];

    // Stat diffs — shown only when snapshot data is available
    const hasStats =
        killsGained !== null || damageGained !== null || winsGained !== null;
    const anyNonZero =
        (killsGained ?? 0) > 0 ||
        (damageGained ?? 0) > 0 ||
        (winsGained ?? 0) > 0;

    if (hasStats && anyNonZero) {
        if ((killsGained ?? 0) > 0) {
            fields.push({
                name: '⚔️ **Kills**',
                value: `**+${killsGained}**`,
                inline: true,
            });
        }
        if ((damageGained ?? 0) > 0) {
            fields.push({
                name: '💥 **Damage**',
                value: `**+${(damageGained ?? 0).toLocaleString()}**`,
                inline: true,
            });
        }
        if ((winsGained ?? 0) > 0) {
            fields.push({
                name: '🏆 **Win!**',
                value: `**+${winsGained}**`,
                inline: true,
            });
        }
    } else if (hasStats && !anyNonZero) {
        fields.push({
            name: '📊 **Stats**',
            value: '*Not tracked on banner*',
            inline: true,
        });
    }
    // null snapshot → omit stats section entirely (first time we've seen this player)

    return {
        title: '🎮 **Session Update**',
        description: `${playerName} played a session in Apex Legends!`,
        colorHex,
        thumbnailUrl: legendIconUrl ?? undefined,
        fields,
        footer: 'Apex Legends Session',
        timestamp: new Date().toISOString(),
    };
}

export async function notifyApexSession(
    adapter: MessageAdapter | null | undefined,
    input: SessionInput
): Promise<boolean> {
    const { discordChannelId, ...payload } = input;
    const message = buildApexSessionMessage(payload);
    return sendWithAdapter(adapter, discordChannelId, message, 'session');
}

// ─── Shared sender ────────────────────────────────────────────────────────────

async function sendWithAdapter(
    adapter: MessageAdapter | null | undefined,
    channelId: string,
    payload: MessagePayload,
    label: string
): Promise<boolean> {
    if (!adapter) {
        console.warn(
            `[Apex Notification] No message adapter; skipping ${label}.`
        );
        return true;
    }
    try {
        await adapter.sendMessage({ channelId }, payload);
        return true;
    } catch (err) {
        console.error(`[Apex Notification] Failed to send ${label}:`, err);
        return false;
    }
}
