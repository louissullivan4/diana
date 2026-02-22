import { EmbedBuilder } from 'discord.js';
import type { MessageAdapter, MessagePayload } from 'diana-core';
import { getDiscordClient } from './client';

function buildEmbed(payload: MessagePayload): EmbedBuilder | null {
    const hasEmbedContent =
        payload.title ||
        payload.description ||
        payload.url ||
        payload.colorHex ||
        payload.thumbnailUrl ||
        (payload.fields && payload.fields.length > 0) ||
        payload.footer ||
        payload.timestamp;

    if (!hasEmbedContent) return null;

    const embed = new EmbedBuilder();
    if (payload.title) embed.setTitle(payload.title);
    if (payload.description) embed.setDescription(payload.description);
    if (payload.url) embed.setURL(payload.url);
    if (payload.colorHex) embed.setColor(payload.colorHex);
    if (payload.thumbnailUrl) embed.setThumbnail(payload.thumbnailUrl);
    if (payload.fields && payload.fields.length > 0) {
        embed.addFields(payload.fields);
    }
    if (payload.footer) {
        embed.setFooter({ text: payload.footer });
    }
    if (payload.timestamp) {
        const ts =
            payload.timestamp instanceof Date
                ? payload.timestamp
                : new Date(payload.timestamp);
        embed.setTimestamp(ts);
    }
    return embed;
}

export function createDiscordMessageAdapter(): MessageAdapter {
    return {
        async sendMessage(target, payload) {
            const channelId =
                target.channelId ?? process.env.DISCORD_CHANNEL_ID;
            if (!channelId) {
                throw new Error('Channel ID not provided.');
            }
            const channel = await getDiscordClient().channels.fetch(channelId);
            if (!channel) {
                throw new Error(`Channel with ID ${channelId} not found.`);
            }
            if (!channel.isSendable()) {
                throw new Error(
                    `Channel with ID ${channelId} is not sendable.`
                );
            }
            const embed = buildEmbed(payload);
            const content = payload.text;
            if (embed) {
                await channel.send({ content, embeds: [embed] });
            } else if (content) {
                await channel.send({ content });
            } else {
                throw new Error('Message content not provided.');
            }
        },
    };
}
