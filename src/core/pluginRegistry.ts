import type { Application, Router } from 'express';
import type {
    DianaPlugin,
    PluginContext,
    SlashCommand,
    PluginInfo,
} from './pluginTypes';
import {
    getPluginConfig,
    isPluginEnabled,
    setPluginEnabled as storeSetPluginEnabled,
    getPluginConfigData,
    setPluginConfigData as storeSetPluginConfigData,
} from './config/pluginConfigStore';
import {
    registerSlashCommands,
    syncCommandsToDiscord,
} from './discord/commandRegistry';
import { getDiscordClient } from './discord/client';

type CronCleanup = () => void;

interface LoadedPlugin {
    plugin: DianaPlugin;
    state: 'loaded' | 'enabled' | 'disabled' | 'error';
    error?: string;
    cronCleanups: CronCleanup[];
    mountedRoutes: { path: string; router: Router }[];
}

const loadedPlugins = new Map<string, LoadedPlugin>();
let expressApp: Application | null = null;
const pendingMounts: { pluginId: string; path: string; router: Router }[] = [];

/** Formatted timestamp for logs */
function timestamp(): string {
    return new Date().toISOString();
}

/** Log plugin lifecycle events - uses safe logging to avoid format string injection */
function logPlugin(
    level: 'info' | 'warn' | 'error',
    pluginId: string,
    message: string,
    extra?: unknown
): void {
    const prefix = '[' + timestamp() + '] [Diana:Plugins]';
    // Use array join to avoid format string injection with user-provided pluginId
    const parts = [prefix, '[' + String(pluginId) + ']', message];
    if (level === 'error') {
        if (extra !== undefined) {
            console.error('%s %s %s', ...parts, extra);
        } else {
            console.error('%s %s %s', ...parts);
        }
    } else if (level === 'warn') {
        console.warn('%s %s %s', ...parts);
    } else {
        console.log('%s %s %s', ...parts);
    }
}

export function setExpressApp(app: Application): void {
    expressApp = app;
    for (const { path: p, router } of pendingMounts) {
        app.use(p, router);
    }
    pendingMounts.length = 0;
}

function createContext(pluginId: string): PluginContext {
    return {
        registerSlashCommands(commands: SlashCommand[]) {
            const commandNames = commands.map((c) => c.data.name).join(', ');
            logPlugin(
                'info',
                pluginId,
                `Registering ${commands.length} slash command(s): ${commandNames}`
            );
            registerSlashCommands(commands);
        },
        mountRouter(path: string, router: Router) {
            const loaded = loadedPlugins.get(pluginId);
            if (loaded) {
                loaded.mountedRoutes.push({ path, router });
                logPlugin(
                    'info',
                    pluginId,
                    `Mounting API router at path: ${path}`
                );
                if (expressApp) {
                    expressApp.use(path, router);
                } else {
                    pendingMounts.push({ pluginId, path, router });
                    logPlugin(
                        'info',
                        pluginId,
                        `Router queued for mounting (Express not ready)`
                    );
                }
            }
        },
        registerCron(
            schedule: string,
            handler: () => Promise<void>
        ): () => void {
            logPlugin(
                'info',
                pluginId,
                `Registering cron job with schedule: ${schedule}`
            );
            const cron = require('node-cron') as typeof import('node-cron');
            const job = cron.schedule(schedule, () => handler());
            const cleanup = () => {
                job.stop();
            };
            const loaded = loadedPlugins.get(pluginId);
            if (loaded) {
                loaded.cronCleanups.push(cleanup);
            }
            return cleanup;
        },
        getConfig<T = Record<string, unknown>>(): T {
            return getPluginConfigData(pluginId) as T;
        },
        getDiscordClient() {
            return getDiscordClient();
        },
    };
}

export function registerPlugin(plugin: DianaPlugin): void {
    if (loadedPlugins.has(plugin.id)) {
        logPlugin('warn', plugin.id, 'Plugin already registered, skipping');
        return;
    }
    loadedPlugins.set(plugin.id, {
        plugin,
        state: 'loaded',
        cronCleanups: [],
        mountedRoutes: [],
    });
    logPlugin(
        'info',
        plugin.id,
        `Registered plugin "${plugin.name}" v${plugin.version}`
    );
}

