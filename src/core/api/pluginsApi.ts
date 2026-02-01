import { Router, type Request, type Response } from 'express';
import {
    getPlugins,
    enablePlugin,
    disablePlugin,
    setPluginConfig,
    getPlugin,
} from '../pluginRegistry';

const router = Router();

/** Formatted timestamp for logs */
function timestamp(): string {
    return new Date().toISOString();
}

/** Log API requests */
function logApi(method: string, path: string, message: string): void {
    console.log(`[${timestamp()}] [Diana:API] ${method} ${path} - ${message}`);
}

router.get('/', (_req: Request, res: Response) => {
    try {
        const plugins = getPlugins();
        logApi('GET', '/api/plugins', `Returning ${plugins.length} plugin(s)`);
        res.json(plugins);
    } catch (err) {
        console.error(
            `[${timestamp()}] [Diana:API] GET /api/plugins error:`,
            err
        );
        res.status(500).json({ error: 'Failed to list plugins' });
    }
});

router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const plugin = getPlugin(id);
    if (!plugin) {
        logApi('GET', `/api/plugins/${id}`, 'Plugin not found');
        res.status(404).json({ error: 'Plugin not found' });
        return;
    }
    const list = getPlugins();
    const info = list.find((p) => p.id === id);
    logApi(
        'GET',
        `/api/plugins/${id}`,
        `Returning plugin info (state: ${info?.state})`
    );
    res.json(info);
});

router.patch('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const plugin = getPlugin(id);
    if (!plugin) {
        logApi('PATCH', `/api/plugins/${id}`, 'Plugin not found');
        res.status(404).json({ error: 'Plugin not found' });
        return;
    }
    const { enabled, config } = req.body as {
        enabled?: boolean;
        config?: Record<string, unknown>;
    };

    // Log what's being requested
    const actions: string[] = [];
    if (config !== undefined) actions.push('update config');
    if (enabled === true) actions.push('enable');
    if (enabled === false) actions.push('disable');
    logApi(
        'PATCH',
        `/api/plugins/${id}`,
        `Request to: ${actions.join(', ') || 'no changes'}`
    );

    try {
        // If config changed, save it and restart the plugin if it's enabled
        if (config && typeof config === 'object') {
            setPluginConfig(id, config);

            // Restart plugin to apply new config (disable then re-enable)
            if (plugin.state === 'enabled') {
                logApi(
                    'PATCH',
                    `/api/plugins/${id}`,
                    'Restarting plugin to apply new config...'
                );
                await disablePlugin(id);
                await enablePlugin(id);
                logApi(
                    'PATCH',
                    `/api/plugins/${id}`,
                    'Plugin restarted successfully'
                );
            }
        }

        // Handle enable/disable toggle (only if not already handled by config restart)
        if (typeof enabled === 'boolean') {
            if (enabled && plugin.state !== 'enabled') {
                await enablePlugin(id);
            } else if (!enabled && plugin.state === 'enabled') {
                await disablePlugin(id);
            }
        }

        const list = getPlugins();
        const info = list.find((p) => p.id === id);
        logApi(
            'PATCH',
            `/api/plugins/${id}`,
            `Completed, new state: ${info?.state}`
        );
        res.json(info);
    } catch (err) {
        // Use safe logging to avoid format string injection with user-provided id
        console.error(
            '[%s] [Diana:API] PATCH /api/plugins/%s error:',
            timestamp(),
            String(id),
            err
        );
        res.status(500).json({
            error:
                err instanceof Error ? err.message : 'Failed to update plugin',
        });
    }
});

export const pluginsApiRouter = router;
