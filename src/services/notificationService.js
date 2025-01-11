// services/notificationService.js
const { EmbedBuilder } = require('discord.js');
const { sendDiscordMessage } = require('./discordService'); // Ensure the path is correct

/**
 * Function to handle end-of-match notifications
 * @param {object} matchSummary - The match summary data retrieved from Riot API.
 */
async function notifyMatchEnd(matchSummary) {
  const {
    summonerName,
    result,
    rankChangeMsg,
    lpChangeMsg,
    champion,
    role,
    kdaStr,
    damage,
    discordChannelId
  } = matchSummary;

  // Create the embed using the helper function
  const embed = createMatchEndEmbed(
    summonerName,
    result,
    rankChangeMsg,
    lpChangeMsg,
    champion,
    role,
    kdaStr,
    damage
  );

  // Send the embed to the specified Discord channel
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match end message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
}

/**
 * Function to handle start-of-match notifications
 * @param {object} matchStartInfo - The match start information.
 */
async function notifyMatchStart(matchStartInfo) {
  const {
    summonerName,
    queueName,
    championDisplay,
    rankString,
    discordChannelId,
    championTag, // Optional: Additional champion info
    role // Optional: Role information
  } = matchStartInfo;

  // Create the embed using the helper function
  const embed = createMatchStartEmbed(
    summonerName,
    queueName,
    championDisplay,
    rankString,
    championTag,
    role
  );

  // Send the embed to the specified Discord channel
  try {
    await sendDiscordMessage(discordChannelId, { embeds: [embed] });
    console.log(`[Notification] Sent match start message for ${summonerName}.`);
  } catch (error) {
    console.error(`[Notification Error] Could not send message for ${summonerName}:`, error);
  }
}

/**
 * Helper function to create an embed for end-of-match notifications.
 * @param {string} summonerName
 * @param {string} result
 * @param {string} rankChangeMsg
 * @param {string} lpChangeMsg
 * @param {string} champion
 * @param {string} role
 * @param {string} kdaStr
 * @param {number} damage
 * @returns {EmbedBuilder}
 */
function createMatchEndEmbed(
  summonerName,
  result,
  rankChangeMsg,
  lpChangeMsg,
  champion,
  role,
  kdaStr,
  damage
) {
  // Determine embed color based on the result
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

  // Optional: Set a thumbnail based on champion
  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(
    champion
  )}.png`;

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle(`${summonerName}'s Match Has Ended!`)
    .setColor(embedColor)
    .setThumbnail(championThumbnail) // Optional: Champion icon
    .addFields(
      { name: ':checkered_flag: **Result**', value: `${result}`, inline: true },
      { name: ':chart_with_upwards_trend: **Rank Update**', value: `${rankChangeMsg}`, inline: true },
      { name: ':arrow_up_down: **LP Change**', value: `${lpChangeMsg}`, inline: true },
      { name: ':shield: **Champion**', value: `${champion}`, inline: true },
      { name: ':video_game: **Role**', value: `${role}`, inline: true },
      { name: ':crossed_swords: **KDA**', value: `${kdaStr}`, inline: true },
      { name: ':boom: **Damage Dealt**', value: `${damage}`, inline: true }
    )
    .setTimestamp()
    .setFooter({ text: 'Match Summary', iconURL: 'https://i.imgur.com/AfFp7pu.png' }); // Optional: Custom footer

  return embed;
}

/**
 * Helper function to create an embed for start-of-match notifications.
 * @param {string} summonerName
 * @param {string} queueName
 * @param {string} championDisplay
 * @param {string} rankString
 * @param {string} championTag
 * @param {string} role
 * @returns {EmbedBuilder}
 */
function createMatchStartEmbed(
  summonerName,
  queueName,
  championDisplay,
  rankString,
  championTag,
  role
) {
  // Embed color for match start
  const embedColor = 0x3498db; // Blue

  // Optional: Set a thumbnail based on champion
  const championThumbnail = `https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/${encodeURIComponent(
    championDisplay
  )}.png`;

  // Create the embed
  const embed = new EmbedBuilder()
    .setTitle(`${summonerName} has Started a Match!`)
    .setColor(embedColor)
    .setThumbnail(championThumbnail) // Optional: Champion icon
    .addFields(
      { name: ':video_game: **Queue**', value: `${queueName}`, inline: true },
      { name: ':shield: **Champion**', value: `${championDisplay}`, inline: true },
      { name: ':trophy: **Current Rank**', value: `${rankString}`, inline: true },
      { name: ':crossed_swords: **Role**', value: `${role}`, inline: true },
      // Optional: Additional fields like championTag can be added here
    )
    .setTimestamp()
    .setFooter({ text: 'Match Started', iconURL: 'https://i.imgur.com/AfFp7pu.png' }); // Optional: Custom footer

  return embed;
}

module.exports = { notifyMatchEnd, notifyMatchStart };
