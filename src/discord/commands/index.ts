import type { SlashCommand } from '../commandService';
import { pingCommand } from './pingCommand';

export const slashCommands: SlashCommand[] = [pingCommand];
