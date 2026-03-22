import {
    REST,
    Routes,
    MessageFlags,
    type ChatInputCommandInteraction,
    type AutocompleteInteraction,
} from 'discord.js';
import type { SlashCommand } from './commandTypes';
import { getGuildConfig } from 'diana-core';

const CHANNEL_EXEMPT_COMMANDS = new Set(['help', 'setchannel']);

const commandHandlers = new Map<string, SlashCommand['execute']>();
const autocompleteHandlers = new Map<
    string,
    NonNullable<SlashCommand['autocomplete']>
>();
let commandDefinitions: SlashCommand[] = [];

export function registerSlashCommands(commands: SlashCommand[]): void {
    for (const cmd of commands) {
        const name = cmd.data.name;
        if (!name) continue;
        if (commandHandlers.has(name)) {
            console.warn(
                `[Diana] Duplicate slash command "${name}", skipping.`
            );
            continue;
        }
        commandHandlers.set(name, cmd.execute);
        if (cmd.autocomplete) {
            autocompleteHandlers.set(name, cmd.autocomplete);
        }
    }
    commandDefinitions = [...commandDefinitions, ...commands];
    console.log(
        `[Diana] Registered commands: [${[...commandHandlers.keys()].join(', ')}]`
    );
}

export function getRegisteredCommands(): SlashCommand[] {
    return [...commandDefinitions];
}

export function clearPluginCommands(pluginId: string): void {
    // We don't track per-plugin yet; plugins add to the same list. On disable we could clear all and re-register from enabled plugins only.
    // For now, clearing is done when we re-register all from enabled plugins.
}

export function clearAllCommands(): void {
    commandHandlers.clear();
    autocompleteHandlers.clear();
    commandDefinitions = [];
}

export async function syncCommandsToDiscord(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!token || !clientId) {
        console.warn(
            '[Diana] DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID missing. Slash commands not registered.'
        );
        return;
    }
    const rest = new REST({ version: '10' }).setToken(token);
    const payload = commandDefinitions.map((c) => c.data.toJSON());
    const guildId = process.env.DISCORD_GUILD_ID;
    if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: payload,
        });
        console.log(
            `[Diana] Registered ${payload.length} slash command(s) for guild ${guildId}.`
        );
    } else {
        await rest.put(Routes.applicationCommands(clientId), { body: payload });
        console.log(
            `[Diana] Registered ${payload.length} slash command(s) globally.`
        );
    }
}

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) {
        console.warn(
            `[Diana] No handler for command "${interaction.commandName}". Registered: [${[...commandHandlers.keys()].join(', ')}]`
        );
        await interaction.reply({
            content: 'This command is not available.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    if (
        !CHANNEL_EXEMPT_COMMANDS.has(interaction.commandName) &&
        interaction.guildId
    ) {
        const guildConfig = await getGuildConfig(interaction.guildId);
        if (!guildConfig?.channel_id) {
            await interaction.reply({
                content:
                    'No notification channel has been set up yet. Please run `/setchannel` first.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    await handler(interaction);
}

export async function handleAutocomplete(
    interaction: AutocompleteInteraction
): Promise<void> {
    const handler = autocompleteHandlers.get(interaction.commandName);
    if (!handler) {
        await interaction.respond([]);
        return;
    }
    await handler(interaction);
}
