import type { MessageAdapter, MessagePayload, MessageTarget } from 'diana-core';
import { createServerDiscordMessageAdapter } from './discordAdapter';
import { createMeepsMessageAdapter } from './meepsAdapter';

/**
 * Creates the app MessageAdapter that fans out to platform adapters.
 */
export function createMessageAdapter(): MessageAdapter {
    const adapters: MessageAdapter[] = [
        createServerDiscordMessageAdapter(),
        createMeepsMessageAdapter(),
    ];

    return {
        async sendMessage(target: MessageTarget, payload: MessagePayload) {
            for (const adapter of adapters) {
                await adapter.sendMessage(target, payload);
            }
        },
    };
}
