import type { DianaPlugin, ConfigField } from '../../core/pluginTypes';
import { summonerRouter } from './api/summoners/summonerRoutes';
import { matchRouter } from './api/matches/matchRoutes';
import { createMatchMonitoringTick } from './monitoring/matchMonitoringService';
import type { LeagueBotConfig } from './types';

const defaultConfig: LeagueBotConfig = {
    matchCheckCron: '0 * * * * *',
};

const configSchema: ConfigField[] = [
    {
        key: 'matchCheckCron',
        label: 'Match Check Schedule',
        type: 'string',
        description:
            'Cron expression for match checking (default: every minute)',
        required: false,
        default: '0 * * * * *',
    },
];

export const leagueBotPlugin: DianaPlugin = {
    id: 'diana-league-bot',
    name: 'League Bot',
    version: '1.0.0',
    description:
        'League of Legends match tracking, summoner info, champion stats, and inter of the week.',
    icon: '/dashboard/icons/league-bot.png',
    configSchema,

    async onLoad(context) {
        context.mountRouter('/summoners', summonerRouter);
        context.mountRouter('/match', matchRouter);
    },

    async onEnable(context) {
        const storedConfig = context.getConfig<Partial<LeagueBotConfig>>();
        const config: LeagueBotConfig = { ...defaultConfig, ...storedConfig };

        console.log(`[LeagueBot] Enabling with config:`, {
            matchCheckCron: config.matchCheckCron,
        });

        const runTick = createMatchMonitoringTick(
            config,
            context.getMessageAdapter()
        );
        context.registerCron(config.matchCheckCron, runTick);
    },
};
