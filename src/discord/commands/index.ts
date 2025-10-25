import type { SlashCommand } from '../commandService';
import { interOfTheWeekCommand } from './interOfTheWeekCommand';
import { pingCommand } from './pingCommand';
import { summonerInfoCommand } from './summonerInfoCommand';

export const slashCommands: SlashCommand[] = [
    pingCommand,
    interOfTheWeekCommand,
    summonerInfoCommand,
];
