import 'dotenv/config';
import { getDiscordClient, loginDiscord } from './client';
import {
    syncCommandsToDiscord,
    handleSlashCommand,
    handleAutocomplete,
} from './commandRegistry';

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

    client.on('interactionCreate', async (interaction) => {
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
        try {
            await handleSlashCommand(interaction);
        } catch (err) {
            console.error('[Diana] Slash command error:', err);
            const msg = 'An unexpected error occurred.';
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: msg, ephemeral: true });
            } else {
                await interaction.reply({ content: msg, ephemeral: true });
            }
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
