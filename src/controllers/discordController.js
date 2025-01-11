// controllers/discordController.js
const { sendDiscordMessage } = require('../services/discordService');

const notifyMatchStart = async (req, res) => {
  try {
    const { summonerName, channelId } = req.body;

    const message = `**${summonerName}** has started a League match! Good luck!`;

    await sendDiscordMessage(channelId, message);
    return res.status(200).json({ message: 'Start-of-match notification sent.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const notifyMatchEnd = async (req, res) => {
  try {
    const {
      summonerName,
      channelId,
      result,
      lpChange,
      newRank,
      champion,
      role,
      kda,
      damageDealt,
    } = req.body;

    const endMessage = `
**${summonerName}'s match has ended!**  
> **Result:** ${result}  
> **LP Change:** ${lpChange}  
> **New Rank:** ${newRank}  
> **Champion:** ${champion}  
> **Role:** ${role}  
> **KDA:** ${kda}  
> **Damage Dealt:** ${damageDealt}
    `;

    await sendDiscordMessage(channelId, endMessage);
    return res.status(200).json({ message: 'End-of-match notification sent.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = {
  notifyMatchStart,
  notifyMatchEnd,
};
