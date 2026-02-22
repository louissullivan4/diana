import { championStatsCommand } from './championStatsCommand';
import { interOfTheWeekCommand } from './interOfTheWeekCommand';
import { summonerInfoCommand } from './summonerInfoCommand';

export const leagueDiscordCommands = [
    interOfTheWeekCommand,
    summonerInfoCommand,
    championStatsCommand,
];

export { interOfTheWeekCommand, summonerInfoCommand, championStatsCommand };
