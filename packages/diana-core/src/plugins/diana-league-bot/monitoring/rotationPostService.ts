import {
    getAllGuildConfigs,
    getNotificationPref,
} from '../api/summoners/guildService';
import { buildChampionIdMap } from '../api/utils/dataDragonService';
import { createLolService } from '../api/utils/lolService/lolServiceFactory';
import type { MessageAdapter, MessagePayload } from '../../../core/pluginTypes';
import type { LeagueBotConfig } from '../types';

const lolService = createLolService();

async function championNames(championIds: number[]): Promise<string[]> {
    const idMap = await buildChampionIdMap();
    return championIds.map(
        (id) => idMap[String(id)]?.name ?? `Champion #${id}`
    );
}

/**
 * Build the free-rotation payload, or null when the rotation is empty.
 * One Riot call per tick, shared by every guild.
 */
export async function buildRotationPayload(): Promise<MessagePayload | null> {
    const rotation = await lolService.getChampionRotation();
    if (!rotation || rotation.freeChampionIds.length === 0) return null;

    const names = await championNames(rotation.freeChampionIds);
    names.sort((a, b) => a.localeCompare(b));

    return {
        title: '🔄 **Free Champion Rotation**',
        description: "This week's free champions - try something new!",
        colorHex: 0x1e90ff,
        fields: [
            {
                name: '🆓 **Free to Play**',
                value: names.join(', '),
                inline: false,
            },
        ],
        footer: 'Free Rotation • Updates weekly',
        timestamp: new Date().toISOString(),
    };
}

export function createRotationPostTick(
    _config: LeagueBotConfig,
    messageAdapter: MessageAdapter | null | undefined
): () => Promise<void> {
    return async function runRotationPostTick(): Promise<void> {
        if (process.env.STOP_BOT) {
            console.log(
                `[Info] [${new Date().toISOString()}] Stop bot enabled, skipping rotation post...`
            );
            return;
        }
        if (!messageAdapter) {
            console.warn(
                '[Rotation] No message adapter set; skipping rotation post.'
            );
            return;
        }

        const guilds = await getAllGuildConfigs();
        const optedIn = guilds.filter(
            (guild) =>
                guild.channel_id && getNotificationPref(guild, 'rotation')
        );
        if (optedIn.length === 0) return;

        let payload: MessagePayload | null;
        try {
            payload = await buildRotationPayload();
        } catch (error) {
            console.error(
                '[Error] Failed to fetch the free champion rotation:',
                error
            );
            return;
        }
        if (!payload) return;

        for (const guild of optedIn) {
            try {
                await messageAdapter.sendMessage(
                    { channelId: guild.channel_id as string },
                    payload
                );
                console.log(
                    `[Info] [${new Date().toISOString()}] Sent rotation post to guild ${guild.guild_id}.`
                );
            } catch (error) {
                console.error(
                    `[Error] Failed to send rotation post to guild ${guild.guild_id}:`,
                    error
                );
            }
        }
    };
}
