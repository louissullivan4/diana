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

interface RankChangeInput {
    playerName: string;
    direction: 'promoted' | 'demoted';
    newRankMsg: string;
    rpChange: number;
    discordChannelId: string;
}

export function buildApexRankChangeMessage({
    playerName,
    direction,
    newRankMsg,
    rpChange,
}: Omit<RankChangeInput, 'discordChannelId'>): MessagePayload {
    const isPromotion = direction === 'promoted';
    const tier = newRankMsg.split(' ')[0] ?? '';
    const colorHex = apexRankColors.get(tier) ?? 0x3498db;

    return {
        title: isPromotion ? '📈 **Rank Up!**' : '📉 **Rank Down...**',
        description: isPromotion
            ? `${playerName} has ranked up in Apex Legends!`
            : `${playerName} has been demoted in Apex Legends.`,
        colorHex,
        fields: [
            {
                name: '🏆 **New Rank**',
                value: `**${newRankMsg}**`,
                inline: true,
            },
            {
                name: '🔄 **RP Change**',
                value: `**${rpChange > 0 ? '+' : ''}${rpChange} RP**`,
                inline: true,
            },
        ],
        footer: 'Apex Legends Rank Notification',
        timestamp: new Date().toISOString(),
    };
}

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

export async function notifyApexRankChange(
    adapter: MessageAdapter | null | undefined,
    input: RankChangeInput
): Promise<boolean> {
    const { discordChannelId, ...payload } = input;
    const message = buildApexRankChangeMessage(payload);
    return sendWithAdapter(adapter, discordChannelId, message, 'rank change');
}

interface MatchEndInput {
    playerName: string;
    legend: string;
    result: 'WIN' | 'LOSS' | 'UNKNOWN';
    durationSecs: number;
    killsGained: number;
    damageGained: number;
    rpChange: number;
    newRankMsg: string;
    discordChannelId: string;
}

export function buildApexMatchEndMessage({
    playerName,
    legend,
    result,
    durationSecs,
    killsGained,
    damageGained,
    rpChange,
    newRankMsg,
}: Omit<MatchEndInput, 'discordChannelId'>): MessagePayload {
    const resultColors: Record<string, number> = {
        WIN: 0x28a745,
        LOSS: 0xe74c3c,
        UNKNOWN: 0x95a5a6,
    };
    const colorHex = resultColors[result] ?? 0x95a5a6;

    const minutes = Math.floor(durationSecs / 60);
    const seconds = durationSecs % 60;
    const durationDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;

    const resultEmoji =
        result === 'WIN' ? '🏆' : result === 'LOSS' ? '💀' : '🎮';
    const rpSign = rpChange > 0 ? '+' : '';

    return {
        title: '🎮 **Match Summary**',
        description: `${playerName} has finished a game!`,
        colorHex,
        fields: [
            {
                name: `${resultEmoji} **Result**`,
                value: `**${result}**`,
                inline: true,
            },
            {
                name: '🦸 **Legend**',
                value: `**${legend}**`,
                inline: true,
            },
            {
                name: '⚔️ **Kills**',
                value: `**${killsGained}**`,
                inline: true,
            },
            {
                name: '💥 **Damage**',
                value: `**${damageGained.toLocaleString()}**`,
                inline: true,
            },
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
        ],
        footer: `Match Summary • Length ${durationDisplay}`,
        timestamp: new Date().toISOString(),
    };
}

export async function notifyApexMatchEnd(
    adapter: MessageAdapter | null | undefined,
    input: MatchEndInput
): Promise<boolean> {
    const { discordChannelId, ...payload } = input;
    const message = buildApexMatchEndMessage(payload);
    return sendWithAdapter(adapter, discordChannelId, message, 'match end');
}
