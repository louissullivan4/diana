import type { MessageAdapter, MessagePayload, MessageTarget } from 'diana-core';
import { createDiscordMessageAdapter } from 'diana-discord';

const DISABLE_DISCORD_POSTS = ['1', 'true', 'yes'].includes(
    (process.env.DISABLE_DISCORD_POSTS ?? '').toLowerCase()
);

export function createServerDiscordMessageAdapter(): MessageAdapter {
    const discordAdapter = createDiscordMessageAdapter();

    return {
        async sendMessage(target: MessageTarget, payload: MessagePayload) {
            if (DISABLE_DISCORD_POSTS) {
                console.log(
                    '[Diana] DISABLE_DISCORD_POSTS enabled; skipping Discord send.'
                );
                return;
            }
            await discordAdapter.sendMessage(target, payload);
        },
    };
}
