// services/discordService.js
require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
  ],
});

client.login(process.env.DISCORD_BOT_TOKEN);

async function sendDiscordMessage(channelId, message) {
  if (!channelId) throw new Error('Channel ID not provided.');
  if (!message) throw new Error('Message content not provided.');

  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`Channel with ID ${channelId} not found.`);

  await channel.send(message);
}

async function notifyMatchEnd(matchSummary) {
  const {
    summonerName,
    result,
    rankMsg,
    lpChangeMsg,
    champion,
    role,
    kdaStr,
    damage,
    discordChannelId,
    deepLolLink
  } = matchSummary;

  const embed = createMatchEndEmbed(
    summonerName,
    result,
    rankMsg,
    lpChangeMsg,
    champion,
    role,
    kdaStr,
    damage,
    discordChannelId,
    deepLolLink
  );

  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match end message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
}


async function notifyMatchStart(matchStartInfo) {
  const {
    summonerName,
    queueName,
    championDisplay,
    rankString,
    discordChannelId,
    deepLolLink
  } = matchStartInfo;

  const embed = createMatchStartEmbed(
    summonerName,
    queueName,
    championDisplay,
    rankString,
    deepLolLink
  );

  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match start message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
}

function createMatchStartEmbed(
  summonerName,
  queueName,
  championDisplay,
  rankString,
  deepLolLink
) {
  let embedColor = 0x3498db;

  const rankColors = {
    'IRON': 0x7f8c8d,        // Gray
    'BRONZE': 0xe67e22,      // Orange
    'SILVER': 0x95a5a6,      // Light Gray
    'GOLD': 0xf1c40f,        // Yellow
    'PLATINUM': 0x9b59b6,    // Purple
    'DIAMOND': 0x2980b9,     // Blue
    'MASTER': 0xe74c3c,      // Red
    'GRANDMASTER': 0xc0392b, // Dark Red
    'CHALLENGER': 0xf39c12   // Gold
  };

  const tierMatch = rankString.match(/(\w+)\s+\w+/);
  if (tierMatch && tierMatch[1].toUpperCase() in rankColors) {
    embedColor = rankColors[tierMatch[1].toUpperCase()];
  }

  const validChampionName = championDisplay.replace(/\s+/g, '');
  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(validChampionName)}.png`;

  const embed = new EmbedBuilder()
    .setTitle('🎮 **Match Started!**')
    .setDescription(`${summonerName} has started a match!`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .setThumbnail(championThumbnail)
    .addFields(
      {
        name: '🕹️ **Queue**',
        value: `**${queueName}**`,
        inline: true,
      },
      {
        name: '🛡️ **Champion**',
        value: `**${championDisplay}**`,
        inline: true,
      },
      {
        name: '🏆 **Current Rank**',
        value: `**${rankString}**`,
        inline: true,
      },
    )
    .setTimestamp()
    .setFooter({ text: 'Match Started' });
  return embed;
}

function createMatchEndEmbed(
  summonerName,
  result,
  newRankMsg,
  lpChangeMsg,
  champion,
  role,
  kdaStr,
  damage,
  deepLolLink
) {
  let embedColor;
  switch (result.toLowerCase()) {
    case 'win':
      embedColor = 0x28a745; // Green
      break;
    case 'lose':
      embedColor = 0xe74c3c; // Red
      break;
    case 'remake':
      embedColor = 0xe67e22; // Orange
      break;
    default:
      embedColor = 0x95a5a6; // Gray for unknown results
  }

  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(
    champion
  )}.png`;

  const embed = new EmbedBuilder()
  .setTitle('🎮 **Match Summary**')
  .setDescription(`${summonerName} has completed a match!`)
  .setURL(deepLolLink)
  .setColor(embedColor)
  .setThumbnail(championThumbnail)
  .addFields(
    {
      name: '🏁 **Result**',
      value: `**${result}**`,
      inline: true,
    },
    {
      name: '📈 **Rank Update**',
      value: `**${newRankMsg}**`,
      inline: true,
    },
    {
      name: '🔄 **LP Change**',
      value: `**${lpChangeMsg} LP**`,
      inline: true,
    },
    {
      name: '🛡️ **Champion**',
      value: `**${champion}**`,
      inline: true,
    },
    {
      name: '🎯 **Role**',
      value: `**${role}**`,
      inline: true,
    },
    {
      name: '⚔️ **KDA**',
      value: `**${kdaStr}**`,
      inline: true,
    },
    {
      name: '💥 **Damage Dealt**',
      value: `**${damage}**`,
      inline: true,
    }
  )
  .setTimestamp()
  .setFooter({ text: 'Match Summary' });
  return embed;
}

function createRankChangeEmbed(
  summonerName,
  direction,
  newRankMsg,
  lpChangeMsg,
  deepLolLink
) {
  let embedColor;
  let title;

  if (direction === 'promoted') {
    embedColor = 0x28a745; // Green
    title = '📈 **Rank Promotion!**';
  } else if (direction === 'demoted') {
    embedColor = 0xe74c3c; // Red
    title = '📉 **Rank Demotion...**';
  } else {
    return null;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${summonerName} has ${direction === 'up' ? 'ranked up!' : 'been demoted.'}`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .addFields(
      {
        name: '🏆 **Rank Change**',
        value: `**${newRankMsg}**`,
        inline: true,
      },
      {
        name: '🔄 **LP Change**',
        value: `**${lpChangeMsg} LP**`,
        inline: true,
      }
    )
    .setTimestamp()
    .setFooter({ text: 'Rank Change Notification' });
  return embed;
}

async function notifyRankChange(rankChangeInfo) {
  const {
    summonerName,
    direction,
    newRankMsg,
    lpChangeMsg,
    discordChannelId,
    deepLolLink
  } = rankChangeInfo;

  const embed = createRankChangeEmbed(
    summonerName,
    direction,
    newRankMsg,
    lpChangeMsg,
    deepLolLink
  );

  if (!embed) return;

  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent rank change message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send rank change message for ${summonerName}:`, error);
  }
}

module.exports = {
  sendDiscordMessage,
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange
};