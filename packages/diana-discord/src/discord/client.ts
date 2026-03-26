import { Client, IntentsBitField } from 'discord.js';

export type BotKey = 'diana' | 'pathfinder';

const intents = [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
];

const dianaClient = new Client({ intents });
const pathfinderClient = new Client({ intents });

export function getDianaClient(): Client {
    return dianaClient;
}

export function getPathfinderClient(): Client {
    return pathfinderClient;
}

export function getClientForBot(botKey: BotKey): Client {
    return botKey === 'pathfinder' ? pathfinderClient : dianaClient;
}

export async function loginBot(botKey: BotKey, token: string): Promise<void> {
    await getClientForBot(botKey).login(token);
}

export function isDiscordReady(botKey: BotKey = 'diana'): boolean {
    return getClientForBot(botKey).isReady();
}

/** @deprecated Use getDianaClient() or getPathfinderClient() instead */
export function getDiscordClient(): Client {
    return dianaClient;
}