export async function loadPlugin(pluginId: string): Promise<void> {
    const loaded = loadedPlugins.get(pluginId);
    if (!loaded) {
        throw new Error(`Plugin ${pluginId} not registered.`);
    }
    if (
        loaded.state !== 'loaded' &&
        loaded.state !== 'disabled' &&
        loaded.state !== 'error'
    ) {
        logPlugin(
            'info',
            pluginId,
            `Plugin already in state "${loaded.state}", skipping load`
        );
        return;
    }
    logPlugin('info', pluginId, 'Loading plugin...');
    const context = createContext(pluginId);
    try {
        await loaded.plugin.onLoad(context);
        loaded.state = 'loaded';
        loaded.error = undefined;
        logPlugin('info', pluginId, 'Plugin loaded successfully');
        if (isPluginEnabled(pluginId)) {
            logPlugin(
                'info',
                pluginId,
                'Plugin is enabled in config, auto-enabling...'
            );
            await enablePlugin(pluginId);
        }
    } catch (err) {
        loaded.state = 'error';
        loaded.error = err instanceof Error ? err.message : String(err);
        logPlugin('error', pluginId, 'Failed to load plugin', err);
        throw err;
    }
}

async function stopPluginCrons(pluginId: string): Promise<void> {
    const loaded = loadedPlugins.get(pluginId);
    if (!loaded) return;
    const cronCount = loaded.cronCleanups.length;
    if (cronCount > 0) {
        logPlugin('info', pluginId, `Stopping ${cronCount} cron job(s)...`);
        for (const cleanup of loaded.cronCleanups) {
            cleanup();
        }
        loaded.cronCleanups = [];
    }
}

export async function enablePlugin(pluginId: string): Promise<void> {
    const loaded = loadedPlugins.get(pluginId);
    if (!loaded) {
        throw new Error(`Plugin ${pluginId} not registered.`);
    }
    if (loaded.state === 'enabled') {
        logPlugin('info', pluginId, 'Plugin already enabled, skipping');
        return;
    }
    logPlugin('info', pluginId, 'Enabling plugin...');
    const context = createContext(pluginId);
    try {
        if (loaded.plugin.onEnable) {
            await loaded.plugin.onEnable(context);
        }
        loaded.state = 'enabled';
        loaded.error = undefined;
        storeSetPluginEnabled(pluginId, true);
        logPlugin('info', pluginId, 'Plugin ENABLED successfully');
        await syncCommandsToDiscord();
    } catch (err) {
        loaded.state = 'error';
        loaded.error = err instanceof Error ? err.message : String(err);
        logPlugin('error', pluginId, 'Failed to enable plugin', err);
        throw err;
    }
}

export async function disablePlugin(pluginId: string): Promise<void> {
    const loaded = loadedPlugins.get(pluginId);
    if (!loaded) {
        throw new Error(`Plugin ${pluginId} not registered.`);
    }
    if (loaded.state !== 'enabled') {
        logPlugin(
            'info',
            pluginId,
            `Plugin not enabled (state: ${loaded.state}), skipping disable`
        );
        return;
    }
    logPlugin('info', pluginId, 'Disabling plugin...');
    const context = createContext(pluginId);
    try {
        if (loaded.plugin.onDisable) {
            await loaded.plugin.onDisable(context);
        }
        await stopPluginCrons(pluginId);
        loaded.state = 'disabled';
        storeSetPluginEnabled(pluginId, false);
        logPlugin('info', pluginId, 'Plugin DISABLED successfully');
        // Note: Slash commands stay registered until next restart; only cron jobs are stopped
    } catch (err) {
        loaded.state = 'error';
        loaded.error = err instanceof Error ? err.message : String(err);
        logPlugin('error', pluginId, 'Failed to disable plugin', err);
        throw err;
    }
}

export function setPluginConfig(
    pluginId: string,
    config: Record<string, unknown>
): void {
    logPlugin('info', pluginId, 'Updating plugin configuration...');
    storeSetPluginConfigData(pluginId, config);
    logPlugin('info', pluginId, 'Plugin configuration updated');
}

export function getPlugins(): PluginInfo[] {
    const result: PluginInfo[] = [];
    for (const [, loaded] of loadedPlugins) {
        const entry = getPluginConfig(loaded.plugin.id);
        result.push({
            id: loaded.plugin.id,
            name: loaded.plugin.name,
            version: loaded.plugin.version,
            description: loaded.plugin.description,
            icon: loaded.plugin.icon,
            state: loaded.state,
            error: loaded.error,
            config: entry?.config,
            configSchema: loaded.plugin.configSchema,
        });
    }
    return result;
}

export function getPlugin(pluginId: string): LoadedPlugin | undefined {
    return loadedPlugins.get(pluginId);
}
