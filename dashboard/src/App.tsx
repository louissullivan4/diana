import { useEffect, useState, useCallback } from 'react';
import './App.css';

interface ConfigField {
    key: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'select' | 'textarea';
    description?: string;
    required?: boolean;
    default?: unknown;
    options?: { label: string; value: string }[];
    arrayItemSchema?: ConfigField[];
}

interface PluginInfo {
    id: string;
    name: string;
    version: string;
    description?: string;
    icon?: string;
    state: 'loaded' | 'enabled' | 'disabled' | 'error';
    error?: string;
    config?: Record<string, unknown>;
    configSchema?: ConfigField[];
}

const API_BASE = '';

async function fetchPlugins(): Promise<PluginInfo[]> {
    const res = await fetch(`${API_BASE}/api/plugins`);
    if (!res.ok) throw new Error('Failed to fetch plugins');
    return res.json();
}

async function setPluginEnabled(
    id: string,
    enabled: boolean
): Promise<PluginInfo> {
    const res = await fetch(
        `${API_BASE}/api/plugins/${encodeURIComponent(id)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled }),
        }
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
    }
    return res.json();
}

async function updatePluginConfig(
    id: string,
    config: Record<string, unknown>
): Promise<PluginInfo> {
    const res = await fetch(
        `${API_BASE}/api/plugins/${encodeURIComponent(id)}`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config }),
        }
    );
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || res.statusText);
    }
    return res.json();
}

/** Render a single config field input */
function ConfigFieldInput({
    field,
    value,
    onChange,
}: {
    field: ConfigField;
    value: unknown;
    onChange: (val: unknown) => void;
}) {
    switch (field.type) {
        case 'boolean':
            return (
                <label className="config-checkbox">
                    <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <span>{field.label}</span>
                </label>
            );
        case 'number':
            return (
                <input
                    type="number"
                    className="config-input"
                    value={(value as number) ?? ''}
                    onChange={(e) =>
                        onChange(
                            e.target.value ? Number(e.target.value) : undefined
                        )
                    }
                    placeholder={
                        field.default !== undefined ? String(field.default) : ''
                    }
                />
            );
        case 'select':
            return (
                <select
                    className="config-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                >
                    <option value="">Select...</option>
                    {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            );
        case 'textarea':
            return (
                <textarea
                    className="config-input config-textarea"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    placeholder={
                        field.default !== undefined ? String(field.default) : ''
                    }
                    rows={4}
                />
            );
        case 'array':
            return (
                <ArrayFieldInput
                    field={field}
                    value={(value as unknown[]) ?? []}
                    onChange={onChange}
                />
            );
        case 'string':
        default:
            return (
                <input
                    type="text"
                    className="config-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value || undefined)}
                    placeholder={
                        field.default !== undefined ? String(field.default) : ''
                    }
                />
            );
    }
}

/** Render an array config field */
function ArrayFieldInput({
    field,
    value,
    onChange,
}: {
    field: ConfigField;
    value: unknown[];
    onChange: (val: unknown[]) => void;
}) {
    const items = Array.isArray(value) ? value : [];
    const schema = field.arrayItemSchema ?? [];

    const addItem = () => {
        const newItem: Record<string, unknown> = {};
        schema.forEach((f) => {
            if (f.default !== undefined) newItem[f.key] = f.default;
        });
        onChange([...items, newItem]);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, key: string, val: unknown) => {
        const updated = [...items];
        updated[index] = {
            ...(updated[index] as Record<string, unknown>),
            [key]: val,
        };
        onChange(updated);
    };

    return (
        <div className="array-field">
            {items.map((item, index) => (
                <div key={index} className="array-item">
                    <div className="array-item-header">
                        <span className="array-item-index">#{index + 1}</span>
                        <button
                            type="button"
                            className="array-item-remove"
                            onClick={() => removeItem(index)}
                            aria-label="Remove item"
                        >
                            ×
                        </button>
                    </div>
                    <div className="array-item-fields">
                        {schema.map((subField) => (
                            <div
                                key={subField.key}
                                className="config-field config-field-nested"
                            >
                                <label className="config-label">
                                    {subField.label}
                                </label>
                                <ConfigFieldInput
                                    field={subField}
                                    value={
                                        (item as Record<string, unknown>)?.[
                                            subField.key
                                        ]
                                    }
                                    onChange={(val) =>
                                        updateItem(index, subField.key, val)
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            <button type="button" className="array-add-btn" onClick={addItem}>
                + Add Item
            </button>
        </div>
    );
}

/** Config editor modal */
function ConfigEditor({
    plugin,
    onSave,
    onClose,
    saving,
}: {
    plugin: PluginInfo;
    onSave: (config: Record<string, unknown>) => void;
    onClose: () => void;
    saving: boolean;
}) {
    const [config, setConfig] = useState<Record<string, unknown>>(() => {
        // Initialize with current config or defaults from schema
        const initial: Record<string, unknown> = { ...plugin.config };
        plugin.configSchema?.forEach((field) => {
            if (
                initial[field.key] === undefined &&
                field.default !== undefined
            ) {
                initial[field.key] = field.default;
            }
        });
        return initial;
    });

    const handleFieldChange = (key: string, value: unknown) => {
        setConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(config);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{plugin.name} Configuration</h2>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {plugin.configSchema &&
                        plugin.configSchema.length > 0 ? (
                            plugin.configSchema.map((field) => (
                                <div key={field.key} className="config-field">
                                    <label className="config-label">
                                        {field.label}
                                        {field.required && (
                                            <span className="required">*</span>
                                        )}
                                    </label>
                                    {field.description && (
                                        <p className="config-description">
                                            {field.description}
                                        </p>
                                    )}
                                    <ConfigFieldInput
                                        field={field}
                                        value={config[field.key]}
                                        onChange={(val) =>
                                            handleFieldChange(field.key, val)
                                        }
                                    />
                                </div>
                            ))
                        ) : (
                            <p className="muted">
                                This plugin has no configurable options.
                            </p>
                        )}
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !plugin.configSchema?.length}
                        >
                            {saving ? 'Saving...' : 'Save & Restart'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function App() {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toggling, setToggling] = useState<string | null>(null);
    const [selectedPlugin, setSelectedPlugin] = useState<PluginInfo | null>(
        null
    );
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const list = await fetchPlugins();
            setPlugins(list);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load plugins');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleToggle = async (e: React.MouseEvent, plugin: PluginInfo) => {
        e.stopPropagation(); // Prevent opening config modal
        const newEnabled = plugin.state !== 'enabled';
        setToggling(plugin.id);
        try {
            const updated = await setPluginEnabled(plugin.id, newEnabled);
            // Update immediately with response
            setPlugins((prev) =>
                prev.map((p) => (p.id === plugin.id ? updated : p))
            );
            // Also re-fetch to ensure state is synced (fixes toggle not reflecting)
            const freshList = await fetchPlugins();
            setPlugins(freshList);
        } catch (e) {
            setError(
                e instanceof Error ? e.message : 'Failed to update plugin'
            );
        } finally {
            setToggling(null);
        }
    };

    const handleEditClick = (e: React.MouseEvent, plugin: PluginInfo) => {
        e.stopPropagation();
        setSelectedPlugin(plugin);
    };

    const handleSaveConfig = async (config: Record<string, unknown>) => {
        if (!selectedPlugin) return;
        setSaving(true);
        try {
            const updated = await updatePluginConfig(selectedPlugin.id, config);
            setPlugins((prev) =>
                prev.map((p) => (p.id === selectedPlugin.id ? updated : p))
            );
            setSelectedPlugin(null);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save config');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="app">
            <header className="header">
                <h1>Diana</h1>
            </header>

            <main className="main">
                {error && (
                    <div className="banner error">
                        {error}
                        <button
                            type="button"
                            onClick={() => setError(null)}
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                )}

                {loading ? (
                    <p className="muted">Loading plugins…</p>
                ) : (
                    <section className="plugins">
                        <h2>Available plugins</h2>
                        <ul className="plugin-grid">
                            {plugins.map((plugin) => {
                                const canToggle =
                                    plugin.state === 'enabled' ||
                                    plugin.state === 'disabled' ||
                                    plugin.state === 'loaded';
                                const isOn = plugin.state === 'enabled';
                                const busy = toggling === plugin.id;

                                return (
                                    <li
                                        key={plugin.id}
                                        className={`plugin-card ${isOn ? 'enabled' : 'disabled'}`}
                                    >
                                        {/* Edit button in top right - always visible */}
                                        <button
                                            type="button"
                                            className="plugin-edit-btn"
                                            onClick={(e) =>
                                                handleEditClick(e, plugin)
                                            }
                                            aria-label="Edit plugin configuration"
                                            title="Edit configuration"
                                        >
                                            <svg
                                                width="14"
                                                height="14"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                <path d="m15 5 4 4" />
                                            </svg>
                                        </button>
                                        {plugin.icon && (
                                            <img
                                                src={plugin.icon}
                                                alt=""
                                                className="plugin-icon"
                                            />
                                        )}
                                        <div className="plugin-info">
                                            <div className="plugin-name">
                                                {plugin.name}
                                            </div>
                                            <div className="plugin-meta">
                                                <span className="plugin-version">
                                                    v{plugin.version}
                                                </span>
                                            </div>
                                            {plugin.error && (
                                                <p className="plugin-error">
                                                    {plugin.error}
                                                </p>
                                            )}
                                        </div>
                                        {canToggle && (
                                            <button
                                                type="button"
                                                className={`toggle ${isOn ? 'on' : 'off'}`}
                                                onClick={(e) =>
                                                    handleToggle(e, plugin)
                                                }
                                                disabled={busy}
                                                aria-pressed={isOn}
                                                aria-label={
                                                    isOn
                                                        ? 'Disable plugin'
                                                        : 'Enable plugin'
                                                }
                                            >
                                                <span className="toggle-track">
                                                    <span className="toggle-thumb" />
                                                </span>
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                        {plugins.length === 0 && !loading && (
                            <p className="muted">No plugins registered.</p>
                        )}
                    </section>
                )}
            </main>

            {selectedPlugin && (
                <ConfigEditor
                    plugin={selectedPlugin}
                    onSave={handleSaveConfig}
                    onClose={() => setSelectedPlugin(null)}
                    saving={saving}
                />
            )}
        </div>
    );
}
