import 'dotenv/config';
import { MessageFlags } from 'discord.js';
import type { Guild, Interaction, TextChannel, Client } from 'discord.js';
import { getDianaClient, getPathfinderClient, loginBot } from './client';
import type { BotKey } from './client';
import {
    syncCommandsToDiscord,
    handleSlashCommand,
    handleAutocomplete,
} from './commandRegistry';

const WELCOME_MESSAGES: Record<BotKey, string> = {
    diana:
        "Hi! I'm **Diana**, a League of Legends match tracking bot.\n\n" +
        'Get started:\n' +
        '1. Run `/setchannel` to choose where match notifications are posted.\n' +
        '2. Run `/add` to start tracking summoners.\n' +
        '3. Run `/help` to see all available commands.' +
        '\n\n' +
        'Please upvote on [top.gg](https://top.gg/bot/1327445461107347567) and share Diana if you find her useful! [Support development here](https://buymeacoffee.com/yngstew).',
    pathfinder:
        "Hi! I'm **Pathfinder**, an Apex Legends tracking bot.\n\n" +
        'Get started:\n' +
        '1. Run `/apex-channel` to choose where notifications are posted.\n' +
        '2. Run `/apex-add` to start tracking players.\n' +
        '3. Run `/apex-help` to see all available commands.',
};

async function sendWelcomeMessage(guild: Guild, botKey: BotKey): Promise<void> {
    try {
        const systemChannel = guild.systemChannel;
        if (systemChannel?.isSendable()) {
            await systemChannel.send(WELCOME_MESSAGES[botKey]);
            return;
        }
        const textChannel = guild.channels.cache
            .filter(
                (c: any): c is TextChannel => c.isTextBased() && 'send' in c
            )
            .sort((a: any, b: any) => a.position - b.position)
            .first();
        if (textChannel?.isSendable()) {
            await textChannel.send(WELCOME_MESSAGES[botKey]);
        }
    } catch (err) {
        console.error(
            `[Diana:${botKey}] Failed to send welcome message to guild ${guild.id}:`,
            err
        );
    }
}

function attachClientListeners(client: Client, botKey: BotKey): void {
    client.once('ready', async () => {
        console.log(
            `[Diana:${botKey}] Discord client ready as ${client.user?.tag ?? 'unknown'}.`
        );
        try {
            await syncCommandsToDiscord(botKey);
        } catch (err) {
            console.error(
                `[Diana:${botKey}] Failed to register slash commands:`,
                err
            );
        }
    });

    client.on('guildCreate', async (guild: Guild) => {
        console.log(
            `[Diana:${botKey}] Joined new guild: ${guild.name} (${guild.id})`
        );
        await sendWelcomeMessage(guild, botKey);
    });

    client.on('interactionCreate', async (interaction: Interaction) => {
        if (interaction.isAutocomplete()) {
            try {
                await handleAutocomplete(interaction, botKey);
            } catch (err) {
                console.error(`[Diana:${botKey}] Autocomplete error:`, err);
                try {
                    if (!interaction.responded) await interaction.respond([]);
                } catch (_) {}
            }
            return;
        }
        if (!interaction.isChatInputCommand()) return;
        if (Date.now() - interaction.createdTimestamp > 2500) return;
        try {
            await handleSlashCommand(interaction, botKey);
        } catch (err: any) {
            if (err?.code === 10062) return;
            console.error(`[Diana:${botKey}] Slash command error:`, err);
            const msg = 'An unexpected error occurred.';
            try {
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({
                        content: msg,
                        flags: MessageFlags.Ephemeral,
                    });
                } else {
                    await interaction.reply({
                        content: msg,
                        flags: MessageFlags.Ephemeral,
                    });
                }
            } catch (_) {}
        }
    });
}

async function startBot(botKey: BotKey, tokenEnvVar: string): Promise<void> {
    const token = process.env[tokenEnvVar];
    if (!token) {
        console.warn(
            `[Diana:${botKey}] ${tokenEnvVar} not set. Bot will not start.`
        );
        return;
    }
    try {
        await loginBot(botKey, token);
        console.log(`[Diana:${botKey}] Discord login initiated.`);
    } catch (err) {
        console.error(`[Diana:${botKey}] Discord login failed:`, err);
    }
}

export async function setupAndStartDiscord(): Promise<void> {
    attachClientListeners(getDianaClient(), 'diana');
    attachClientListeners(getPathfinderClient(), 'pathfinder');

    await startBot('diana', 'DISCORD_BOT_TOKEN');
    await startBot('pathfinder', 'APEX_DISCORD_BOT_TOKEN');
}
