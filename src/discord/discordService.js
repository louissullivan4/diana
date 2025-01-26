require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
});

let hasClientLoggedIn = false;

const loginClient = async () => {
  if (hasClientLoggedIn) return;
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
    hasClientLoggedIn = true;
  } catch (error) {
    console.error('Could not login to Discord client:', error);
    throw new Error('Could not login to Discord client.');
  }
};

const rankColors = {
  IRON: 0x7f8c8d,
  BRONZE: 0xe67e22,
  SILVER: 0x95a5a6,
  GOLD: 0xf1c40f,
  PLATINUM: 0x9b59b6,
  DIAMOND: 0x2980b9,
  MASTER: 0xe74c3c,
  GRANDMASTER: 0xc0392b,
  CHALLENGER: 0xf39c12,
};

const resultColors = {
  win: 0x28a745,
  lose: 0xe74c3c,
  remake: 0xe67e22,
};

const roleQueues = [
  'Ranked Solo',
  'Normal Blind',
  'Ranked Flex',
  'Swiftplay',
  'Clash',
];

function getChampionThumbnail(championName) {
  const sanitized = championName.replace(/\s+/g, '');
  return `https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/${encodeURIComponent(
    sanitized
  )}.png`;
}

const sendDiscordMessage = async (channelId, message) => {
  if (!channelId) throw new Error('Channel ID not provided.');
  if (!message) throw new Error('Message content not provided.');
  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`Channel with ID ${channelId} not found.`);
  return channel.send(message);
};

function createMatchStartEmbed(
  summonerName,
  queueName,
  championDisplay,
  rankString,
  deepLolLink
) {
  const tier = rankString.match(/(\w+)\s+\w+/)?.[1]?.toUpperCase();
  const embedColor = rankColors[tier] || 0x3498db;
  const fields = [
    { name: '🕹️ **Queue**', value: `**${queueName}**`, inline: true },
    { name: '🛡️ **Champion**', value: `**${championDisplay}**`, inline: true },
  ];
  if (!queueName.toLowerCase().includes('ranked')) {
    fields.push({
      name: '🏆 **Current Rank**',
      value: `**${rankString}**`,
      inline: true,
    });
  }
  return new EmbedBuilder()
    .setTitle('🎮 **Match Started!**')
    .setDescription(`${summonerName} has started a match!`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .setThumbnail(getChampionThumbnail(championDisplay))
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: 'Match Started' });
}

function createMatchEndEmbed(
  summonerName,
  queueName,
  result,
  newRankMsg,
  lpChangeMsg,
  championDisplay,
  role,
  kdaStr,
  damage,
  deepLolLink
) {
  const embedColor = resultColors[result.toLowerCase()] || 0x95a5a6;
  const fields = [
    { name: '🏁 **Result**', value: `**${result}**`, inline: true },
    { name: '🛡️ **Champion**', value: `**${championDisplay}**`, inline: true },
    { name: '🕹️ **Queue**', value: `**${queueName}**`, inline: true },
  ];
  if (roleQueues.map(q => q.toLowerCase()).includes(queueName.toLowerCase())) {
    fields.push({ name: '🎯 **Role**', value: `**${role}**`, inline: true });
  }
  fields.push(
    { name: '⚔️ **KDA**', value: `**${kdaStr}**`, inline: true },
    { name: '💥 **Damage Dealt**', value: `**${damage}**`, inline: true }
  );
  if (queueName.toLowerCase().includes('ranked')) {
    fields.splice(
      1,
      0,
      { name: '📈 **Rank Update**', value: `**${newRankMsg}**`, inline: true },
      { name: '🔄 **LP Change**', value: `**${lpChangeMsg} LP**`, inline: true }
    );
  }
  return new EmbedBuilder()
    .setTitle('🎮 **Match Summary**')
    .setDescription(`${summonerName} has completed a match!`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .setThumbnail(getChampionThumbnail(championDisplay))
    .addFields(fields)
    .setTimestamp()
    .setFooter({ text: 'Match Summary' });
}

function createRankChangeEmbed(
  summonerName,
  direction,
  newRankMsg,
  lpChangeMsg,
  deepLolLink
) {
  const isPromotion = direction === 'promoted';
  const isDemotion = direction === 'demoted';
  const embedColor = isPromotion ? 0x28a745 : isDemotion ? 0xe74c3c : null;
  const title = isPromotion
    ? '📈 **Rank Promotion!**'
    : isDemotion
    ? '📉 **Rank Demotion...**'
    : null;
  if (!embedColor || !title) return null;
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(
      `${summonerName} has ${isPromotion ? 'ranked up!' : 'been demoted.'}`
    )
    .setURL(deepLolLink)
    .setColor(embedColor)
    .addFields(
      { name: '🏆 **Rank Change**', value: `**${newRankMsg}**`, inline: true },
      { name: '🔄 **LP Change**', value: `**${lpChangeMsg} LP**`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Rank Change Notification' });
}

async function notifyMatchStart({
  summonerName,
  queueName,
  championDisplay,
  rankString,
  discordChannelId,
  deepLolLink,
}) {
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
    return true;
  } catch (error) {
    console.error(
      `[Notification Error] Could not send message for ${summonerName}:`,
      JSON.stringify(error, null, 2)
    );
    return false;
  }
}

async function notifyMatchEnd({
  summonerName,
  queueName,
  result,
  newRankMsg,
  lpChangeMsg,
  championDisplay,
  role,
  kdaStr,
  damage,
  discordChannelId,
  deepLolLink,
}) {
  const embed = createMatchEndEmbed(
    summonerName,
    queueName,
    result,
    newRankMsg,
    lpChangeMsg,
    championDisplay,
    role,
    kdaStr,
    damage,
    deepLolLink
  );
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match end message for ${summonerName}.`);
    return true;
  } catch (error) {
    console.error(
      `[Notification Error] Could not send message for ${summonerName}:`,
      error
    );
    return false;
  }
}

async function notifyRankChange({
  summonerName,
  direction,
  newRankMsg,
  lpChangeMsg,
  discordChannelId,
  deepLolLink,
}) {
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
    console.error(
      `[Notification Error] Could not send rank change message for ${summonerName}:`,
      error
    );
  }
}

module.exports = {
  loginClient,
  sendDiscordMessage,
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange,
};
