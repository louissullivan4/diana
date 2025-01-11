// services/discordService.js
require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');

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

module.exports = { sendDiscordMessage };
