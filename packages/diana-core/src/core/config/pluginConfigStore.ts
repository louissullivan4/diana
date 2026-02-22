import * as fs from 'fs';
import * as path from 'path';
import type { PluginConfigEntry } from '../pluginTypes';

const CONFIG_DIR =
    process.env.DIANA_CONFIG_DIR ?? path.join(process.cwd(), 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'plugins.json');

// In-memory fallback when filesystem is not writable
let inMemoryConfig: PluginConfigEntry[] | null = null;
let useInMemory = false;

function ensureConfigDir(): boolean {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        return true;
    } catch (err) {
        console.warn(
            '[Diana:Config] Cannot create config directory, using in-memory storage:',
            err instanceof Error ? err.message : err
        );
        useInMemory = true;
        inMemoryConfig = inMemoryConfig ?? [];
        return false;
    }
}

function readConfig(): PluginConfigEntry[] {
    // Use in-memory if filesystem is not available
    if (useInMemory) {
        return inMemoryConfig ?? [];
    }

    if (!ensureConfigDir()) {
        return inMemoryConfig ?? [];
    }

    if (!fs.existsSync(CONFIG_FILE)) {
        return [];
    }
    try {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(raw) as PluginConfigEntry[];
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function writeConfig(entries: PluginConfigEntry[]): void {
    // Always update in-memory copy
    inMemoryConfig = entries;

    // Try to write to filesystem
    if (useInMemory) {
        return; // Skip filesystem write
    }

    if (!ensureConfigDir()) {
        return;
    }

    try {
        fs.writeFileSync(
            CONFIG_FILE,
            JSON.stringify(entries, null, 2),
            'utf-8'
        );
    } catch (err) {
        console.warn(
            '[Diana:Config] Cannot write config file, changes stored in-memory only:',
            err instanceof Error ? err.message : err
        );
        useInMemory = true;
    }
}

export function getPluginConfig(
    pluginId: string
): PluginConfigEntry | undefined {
    return readConfig().find((e) => e.id === pluginId);
}

export function isPluginEnabled(pluginId: string): boolean {
    const entry = getPluginConfig(pluginId);
    return entry?.enabled ?? true; // default enabled for first-time
}

export function setPluginEnabled(pluginId: string, enabled: boolean): void {
    const entries = readConfig();
    const idx = entries.findIndex((e) => e.id === pluginId);
    if (idx >= 0) {
        entries[idx].enabled = enabled;
    } else {
        entries.push({ id: pluginId, enabled, config: {} });
    }
    writeConfig(entries);
}

export function getPluginConfigData<T = Record<string, unknown>>(
    pluginId: string
): T {
    const entry = getPluginConfig(pluginId);
    return (entry?.config ?? {}) as T;
}

export function setPluginConfigData(
    pluginId: string,
    config: Record<string, unknown>
): void {
    const entries = readConfig();
    const idx = entries.findIndex((e) => e.id === pluginId);
    if (idx >= 0) {
        entries[idx].config = { ...(entries[idx].config ?? {}), ...config };
    } else {
        entries.push({ id: pluginId, enabled: true, config });
    }
    writeConfig(entries);
}

export function getAllPluginConfigs(): PluginConfigEntry[] {
    return readConfig();
}
