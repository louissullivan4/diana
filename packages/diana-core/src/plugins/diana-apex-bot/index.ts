import type { DianaPlugin } from '../../core/pluginTypes.js';
import type { ApexBotConfig } from './types.js';
import { playerRouter } from './api/players/playerRoutes.js';
import { runApexTick } from './monitoring/rankMonitoringService.js';

export const apexBotPlugin: DianaPlugin = {
    id: 'diana-apex-bot',
    name: 'Pathfinder (Apex Legends)',
    version: '1.0.0',
    description: 'Track Apex Legends players, rank changes, and stats.',
    icon: '🔫',

    configSchema: [
        {
            key: 'rankCheckCron',
            label: 'Rank Check Cron',
            type: 'string',
            default: '*/5 * * * *',
            description: 'Cron schedule for polling player ranks (default: every 5 minutes).',
        },
        {
            key: 'defaultDiscordChannelId',
            label: 'Default Discord Channel ID',
            type: 'string',
            default: '',
            description: 'Fallback channel for rank change notifications.',
        },
    ],

    async onLoad(context) {
        context.mountRouter('/apex/players', playerRouter);
        console.log('[Apex] Plugin loaded - routes mounted at /apex/players');
    },

    async onEnable(context) {
        const config = context.getConfig<ApexBotConfig>();
        const adapter = context.getMessageAdapter();
        const schedule = config?.rankCheckCron ?? '*/5 * * * *';

        context.registerCron(schedule, async () => {
            await runApexTick(adapter);
        });

        console.log(`[Apex] Plugin enabled - rank checks scheduled: ${schedule}`);
    },

    async onDisable() {
        console.log('[Apex] Plugin disabled.');
    },
};
