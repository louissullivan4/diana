import type { MessageAdapter, MessagePayload } from '../../../core/pluginTypes.js';

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
        console.warn(`[Apex Notification] No message adapter; skipping ${label}.`);
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
