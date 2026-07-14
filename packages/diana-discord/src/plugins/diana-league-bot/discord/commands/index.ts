import { championStatsCommand } from './championStatsCommand';
import { interOfTheWeekCommand } from './interOfTheWeekCommand';
import { mvpOfTheWeekCommand } from './mvpOfTheWeekCommand';
import { summonerInfoCommand } from './summonerInfoCommand';
import { setChannelCommand } from './setChannelCommand';
import { addSummonerCommand } from './addSummonerCommand';
import { removeSummonerCommand } from './removeSummonerCommand';
import { configCommand } from './configCommand';
import { helpCommand } from './helpCommand';

export const leagueDiscordCommands = [
    interOfTheWeekCommand,
    mvpOfTheWeekCommand,
    summonerInfoCommand,
    championStatsCommand,
    setChannelCommand,
    addSummonerCommand,
    removeSummonerCommand,
    configCommand,
    helpCommand,
];

export {
    interOfTheWeekCommand,
    mvpOfTheWeekCommand,
    summonerInfoCommand,
    championStatsCommand,
    setChannelCommand,
    addSummonerCommand,
    removeSummonerCommand,
    configCommand,
    helpCommand,
};
