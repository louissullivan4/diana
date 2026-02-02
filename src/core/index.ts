import 'dotenv/config';
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { setExpressApp, registerPlugin, loadPlugin } from './pluginRegistry';
import { registerSlashCommands } from './discord/commandRegistry';
import { pingCommand } from './discord/coreCommands';
import { pluginsApiRouter } from './api/pluginsApi';
import { setupAndStartDiscord } from './discord/setupDiscord';

// Rate limiter for dashboard routes (100 requests per minute per IP)
const dashboardLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

async function main() {
    const app = express();
    app.use((req, res, next) => {
        const start = Date.now();
        const host = req.headers.host ?? 'unknown-host';
        const ua = req.headers['user-agent'] ?? 'unknown-ua';
        console.log(
            `[Diana:HTTP] --> ${req.method} ${req.originalUrl} host=${host} ip=${req.ip} ua="${ua}"`
        );
        res.on('finish', () => {
            const durationMs = Date.now() - start;
            console.log(
                `[Diana:HTTP] <-- ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`
            );
        });
        next();
    });
    app.use(express.json());

    const PORT = Number(process.env.PORT) || 3000;

    app.get('/', (_req, res) => {
        res.json({ status: 'ok', service: 'diana' });
    });
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
    const indexHtmlPath = path.join(dashboardDir, 'index.html');
    try {
        const fs = await import('fs');
        const stat = fs.statSync(dashboardDir);
        if (stat.isDirectory()) {
            // Apply rate limiting to dashboard routes
            app.use(
                '/dashboard',
                dashboardLimiter,
                express.static(dashboardDir)
            );
            app.get('/dashboard', dashboardLimiter, (_req, res) => {
                res.sendFile(indexHtmlPath);
            });
            app.get('/dashboard/*splat', dashboardLimiter, (_req, res) => {
                res.sendFile(indexHtmlPath);
            });
            const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN
                ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
                : `http://localhost:${PORT}`;
            console.log(`[Diana] Dashboard available at ${baseUrl}/dashboard`);
        }
    } catch {
        console.log(
            '[Diana] No dashboard build at dashboard/dist; run "npm run build" in dashboard/.'
        );
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Diana] Server running on port ${PORT} (0.0.0.0)`);
    });
    server.on('error', (err) => {
        console.error('[Diana] HTTP server error:', err);
    });

    try {
        await setupAndStartDiscord();
    } catch (err) {
        console.error(
            '[Diana] Discord startup failed; continuing without Discord:',
            err
        );
    }

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
