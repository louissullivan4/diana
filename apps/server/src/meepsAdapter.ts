import type { MessageAdapter, MessagePayload, MessageTarget } from 'diana-core';

const MEEPS_WEBHOOK_URL = process.env.MEEPS_WEBHOOK_URL;
const MEEPS_WEBHOOK_SECRET = process.env.MEEPS_WEBHOOK_SECRET;
const DISABLE_MEEPS_POSTS = ['1', 'true', 'yes'].includes(
    (process.env.DISABLE_MEEPS_POSTS ?? '').toLowerCase()
);

/**
 * Serialize MessagePayload for JSON (e.g. Date -> ISO string).
 */
function serializeMessagePayload(
    payload: MessagePayload
): Record<string, unknown> {
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

export function createMeepsMessageAdapter(): MessageAdapter {
    return {
        async sendMessage(_target: MessageTarget, payload: MessagePayload) {
            if (DISABLE_MEEPS_POSTS) {
                console.log(
                    '[Diana] DISABLE_MEEPS_POSTS enabled; skipping Meeps send.'
                );
                return;
            }

            if (!MEEPS_WEBHOOK_URL?.trim()) return;

            const baseUrl = MEEPS_WEBHOOK_URL.trim();
            const normalizedBaseUrl = /^https?:\/\//i.test(baseUrl)
                ? baseUrl
                : `https://${baseUrl}`;
            const url =
                normalizedBaseUrl.replace(/\/$/, '') + '/api/diana-notify';
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
                    body: JSON.stringify(serializeMessagePayload(payload)),
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
