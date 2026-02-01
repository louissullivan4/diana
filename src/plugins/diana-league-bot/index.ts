import type { DianaPlugin, ConfigField } from '../../core/pluginTypes';
import { interOfTheWeekCommand } from './discord/commands/interOfTheWeekCommand';
import { summonerInfoCommand } from './discord/commands/summonerInfoCommand';
import { championStatsCommand } from './discord/commands/championStatsCommand';
import { summonerRouter } from './api/summoners/summonerRoutes';
import { matchRouter } from './api/matches/matchRoutes';
import { createMatchMonitoringTick } from './discord/matchMonitoringService';
import type { LeagueBotConfig } from './types';

/** Default configuration for the League Bot plugin */
const defaultConfig: LeagueBotConfig = {
    trackedSummoners: [],
    matchCheckCron: '*/20 * * * * *',
    defaultDiscordChannelId: undefined,
};

/** Config schema for the dashboard UI */
const configSchema: ConfigField[] = [
    {
        key: 'trackedSummoners',
        label: 'Tracked Summoners',
        type: 'array',
        description: 'List of summoners to track for match notifications',
        required: false,
        default: [],
        arrayItemSchema: [
            {
                key: 'puuid',
                label: 'PUUID',
                type: 'string',
                description: 'Riot PUUID of the summoner',
                required: true,
            },
            {
                key: 'name',
                label: 'Display Name',
                type: 'string',
                description: 'Optional display name for the dashboard',
                required: false,
            },
            {
                key: 'discordChannelId',
                label: 'Discord Channel ID',
                type: 'string',
                description: 'Override Discord channel for this summoner',
                required: false,
            },
        ],
    },
    {
        key: 'matchCheckCron',
        label: 'Match Check Schedule',
        type: 'string',
        description:
            'Cron expression for match checking (default: every 20 seconds)',
        required: false,
        default: '*/20 * * * * *',
    },
    {
        key: 'defaultDiscordChannelId',
        label: 'Default Discord Channel ID',
        type: 'string',
        description: 'Default Discord channel for match notifications',
        required: false,
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
        context.registerSlashCommands([
            interOfTheWeekCommand,
            summonerInfoCommand,
            championStatsCommand,
        ]);
        context.mountRouter('/summoners', summonerRouter);
        context.mountRouter('/match', matchRouter);
    },

    async onEnable(context) {
        // Merge default config with stored config
        const storedConfig = context.getConfig<Partial<LeagueBotConfig>>();
        const config: LeagueBotConfig = { ...defaultConfig, ...storedConfig };

        console.log(`[LeagueBot] Enabling with config:`, {
            trackedSummoners: config.trackedSummoners.length,
            matchCheckCron: config.matchCheckCron,
            defaultDiscordChannelId: config.defaultDiscordChannelId,
        });

        // Create a monitoring tick function with the current config
        const runTick = createMatchMonitoringTick(config);
        context.registerCron(config.matchCheckCron, runTick);
    },
};
