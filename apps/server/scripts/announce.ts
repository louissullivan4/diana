#!/usr/bin/env ts-node
/**
 * Announce Script — posts a server announcement-style embed to Discord.
 *
 * Usage:
 *   npm run announce -- "Title" "Body text here"
 *   npm run announce -- "Title" "Body text here" --channel 123456789
 *   npm run announce -- "Title" "Body text here" --mention everyone
 *
 * Options:
 *   --channel <id>        Override the default DISCORD_CHANNEL_ID
 *   --mention <everyone|here>  Prepend @everyone or @here to the message
 *   --color <hex>         Embed color as hex number (default: 0x5865f2)
 *   --footer <text>       Optional footer text
 */

import 'dotenv/config';
import { createDiscordMessageAdapter, loginDiscord, getDiscordClient } from 'diana-discord';

function parseArgs(argv: string[]) {
    const args = argv.slice(2);
    const title = args[0];
    const description = args[1];

    let channelId: string | undefined;
    let mention: 'everyone' | 'here' | undefined;
    let color = 0x5865f2; // Discord blurple — classic announcement color
    let footer: string | undefined;

    for (let i = 2; i < args.length; i++) {
        switch (args[i]) {
            case '--channel':
                channelId = args[++i];
                break;
            case '--mention':
                mention = args[++i] as 'everyone' | 'here';
                break;
            case '--color':
                color = parseInt(args[++i], 16);
                break;
            case '--footer':
                footer = args[++i];
                break;
        }
    }

    return { title, description, channelId, mention, color, footer };
}

async function main() {
    const { title, description, channelId, mention, color, footer } =
        parseArgs(process.argv);

    if (!title || !description) {
        console.error('Usage: npm run announce -- "<title>" "<body>" [options]');
        console.error('');
        console.error('Options:');
        console.error('  --channel <id>               Override DISCORD_CHANNEL_ID');
        console.error('  --mention <everyone|here>    Prepend @everyone or @here');
        console.error('  --color <hex>                Embed color hex (default: 5865f2)');
        console.error('  --footer <text>              Footer text');
        process.exit(1);
    }

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.error('Error: DISCORD_BOT_TOKEN is not set in .env');
        process.exit(1);
    }

    const discordClient = getDiscordClient();

    await new Promise<void>((resolve, reject) => {
        discordClient.once('ready', () => resolve());
        discordClient.once('error', reject);
        loginDiscord(token).catch(reject);
    });

    const adapter = createDiscordMessageAdapter();

    const text = mention ? `@${mention}` : undefined;

    await adapter.sendMessage(
        { channelId },
        {
            text,
            title,
            description,
            colorHex: color,
            footer,
            timestamp: new Date(),
        }
    );

    console.log(`✓ Announcement posted: "${title}"`);
    await discordClient.destroy();
    process.exit(0);
}

main().catch((err) => {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
});
