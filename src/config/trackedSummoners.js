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
    deepLolLink: 'https://www.deeplol.gg/summoner/euw/YngStew-1495'
  },
  {
    puuid: 'ywqK5bySVAUGZXGcDAZns5wSZkKSL2gUA3_wBZQ57VdMm5UbeTNrN3J1YNaH97CACg7pe5g0oxkGdA',
    summonerName: 'I miss her',
    tagLine: 'Ascd',
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    regionGroup: Constants.RegionGroups.EUROPE,
    matchRegionPrefix: 'EUW1',
    deepLolLink: 'https://www.deeplol.gg/summoner/euw/I%20miss%20her-Ascd'
  },
  {
    puuid: '-vOh0Ir-mWULhY60-hjRm4BkEIgR1iBv8NataullPeH8VWejnrVPO_qOYZSoivnIs_jtytaeSKWMhg',
    summonerName: 'YouKnowWho',
    tagLine: 'EUW',
    discordChannelId: process.env.DISCORD_CHANNEL_ID,
    regionGroup: Constants.RegionGroups.EUROPE,
    matchRegionPrefix: 'EUW1',
    deepLolLink: 'https://www.deeplol.gg/summoner/euw/I%20miss%20her-Ascd'
  },
];

module.exports = trackedSummoners;