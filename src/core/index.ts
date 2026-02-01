import 'dotenv/config';
import express from 'express';
import path from 'path';
import { setExpressApp, registerPlugin, loadPlugin } from './pluginRegistry';
import { registerSlashCommands } from './discord/commandRegistry';
import { pingCommand } from './discord/coreCommands';
import { pluginsApiRouter } from './api/pluginsApi';
import { setupAndStartDiscord } from './discord/setupDiscord';

async function main() {
    const app = express();
    app.use(express.json());

    const PORT = Number(process.env.PORT) || 3000;

    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', service: 'diana' });
    });
    app.use('/api/plugins', pluginsApiRouter);

    setExpressApp(app);

    registerSlashCommands([pingCommand]);

    const { leagueBotPlugin } = await import('../plugins/diana-league-bot');
    registerPlugin(leagueBotPlugin);
    await loadPlugin(leagueBotPlugin.id);

    const dashboardDir = path.join(process.cwd(), 'dashboard', 'dist');
    try {
        const fs = await import('fs');
        const stat = fs.statSync(dashboardDir);
        if (stat.isDirectory()) {
            app.use('/dashboard', express.static(dashboardDir));
            app.get('/dashboard', (_req, res) => {
                res.sendFile(path.join(dashboardDir, 'index.html'));
            });
            app.get('/dashboard/*splat', (_req, res) => {
                res.sendFile(path.join(dashboardDir, 'index.html'));
            });
            console.log(
                '[Diana] Dashboard at http://localhost:' + PORT + '/dashboard'
            );
        }
    } catch {
        console.log(
            '[Diana] No dashboard build at dashboard/dist; run "npm run build" in dashboard/.'
        );
    }

    const server = app.listen(PORT, () => {
        console.log(`[Diana] Server running on port ${PORT}`);
    });

    await setupAndStartDiscord();

    const shutdown = () => {
        console.log('[Diana] Shutting down...');
        server.close(() => {
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('[Diana] Fatal error:', err);
    process.exit(1);
});
