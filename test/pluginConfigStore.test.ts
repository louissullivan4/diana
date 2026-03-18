// Mock fs before any imports so the module never touches the real filesystem.
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Always fetches the *current* mock instance — safe to call after resetModules()
function fsMock() {
    return jest.requireMock('fs') as {
        existsSync: jest.Mock;
        mkdirSync: jest.Mock;
        readFileSync: jest.Mock;
        writeFileSync: jest.Mock;
    };
}

function requireStore() {
    return require('../packages/diana-core/src/core/config/pluginConfigStore') as typeof import('../packages/diana-core/src/core/config/pluginConfigStore');
}

function setupFilesystem(entries: object[] = []) {
    const fs = fsMock();
    // Simulate a real filesystem: writes update what reads return
    let diskData = JSON.stringify(entries);
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation(() => diskData);
    fs.writeFileSync.mockImplementation((_path: string, data: string) => {
        diskData = data;
    });
    fs.mkdirSync.mockImplementation(() => undefined);
}

// ---------------------------------------------------------------------------
// isPluginEnabled
// ---------------------------------------------------------------------------

describe('isPluginEnabled', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns true for an enabled plugin', () => {
        setupFilesystem([{ id: 'plugin-a', enabled: true, config: {} }]);
        const store = requireStore();
        expect(store.isPluginEnabled('plugin-a')).toBe(true);
    });

    it('returns false for a disabled plugin', () => {
        setupFilesystem([{ id: 'plugin-a', enabled: false, config: {} }]);
        const store = requireStore();
        expect(store.isPluginEnabled('plugin-a')).toBe(false);
    });

    it('returns true for an unknown plugin (default enabled)', () => {
        setupFilesystem([]);
        const store = requireStore();
        expect(store.isPluginEnabled('plugin-unknown')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getPluginConfig
// ---------------------------------------------------------------------------

describe('getPluginConfig', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns the config entry for a known plugin', () => {
        const entry = {
            id: 'plugin-a',
            enabled: true,
            config: { key: 'value' },
        };
        setupFilesystem([entry]);
        const store = requireStore();
        expect(store.getPluginConfig('plugin-a')).toEqual(entry);
    });

    it('returns undefined for an unknown plugin', () => {
        setupFilesystem([]);
        const store = requireStore();
        expect(store.getPluginConfig('plugin-unknown')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// setPluginEnabled
// ---------------------------------------------------------------------------

describe('setPluginEnabled', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('updates an existing plugin entry and writes to disk', () => {
        setupFilesystem([{ id: 'plugin-a', enabled: true, config: {} }]);
        const store = requireStore();
        store.setPluginEnabled('plugin-a', false);
        expect(store.isPluginEnabled('plugin-a')).toBe(false);
        const fs = fsMock();
        expect(fs.writeFileSync).toHaveBeenCalled();
        const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        expect(written[0].enabled).toBe(false);
    });

    it('creates a new entry when plugin does not exist and writes to disk', () => {
        setupFilesystem([]);
        const store = requireStore();
        store.setPluginEnabled('plugin-new', false);
        expect(store.isPluginEnabled('plugin-new')).toBe(false);
        expect(fsMock().writeFileSync).toHaveBeenCalled();
    });

    it('can re-enable a previously disabled plugin', () => {
        setupFilesystem([{ id: 'plugin-a', enabled: false, config: {} }]);
        const store = requireStore();
        store.setPluginEnabled('plugin-a', true);
        expect(store.isPluginEnabled('plugin-a')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getPluginConfigData
// ---------------------------------------------------------------------------

describe('getPluginConfigData', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns typed config data for a known plugin', () => {
        setupFilesystem([
            { id: 'plugin-a', enabled: true, config: { apiKey: 'abc123' } },
        ]);
        const store = requireStore();
        const data = store.getPluginConfigData<{ apiKey: string }>('plugin-a');
        expect(data.apiKey).toBe('abc123');
    });

    it('returns empty object for an unknown plugin', () => {
        setupFilesystem([]);
        const store = requireStore();
        const data = store.getPluginConfigData('plugin-unknown');
        expect(data).toEqual({});
    });
});

// ---------------------------------------------------------------------------
// setPluginConfigData
// ---------------------------------------------------------------------------

describe('setPluginConfigData', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('merges config data into an existing plugin entry and writes to disk', () => {
        setupFilesystem([
            { id: 'plugin-a', enabled: true, config: { existing: 'yes' } },
        ]);
        const store = requireStore();
        store.setPluginConfigData('plugin-a', { newKey: 'newValue' });
        const data = store.getPluginConfigData<{
            existing: string;
            newKey: string;
        }>('plugin-a');
        expect(data.existing).toBe('yes');
        expect(data.newKey).toBe('newValue');
        expect(fsMock().writeFileSync).toHaveBeenCalled();
    });

    it('creates a new entry when plugin does not exist', () => {
        setupFilesystem([]);
        const store = requireStore();
        store.setPluginConfigData('plugin-new', { setting: 'on' });
        const data = store.getPluginConfigData<{ setting: string }>(
            'plugin-new'
        );
        expect(data.setting).toBe('on');
    });

    it('overwrites an existing key with the new value', () => {
        setupFilesystem([
            { id: 'plugin-a', enabled: true, config: { key: 'old' } },
        ]);
        const store = requireStore();
        store.setPluginConfigData('plugin-a', { key: 'new' });
        const data = store.getPluginConfigData<{ key: string }>('plugin-a');
        expect(data.key).toBe('new');
    });

    it('writes updated config to disk', () => {
        setupFilesystem([{ id: 'plugin-a', enabled: true, config: {} }]);
        const store = requireStore();
        store.setPluginConfigData('plugin-a', { token: 'xyz' });
        const fs = fsMock();
        expect(fs.writeFileSync).toHaveBeenCalled();
        const written = JSON.parse(fs.writeFileSync.mock.calls[0][1]);
        expect(written[0].config.token).toBe('xyz');
    });
});

// ---------------------------------------------------------------------------
// getAllPluginConfigs
// ---------------------------------------------------------------------------

describe('getAllPluginConfigs', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns all plugin config entries', () => {
        const entries = [
            { id: 'plugin-a', enabled: true, config: {} },
            { id: 'plugin-b', enabled: false, config: { x: 1 } },
        ];
        setupFilesystem(entries);
        const store = requireStore();
        expect(store.getAllPluginConfigs()).toEqual(entries);
    });

    it('returns empty array when no plugins are configured', () => {
        setupFilesystem([]);
        const store = requireStore();
        expect(store.getAllPluginConfigs()).toEqual([]);
    });

    it('returns empty array when config file does not exist', () => {
        const fs = fsMock();
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => undefined);
        fs.writeFileSync.mockImplementation(() => undefined);
        const store = requireStore();
        expect(store.getAllPluginConfigs()).toEqual([]);
    });

    it('returns empty array when config file contains invalid JSON', () => {
        const fs = fsMock();
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockImplementation(() => undefined);
        fs.readFileSync.mockReturnValue('not-valid-json{{{');
        const store = requireStore();
        expect(store.getAllPluginConfigs()).toEqual([]);
    });

    it('returns empty array when config file contains a non-array', () => {
        const fs = fsMock();
        fs.existsSync.mockReturnValue(true);
        fs.mkdirSync.mockImplementation(() => undefined);
        fs.readFileSync.mockReturnValue(JSON.stringify({ id: 'plugin-a' }));
        const store = requireStore();
        expect(store.getAllPluginConfigs()).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// In-memory fallback (filesystem unavailable)
// ---------------------------------------------------------------------------

describe('in-memory fallback when filesystem is unavailable', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('stores and retrieves config in memory when mkdirSync throws', () => {
        const fs = fsMock();
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {
            throw new Error('read-only filesystem');
        });
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);

        const store = requireStore();
        store.setPluginEnabled('plugin-x', true);
        expect(store.isPluginEnabled('plugin-x')).toBe(true);
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
});
