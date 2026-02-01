import type { Router } from 'express';
import type {
    SlashCommandBuilder,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';
import type {
    ChatInputCommandInteraction,
    AutocompleteInteraction,
} from 'discord.js';

export interface SlashCommand {
    data:
        | SlashCommandBuilder
        | SlashCommandSubcommandsOnlyBuilder
        | SlashCommandOptionsOnlyBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
    autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface PluginContext {
    /** Register Discord slash commands contributed by this plugin */
    registerSlashCommands(commands: SlashCommand[]): void;
    /** Mount an Express router at a path (e.g. '/summoners', '/match') */
    mountRouter(path: string, router: Router): void;
    /** Register a cron-like job (cron expression + handler). Returns a cleanup function. */
    registerCron(schedule: string, handler: () => Promise<void>): () => void;
    /** Get plugin-specific config (from dashboard / plugins config) */
    getConfig<T = Record<string, unknown>>(): T;
    /** Get the shared Discord client (for sending messages, etc.). May not be ready immediately. */
    getDiscordClient(): import('discord.js').Client;
}

export interface DianaPlugin {
    /** Unique plugin id (e.g. 'diana-league-bot') */
    id: string;
    /** Display name */
    name: string;
    /** Semantic version */
    version: string;
    description?: string;
    /** Optional icon URL or path for the dashboard */
    icon?: string;
    /** Config schema - describes configurable fields for the dashboard */
    configSchema?: ConfigField[];

    /** Called when Diana loads the plugin. Use to register commands, routes, cron. */
    onLoad(context: PluginContext): Promise<void>;
    /** Called when the plugin is enabled (e.g. from dashboard). Start background work here. */
    onEnable?(context: PluginContext): Promise<void>;
    /** Called when the plugin is disabled. Stop background work, clean up. */
    onDisable?(context: PluginContext): Promise<void>;
    /** Called when Diana unloads the plugin. */
    onUnload?(context: PluginContext): Promise<void>;
}

export interface PluginConfigEntry {
    id: string;
    enabled: boolean;
    config?: Record<string, unknown>;
}

/**
 * Describes a single configurable field for a plugin.
 * Used by the dashboard to render a config editor form.
 */
export interface ConfigField {
    /** Key in the config object */
    key: string;
    /** Human-readable label */
    label: string;
    /** Field type - determines the input component */
    type: 'string' | 'number' | 'boolean' | 'array' | 'select' | 'textarea';
    /** Optional description/help text */
    description?: string;
    /** Whether this field is required */
    required?: boolean;
    /** Default value if not set */
    default?: unknown;
    /** For 'select' type: available options */
    options?: { label: string; value: string }[];
    /** For 'array' type: schema for each item in the array */
    arrayItemSchema?: ConfigField[];
}

export type PluginState = 'loaded' | 'enabled' | 'disabled' | 'error';

export interface PluginInfo {
    id: string;
    name: string;
    version: string;
    description?: string;
    icon?: string;
    state: PluginState;
    error?: string;
    config?: Record<string, unknown>;
    configSchema?: ConfigField[];
}
