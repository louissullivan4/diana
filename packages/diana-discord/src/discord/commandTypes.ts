import type {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
    ChatInputCommandInteraction,
    AutocompleteInteraction,
} from 'discord.js';
import type { BotKey } from './client';

export interface SlashCommand {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
    /** Which bot this command belongs to. Defaults to 'diana'. */
    botKey?: BotKey;
}
