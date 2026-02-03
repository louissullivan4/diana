import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { setExpressApp, registerPlugin, loadPlugin } from './pluginRegistry';
import { registerSlashCommands } from './discord/commandRegistry';
import { pingCommand } from './discord/coreCommands';
import { pluginsApiRouter } from './api/pluginsApi';
import { authApiRouter } from './api/authApi';
import { requireAuth } from './auth/authMiddleware';
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
    app.use(cookieParser());

    const PORT = Number(process.env.PORT) || 3000;
    const inRailway = Boolean(process.env.RAILWAY_PUBLIC_DOMAIN);

    // Public routes (no auth required)
    app.get('/', (_req, res) => {
        res.json({ status: 'ok', service: 'diana' });
    });
    app.get('/api/health', (_req, res) => {
        res.json({ status: 'ok', service: 'diana' });
    });

    // Auth routes (login/logout don't require auth)
    app.use('/api/auth', authApiRouter);

    // Protected routes (require authentication)
    app.use('/api/plugins', requireAuth, pluginsApiRouter);

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

    const servers: ReturnType<typeof app.listen>[] = [];
    const startHttpServer = (port: number, label: string) => {
        const server = app.listen(port, '0.0.0.0', () => {
            console.log(
                `[Diana] Server running on port ${port} (0.0.0.0) ${label}`
            );
        });
        server.on('error', (err) => {
            console.error('[Diana] HTTP server error:', err);
        });
        servers.push(server);
    };

    startHttpServer(PORT, '(primary)');

    // Railway sometimes routes traffic to a configured port that differs from PORT.
    // To avoid 502s, also listen on 3001 when running on Railway.
    if (inRailway && PORT !== 3001) {
        startHttpServer(3001, '(railway fallback)');
    }

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
        let remaining = servers.length;
        if (remaining === 0) {
            process.exit(0);
            return;
        }
        for (const srv of servers) {
            srv.close(() => {
                remaining -= 1;
                if (remaining === 0) {
                    process.exit(0);
                }
            });
        }
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

main().catch((err) => {
    console.error('[Diana] Fatal error:', err);
    process.exit(1);
});
