import {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    REST,
    Routes,
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import { slashCommands } from './commands';

export type SlashCommandHandler = (
    interaction: ChatInputCommandInteraction
) => Promise<void>;

export type SlashCommandAutocompleteHandler = (
    interaction: AutocompleteInteraction
) => Promise<void>;

export interface SlashCommand {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;
    execute: SlashCommandHandler;
    autocomplete?: SlashCommandAutocompleteHandler;
}

const slashCommandHandlers = new Map<string, SlashCommandHandler>();
const slashCommandAutocompleteHandlers = new Map<
    string,
    SlashCommandAutocompleteHandler
>();
let hasRegisteredHandlers = false;

function ensureHandlersInitialized() {
    if (hasRegisteredHandlers) return;
    console.log(
        `Preparing ${slashCommands.length} Discord slash command handler(s) for registration.`
    );
    for (const command of slashCommands) {
        const commandName = command.data.name;

        if (!commandName) {
            console.warn(
                'Encountered a slash command without a name. Skipping registration.'
            );
            continue;
        }

        if (slashCommandHandlers.has(commandName)) {
            console.warn(
                `Duplicate slash command name detected: "${commandName}". Only the first definition will be used.`
            );
            continue;
        }

        console.log(`Registered handler for slash command "${commandName}".`);
        slashCommandHandlers.set(commandName, command.execute);

        if (command.autocomplete) {
            slashCommandAutocompleteHandlers.set(
                commandName,
                command.autocomplete
            );
        }
    }

    hasRegisteredHandlers = true;
}

let hasRegisteredCommands = false;

export async function registerSlashCommands() {
    if (hasRegisteredCommands) return;

    const token = process.env.DISCORD_BOT_TOKEN;
    const clientId = process.env.DISCORD_CLIENT_ID;

    if (!token || !clientId) {
        console.warn(
            'DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID is missing. Slash commands will not be registered.'
        );
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    const commandsPayload = slashCommands.map((command) =>
        command.data.toJSON()
    );

    console.log(
        `Registering ${commandsPayload.length} Discord slash command(s) with the API.`
    );

    try {
        const guildId = process.env.DISCORD_GUILD_ID;

        if (guildId) {
            await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
                body: commandsPayload,
            });
            console.log(
                `Registered Discord slash commands for guild ${guildId}.`
            );
        } else {
            await rest.put(Routes.applicationCommands(clientId), {
                body: commandsPayload,
            });
            console.log('Registered Discord slash commands globally.');
        }

        ensureHandlersInitialized();
        hasRegisteredCommands = true;
    } catch (error) {
        console.error('Failed to register Discord slash commands:', error);
    }
}

export async function handleSlashCommandInteraction(
    interaction: ChatInputCommandInteraction
) {
    ensureHandlersInitialized();

    const handler = slashCommandHandlers.get(interaction.commandName);

    if (!handler) {
        console.warn(
            `No handler found for slash command "${interaction.commandName}".`
        );

        await interaction.reply({
            content: 'This command has not been implemented yet.',
            ephemeral: true,
        });
        return;
    }

    console.log(
        `Executing slash command "${interaction.commandName}" for user ${interaction.user.tag}.`
    );

    await handler(interaction);
}

export async function handleAutocompleteInteraction(
    interaction: AutocompleteInteraction
) {
    ensureHandlersInitialized();

    const handler = slashCommandAutocompleteHandlers.get(
        interaction.commandName
    );

    if (!handler) {
        await interaction.respond([]);
        return;
    }

    await handler(interaction);
}
