// services/discordService.js
require('dotenv').config();
const { Client, IntentsBitField, EmbedBuilder } = require('discord.js');

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildMessages],
});

client.login(process.env.DISCORD_BOT_TOKEN);

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

const sendDiscordMessage = async (channelId, message) => {
  if (!channelId) throw new Error('Channel ID not provided.');
  if (!message) throw new Error('Message content not provided.');

  const channel = await client.channels.fetch(channelId);
  if (!channel) throw new Error(`Channel with ID ${channelId} not found.`);

  return channel.send(message);
};

const createMatchStartEmbed = (summonerName, queueName, championDisplay, rankString, deepLolLink) => {
  const tier = rankString.match(/(\w+)\s+\w+/)?.[1]?.toUpperCase();
  const embedColor = rankColors[tier] || 0x3498db;
  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(championDisplay.replace(/\s+/g, ''))}.png`;

  return new EmbedBuilder()
    .setTitle('🎮 **Match Started!**')
    .setDescription(`${summonerName} has started a match!`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .setThumbnail(championThumbnail)
    .addFields(
      { name: '🕹️ **Queue**', value: `**${queueName}**`, inline: true },
      { name: '🛡️ **Champion**', value: `**${championDisplay}**`, inline: true },
      { name: '🏆 **Current Rank**', value: `**${rankString}**`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Match Started' });
};

const createMatchEndEmbed = (summonerName, result, newRankMsg, lpChangeMsg, champion, role, kdaStr, damage, deepLolLink) => {
  const resultColors = { win: 0x28a745, lose: 0xe74c3c, remake: 0xe67e22 };
  const embedColor = resultColors[result.toLowerCase()] || 0x95a5a6;
  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(champion)}.png`;

  return new EmbedBuilder()
    .setTitle('🎮 **Match Summary**')
    .setDescription(`${summonerName} has completed a match!`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .setThumbnail(championThumbnail)
    .addFields(
      { name: '🏁 **Result**', value: `**${result}**`, inline: true },
      { name: '📈 **Rank Update**', value: `**${newRankMsg}**`, inline: true },
      { name: '🔄 **LP Change**', value: `**${lpChangeMsg} LP**`, inline: true },
      { name: '🛡️ **Champion**', value: `**${champion}**`, inline: true },
      { name: '🎯 **Role**', value: `**${role}**`, inline: true },
      { name: '⚔️ **KDA**', value: `**${kdaStr}**`, inline: true },
      { name: '💥 **Damage Dealt**', value: `**${damage}**`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Match Summary' });
};

const createRankChangeEmbed = (summonerName, direction, newRankMsg, lpChangeMsg, deepLolLink) => {
  const isPromotion = direction === 'promoted';
  const embedColor = isPromotion ? 0x28a745 : direction === 'demoted' ? 0xe74c3c : null;
  const title = isPromotion ? '📈 **Rank Promotion!**' : direction === 'demoted' ? '📉 **Rank Demotion...**' : null;

  if (!embedColor || !title) return null;

  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(`${summonerName} has ${isPromotion ? 'ranked up!' : 'been demoted.'}`)
    .setURL(deepLolLink)
    .setColor(embedColor)
    .addFields(
      { name: '🏆 **Rank Change**', value: `**${newRankMsg}**`, inline: true },
      { name: '🔄 **LP Change**', value: `**${lpChangeMsg} LP**`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Rank Change Notification' });
};

const notifyMatchStart = async ({ summonerName, queueName, championDisplay, rankString, discordChannelId, deepLolLink }) => {
  const embed = createMatchStartEmbed(summonerName, queueName, championDisplay, rankString, deepLolLink);
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match start message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
};

const notifyMatchEnd = async ({ summonerName, result, newRankMsg, lpChangeMsg, champion, role, kdaStr, damage, discordChannelId, deepLolLink }) => {
  const embed = createMatchEndEmbed(summonerName, result, newRankMsg, lpChangeMsg, champion, role, kdaStr, damage, deepLolLink);
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match end message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
};

const notifyRankChange = async ({ summonerName, direction, newRankMsg, lpChangeMsg, discordChannelId, deepLolLink }) => {
  const embed = createRankChangeEmbed(summonerName, direction, newRankMsg, lpChangeMsg, deepLolLink);
  if (!embed) return;
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent rank change message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send rank change message for ${summonerName}:`, error);
  }
};

module.exports = {
  sendDiscordMessage,
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange,
};