// Mocks must be declared before imports (jest.mock is hoisted)
const scheduleMock = jest.fn();

jest.mock('node-cron', () => ({
    schedule: scheduleMock,
}));

jest.mock('../packages/diana-core/src/core/config/pluginConfigStore', () => ({
    getPluginConfig: jest.fn().mockReturnValue({}),
    isPluginEnabled: jest.fn().mockReturnValue(false),
    setPluginEnabled: jest.fn(),
    getPluginConfigData: jest.fn().mockReturnValue({}),
    setPluginConfigData: jest.fn(),
}));

import {
    registerPlugin,
    loadPlugin,
    enablePlugin,
} from '../packages/diana-core/src/core/pluginRegistry';
import type {
    DianaPlugin,
    PluginContext,
} from '../packages/diana-core/src/core/pluginTypes';

function deferred() {
    let resolve!: () => void;
    let reject!: (err: Error) => void;
    const promise = new Promise<void>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

async function flushPromises() {
    await new Promise((resolve) => setImmediate(resolve));
}

describe('registerCron overlap guard', () => {
    beforeEach(() => {
        scheduleMock.mockReset();
        scheduleMock.mockReturnValue({ stop: jest.fn() });
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    async function setupPlugin(
        id: string,
        handler: () => Promise<void>
    ): Promise<() => void> {
        let tick!: () => void;
        scheduleMock.mockImplementation((_schedule: string, cb: () => void) => {
            tick = cb;
            return { stop: jest.fn() };
        });

        const plugin: DianaPlugin = {
            id,
            name: 'Test Plugin',
            version: '1.0.0',
            async onLoad() {},
            async onEnable(context: PluginContext) {
                context.registerCron('0 * * * * *', handler);
            },
        };

        registerPlugin(plugin);
        await loadPlugin(id);
        await enablePlugin(id);
        return tick;
    }

    it('skips a tick while the previous tick is still running', async () => {
        const gate = deferred();
        const handler = jest.fn(() => gate.promise);
        const tick = await setupPlugin('cron-test-overlap', handler);

        tick();
        tick();
        expect(handler).toHaveBeenCalledTimes(1);

        gate.resolve();
        await flushPromises();

        tick();
        expect(handler).toHaveBeenCalledTimes(2);
    });

    it('resets the in-flight flag when the handler rejects', async () => {
        const gate = deferred();
        const handler = jest.fn(() => gate.promise);
        const tick = await setupPlugin('cron-test-reject', handler);

        tick();
        expect(handler).toHaveBeenCalledTimes(1);

        gate.reject(new Error('tick failed'));
        await flushPromises();

        tick();
        expect(handler).toHaveBeenCalledTimes(2);
        expect(console.error).toHaveBeenCalled();
    });

    it('guards each registered cron independently', async () => {
        const ticks: Array<() => void> = [];
        scheduleMock.mockImplementation((_schedule: string, cb: () => void) => {
            ticks.push(cb);
            return { stop: jest.fn() };
        });

        const slowGate = deferred();
        const slowHandler = jest.fn(() => slowGate.promise);
        const fastHandler = jest.fn(() => Promise.resolve());

        const plugin: DianaPlugin = {
            id: 'cron-test-independent',
            name: 'Test Plugin',
            version: '1.0.0',
            async onLoad() {},
            async onEnable(context: PluginContext) {
                context.registerCron('0 * * * * *', slowHandler);
                context.registerCron('0 0 * * * *', fastHandler);
            },
        };

        registerPlugin(plugin);
        await loadPlugin('cron-test-independent');
        await enablePlugin('cron-test-independent');

        // Slow handler is in flight...
        ticks[0]();
        // ...but the second cron must not be starved by the first one's flag.
        ticks[1]();
        await flushPromises();
        ticks[1]();
        await flushPromises();

        expect(slowHandler).toHaveBeenCalledTimes(1);
        expect(fastHandler).toHaveBeenCalledTimes(2);

        slowGate.resolve();
        await flushPromises();
    });
});
