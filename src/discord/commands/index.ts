import type { SlashCommand } from '../commandService';
import { interOfTheWeekCommand } from './interOfTheWeekCommand';
import { pingCommand } from './pingCommand';
import { summonerInfoCommand } from './summonerInfoCommand';
import { championStatsCommand } from './championStatsCommand';

export const slashCommands: SlashCommand[] = [
    pingCommand,
    interOfTheWeekCommand,
    summonerInfoCommand,
    championStatsCommand,
];
