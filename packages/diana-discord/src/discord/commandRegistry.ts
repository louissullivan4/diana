import {
    REST,
    Routes,
    MessageFlags,
    type ChatInputCommandInteraction,
    type AutocompleteInteraction,
} from 'discord.js';
import type { SlashCommand } from './commandTypes';
import type { BotKey } from './client';
import { getGuildConfig } from 'diana-core';

// Commands that may run even when no notification channel is configured
const CHANNEL_EXEMPT_COMMANDS: Record<BotKey, Set<string>> = {
    diana: new Set(['help', 'setchannel', 'ping']),
    pathfinder: new Set(['apex-help', 'apex-channel']),
};

// Per-user cooldown tracking: key = `botKey:userId:commandName`, value = last-used ms
const cooldownMap = new Map<string, number>();
const COOLDOWN_MS = 3000;

const handlers = {
    diana: new Map<string, SlashCommand['execute']>(),
    pathfinder: new Map<string, SlashCommand['execute']>(),
};

const autocompleteHandlers = {
    diana: new Map<string, NonNullable<SlashCommand['autocomplete']>>(),
    pathfinder: new Map<string, NonNullable<SlashCommand['autocomplete']>>(),
};

const definitions: Record<BotKey, SlashCommand[]> = {
    diana: [],
    pathfinder: [],
};

export function registerSlashCommands(
    commands: SlashCommand[],
    defaultBotKey: BotKey = 'diana'
): void {
    for (const cmd of commands) {
        const botKey = cmd.botKey ?? defaultBotKey;
        const name = cmd.data.name;
        if (!name) continue;
        if (handlers[botKey].has(name)) {
            console.warn(
                `[Diana] Duplicate slash command "${name}" for bot "${botKey}", skipping.`
            );
            continue;
        }
        handlers[botKey].set(name, cmd.execute);
        if (cmd.autocomplete) {
            autocompleteHandlers[botKey].set(name, cmd.autocomplete);
        }
        definitions[botKey].push(cmd);
    }
    console.log(
        `[Diana] Registered commands for ${defaultBotKey}: [${[...handlers[defaultBotKey].keys()].join(', ')}]`
    );
}

export function getRegisteredCommands(
    botKey: BotKey = 'diana'
): SlashCommand[] {
    return [...definitions[botKey]];
}

export function clearAllCommands(botKey?: BotKey): void {
    const keys: BotKey[] = botKey ? [botKey] : ['diana', 'pathfinder'];
    for (const k of keys) {
        handlers[k].clear();
        autocompleteHandlers[k].clear();
        definitions[k] = [];
    }
}

export async function syncCommandsToDiscord(botKey: BotKey): Promise<void> {
    const tokenEnv =
        botKey === 'pathfinder'
            ? 'APEX_DISCORD_BOT_TOKEN'
            : 'DISCORD_BOT_TOKEN';
    const clientIdEnv =
        botKey === 'pathfinder'
            ? 'APEX_DISCORD_CLIENT_ID'
            : 'DISCORD_CLIENT_ID';
    const guildIdEnv =
        botKey === 'pathfinder' ? 'APEX_DISCORD_GUILD_ID' : 'DISCORD_GUILD_ID';

    const token = process.env[tokenEnv];
    const clientId = process.env[clientIdEnv];

    if (!token || !clientId) {
        console.warn(
            `[Diana] ${tokenEnv} or ${clientIdEnv} missing. Slash commands for "${botKey}" not registered.`
        );
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const payload = definitions[botKey].map((c) => c.data.toJSON());
    const guildId = process.env[guildIdEnv];

    if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
            body: payload,
        });
        console.log(
            `[Diana] Registered ${payload.length} slash command(s) for "${botKey}" in guild ${guildId}.`
        );
    } else {
        await rest.put(Routes.applicationCommands(clientId), { body: payload });
        console.log(
            `[Diana] Registered ${payload.length} slash command(s) for "${botKey}" globally.`
        );
    }
}

export async function handleSlashCommand(
    interaction: ChatInputCommandInteraction,
    botKey: BotKey
): Promise<void> {
    const handler = handlers[botKey].get(interaction.commandName);
    if (!handler) {
        console.warn(
            `[Diana:${botKey}] No handler for command "${interaction.commandName}". Registered: [${[...handlers[botKey].keys()].join(', ')}]`
        );
        await interaction.reply({
            content: 'This command is not available.',
            flags: MessageFlags.Ephemeral,
        });
        return;
    }

    const exempt = CHANNEL_EXEMPT_COMMANDS[botKey];
    if (!exempt.has(interaction.commandName) && interaction.guildId) {
        const guildConfig = await getGuildConfig(interaction.guildId);
        if (!guildConfig?.channel_id) {
            const setupCmd =
                botKey === 'pathfinder' ? '/apex-channel' : '/setchannel';
            await interaction.reply({
                content: `No notification channel has been set up yet. Please run \`${setupCmd}\` first.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }
    }

    const cooldownKey = `${botKey}:${interaction.user.id}:${interaction.commandName}`;
    const lastUsed = cooldownMap.get(cooldownKey) ?? 0;
    const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
    if (remaining > 0) {
        await interaction.reply({
            content: `Please wait ${(remaining / 1000).toFixed(1)}s before using this command again.`,
            flags: MessageFlags.Ephemeral,
        });
        return;
    }
    cooldownMap.set(cooldownKey, Date.now());

    await handler(interaction);
}

export async function handleAutocomplete(
    interaction: AutocompleteInteraction,
    botKey: BotKey
): Promise<void> {
    const handler = autocompleteHandlers[botKey].get(interaction.commandName);
    if (!handler) {
        await interaction.respond([]);
        return;
    }
    await handler(interaction);
}
