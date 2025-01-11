// config/trackedSummoners.js
const { Constants } = require('twisted');
require('dotenv').config();

const trackedSummoners = [
  {
    puuid: '01XS0CtuZCXjlubxeCMW3RFZTS7WAo38zHvFWeokv3rGK6XDYVW4pPG586vKrKdccA3Ru2KA0OtQag',
    summonerName: 'YngStew',
    tagLine: '1495',
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    regionGroup: Constants.RegionGroups.EUROPE,
    matchRegionPrefix: 'EUW1',
  },
  {
    puuid: 'ywqK5bySVAUGZXGcDAZns5wSZkKSL2gUA3_wBZQ57VdMm5UbeTNrN3J1YNaH97CACg7pe5g0oxkGdA',
    summonerName: 'I miss her',
    tagLine: 'Ascd',
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    regionGroup: Constants.RegionGroups.EUROPE,
    matchRegionPrefix: 'EUW1',
  },
];

module.exports = trackedSummoners;
