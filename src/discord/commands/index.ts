import type { SlashCommand } from '../commandService';
import { interOfTheWeekCommand } from './interOfTheWeekCommand';
import { pingCommand } from './pingCommand';

export const slashCommands: SlashCommand[] = [
    pingCommand,
    interOfTheWeekCommand,
];
