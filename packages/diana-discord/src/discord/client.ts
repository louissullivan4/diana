import { Client, IntentsBitField } from 'discord.js';

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
    ],
});

export function getDiscordClient(): Client {
    return client;
}

export async function loginDiscord(token: string): Promise<void> {
    await client.login(token);
}

export function isDiscordReady(): boolean {
    return client.isReady();
}
