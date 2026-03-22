import 'dotenv/config';
import { MessageFlags } from 'discord.js';
import type { Guild, Interaction, TextChannel } from 'discord.js';
import { getDiscordClient, loginDiscord } from './client';
import {
    syncCommandsToDiscord,
    handleSlashCommand,
    handleAutocomplete,
} from './commandRegistry';

const WELCOME_MESSAGE =
    "Hi! I'm **Diana**, a League of Legends match tracking bot.\n\n" +
    'Get started:\n' +
    '1. Run `/setchannel` to choose where match notifications are posted.\n' +
    '2. Run `/add` to start tracking summoners.\n' +
    '3. Run `/help` to see all available commands.';

async function sendWelcomeMessage(guild: Guild): Promise<void> {
    try {
        const systemChannel = guild.systemChannel;
        if (systemChannel?.isSendable()) {
            await systemChannel.send(WELCOME_MESSAGE);
            return;
        }
        const textChannel = guild.channels.cache
            .filter(
                (c: any): c is TextChannel => c.isTextBased() && 'send' in c
            )
            .sort((a: any, b: any) => a.position - b.position)
            .first();
        if (textChannel?.isSendable()) {
            await textChannel.send(WELCOME_MESSAGE);
        }
    } catch (err) {
        console.error(
            `[Diana] Failed to send welcome message to guild ${guild.id}:`,
            err
        );
    }
}

export async function setupAndStartDiscord(): Promise<void> {
    const client = getDiscordClient();

    client.once('ready', async () => {
        console.log(
            `[Diana] Discord client ready as ${client.user?.tag ?? 'unknown'}.`
        );
        try {
            await syncCommandsToDiscord();
        } catch (err) {
            console.error('[Diana] Failed to register slash commands:', err);
        }
    });

    client.on('guildCreate', async (guild: Guild) => {
        console.log(`[Diana] Joined new guild: ${guild.name} (${guild.id})`);
        await sendWelcomeMessage(guild);
    });

    console.log('[Diana:debug] Registering interactionCreate listener...');
    client.on('interactionCreate', async (interaction: Interaction) => {
        console.log(
            `[Diana:debug] Interaction received: type=${interaction.type} user=${interaction.user?.tag ?? 'unknown'}`
        );
        if (interaction.isAutocomplete()) {
            try {
                await handleAutocomplete(interaction);
            } catch (err) {
                console.error('[Diana] Autocomplete error:', err);
                try {
                    if (!interaction.responded) await interaction.respond([]);
                } catch (_) {}
            }
            return;
        }
        if (!interaction.isChatInputCommand()) return;
        if (Date.now() - interaction.createdTimestamp > 2500) return;
        try {
            await handleSlashCommand(interaction);
        } catch (err: any) {
            if (err?.code === 10062) return; // Interaction expired — nothing to do
            console.error('[Diana] Slash command error:', err);
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

    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn(
            '[Diana] DISCORD_BOT_TOKEN not set. Discord client will not start.'
        );
        return;
    }
    await loginDiscord(token);
    console.log('[Diana] Discord login initiated.');
}
