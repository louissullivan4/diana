import type { MessageAdapter, MessagePayload, MessageTarget } from 'diana-core';

const MEEPS_WEBHOOK_URL = process.env.MEEPS_WEBHOOK_URL;
const MEEPS_WEBHOOK_SECRET = process.env.MEEPS_WEBHOOK_SECRET;

/**
 * Serialize MessagePayload for JSON (e.g. Date -> ISO string).
 */
function serializePayload(payload: MessagePayload): Record<string, unknown> {
    const out: Record<string, unknown> = {
        title: payload.title,
        description: payload.description,
        url: payload.url,
        colorHex: payload.colorHex,
        thumbnailUrl: payload.thumbnailUrl,
        fields: payload.fields,
        footer: payload.footer,
        text: payload.text,
    };
    if (payload.timestamp !== undefined) {
        out.timestamp =
            payload.timestamp instanceof Date
                ? payload.timestamp.toISOString()
                : payload.timestamp;
    }
    return out;
}

/**
 * Creates a MessageAdapter that sends to both Discord and Meeps (when MEEPS_WEBHOOK_URL is set).
 * When the league bot posts a match/rank update, this adapter forwards it to Meeps' Matches channel.
 */
export function createCompositeMessageAdapter(
    discordAdapter: MessageAdapter
): MessageAdapter {
    return {
        async sendMessage(target: MessageTarget, payload: MessagePayload) {
            await discordAdapter.sendMessage(target, payload);

            if (!MEEPS_WEBHOOK_URL?.trim()) return;

            const url =
                MEEPS_WEBHOOK_URL.replace(/\/$/, '') + '/api/diana-notify';
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (MEEPS_WEBHOOK_SECRET) {
                headers['x-diana-secret'] = MEEPS_WEBHOOK_SECRET;
            }
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(serializePayload(payload)),
                });
                if (!res.ok) {
                    console.warn(
                        `[Diana] Meeps webhook returned ${res.status}: ${await res.text()}`
                    );
                }
            } catch (err) {
                console.warn('[Diana] Meeps webhook request failed:', err);
            }
        },
    };
}
