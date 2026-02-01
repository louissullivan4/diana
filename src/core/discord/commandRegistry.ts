import {
    REST,
    Routes,
    type ChatInputCommandInteraction,
    type AutocompleteInteraction,
} from 'discord.js';
import type { SlashCommand } from '../pluginTypes';

const commandHandlers = new Map<string, SlashCommand['execute']>();
const autocompleteHandlers = new Map<
    string,
    NonNullable<SlashCommand['autocomplete']>
>();
let commandDefinitions: SlashCommand[] = [];
let registeredWithDiscord = false;

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
    registeredWithDiscord = true;
}

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction
): Promise<void> {
    const handler = commandHandlers.get(interaction.commandName);
    if (!handler) {
        await interaction.reply({
            content: 'This command is not available.',
            ephemeral: true,
        });
        return;
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
