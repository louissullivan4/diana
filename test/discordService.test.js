// test/discordService.test.js
require('dotenv').config();

const {
    sendDiscordMessage,
    notifyMatchStart,
    notifyMatchEnd,
    notifyRankChange,
  } = require('../src/discord/discordService');
  const { EmbedBuilder } = require('discord.js');


jest.mock('../src/discord/discordService', () => {
  const originalModule = jest.requireActual('../src/discord/discordService');
  return {
    ...originalModule,
    sendDiscordMessage: jest.fn(),
  };
});

const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID || '123456789012345678';

describe('discordService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyMatchStart', () => {
    it('should send a match start message with correct embed', async () => {
      const matchStartInfo = {
        summonerName: 'TestSummoner',
        queueName: 'Ranked Solo',
        championDisplay: 'Ahri',
        rankString: 'GOLD I',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/start',
      };

      const expectedEmbed = new EmbedBuilder()
        .setTitle('🎮 **Match Started!**')
        .setDescription(`${matchStartInfo.summonerName} has started a match!`)
        .setURL(matchStartInfo.deepLolLink)
        .setColor(0xf1c40f)
        .setThumbnail('https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/Ahri.png')
        .addFields(
          { name: '🕹️ **Queue**', value: `**${matchStartInfo.queueName}**`, inline: true },
          { name: '🛡️ **Champion**', value: `**${matchStartInfo.championDisplay}**`, inline: true },
          { name: '🏆 **Current Rank**', value: `**${matchStartInfo.rankString}**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Match Started' });

      await notifyMatchStart(matchStartInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(matchStartInfo.discordChannelId, { embeds: [expectedEmbed] });
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if sendDiscordMessage fails', async () => {
      const matchStartInfo = {
        summonerName: 'TestSummoner',
        queueName: 'Ranked Solo',
        championDisplay: 'Ahri',
        rankString: 'GOLD I',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/start',
      };

      sendDiscordMessage.mockRejectedValue(new Error('Discord API error'));

      console.error = jest.fn();

      await notifyMatchStart(matchStartInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(matchStartInfo.discordChannelId, expect.any(Object));
      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send message for ${matchStartInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });

  describe('notifyMatchEnd', () => {
    it('should send a match end message with correct embed for a win', async () => {
      const matchEndInfo = {
        summonerName: 'TestSummoner',
        result: 'Win',
        rankMsg: 'GOLD II',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'Mid',
        kdaStr: '10/2/8',
        damage: '15000',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/end',
      };

      const expectedEmbed = new EmbedBuilder()
        .setTitle('🎮 **Match Summary**')
        .setDescription(`${matchEndInfo.summonerName} has completed a match!`)
        .setURL(matchEndInfo.deepLolLink)
        .setColor(0x28a745)
        .setThumbnail('https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/Ahri.png')
        .addFields(
          { name: '🏁 **Result**', value: `**${matchEndInfo.result}**`, inline: true },
          { name: '📈 **Rank Update**', value: `**${matchEndInfo.rankMsg}**`, inline: true },
          { name: '🔄 **LP Change**', value: `**${matchEndInfo.lpChangeMsg} LP**`, inline: true },
          { name: '🛡️ **Champion**', value: `**${matchEndInfo.champion}**`, inline: true },
          { name: '🎯 **Role**', value: `**${matchEndInfo.role}**`, inline: true },
          { name: '⚔️ **KDA**', value: `**${matchEndInfo.kdaStr}**`, inline: true },
          { name: '💥 **Damage Dealt**', value: `**${matchEndInfo.damage}**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Match Summary' });

      await notifyMatchEnd(matchEndInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(matchEndInfo.discordChannelId, { embeds: [expectedEmbed] });
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
    });

    it('should handle unknown results by setting a default color', async () => {
      const matchEndInfo = {
        summonerName: 'TestSummoner',
        result: 'Unknown',
        rankMsg: 'GOLD II',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'Mid',
        kdaStr: '10/2/8',
        damage: '15000',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/end',
      };

      const expectedEmbed = new EmbedBuilder()
        .setTitle('🎮 **Match Summary**')
        .setDescription(`${matchEndInfo.summonerName} has completed a match!`)
        .setURL(matchEndInfo.deepLolLink)
        .setColor(0x95a5a6)
        .setThumbnail('https://ddragon.leagueoflegends.com/cdn/13.6.1/img/champion/Ahri.png')
        .addFields(
          { name: '🏁 **Result**', value: `**${matchEndInfo.result}**`, inline: true },
          { name: '📈 **Rank Update**', value: `**${matchEndInfo.rankMsg}**`, inline: true },
          { name: '🔄 **LP Change**', value: `**${matchEndInfo.lpChangeMsg} LP**`, inline: true },
          { name: '🛡️ **Champion**', value: `**${matchEndInfo.champion}**`, inline: true },
          { name: '🎯 **Role**', value: `**${matchEndInfo.role}**`, inline: true },
          { name: '⚔️ **KDA**', value: `**${matchEndInfo.kdaStr}**`, inline: true },
          { name: '💥 **Damage Dealt**', value: `**${matchEndInfo.damage}**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Match Summary' });

      await notifyMatchEnd(matchEndInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(matchEndInfo.discordChannelId, { embeds: [expectedEmbed] });
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if sendDiscordMessage fails', async () => {
      const matchEndInfo = {
        summonerName: 'TestSummoner',
        result: 'Win',
        rankMsg: 'GOLD II',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'Mid',
        kdaStr: '10/2/8',
        damage: '15000',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/end',
      };

      sendDiscordMessage.mockRejectedValue(new Error('Discord API error'));

      console.error = jest.fn();

      await notifyMatchEnd(matchEndInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(matchEndInfo.discordChannelId, expect.any(Object));
      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send message for ${matchEndInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });

  describe('notifyRankChange', () => {
    it('should send a rank promotion message with correct embed', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'promoted',
        newRankMsg: 'PLATINUM I',
        lpChangeMsg: '25',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      const expectedEmbed = new EmbedBuilder()
        .setTitle('📈 **Rank Promotion!**')
        .setDescription(`${rankChangeInfo.summonerName} has ranked up!`)
        .setURL(rankChangeInfo.deepLolLink)
        .setColor(0x28a745)
        .addFields(
          { name: '🏆 **Rank Change**', value: `**${rankChangeInfo.newRankMsg}**`, inline: true },
          { name: '🔄 **LP Change**', value: `**${rankChangeInfo.lpChangeMsg} LP**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Rank Change Notification' });

      await notifyRankChange(rankChangeInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(rankChangeInfo.discordChannelId, { embeds: [expectedEmbed] });
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
    });

    it('should send a rank demotion message with correct embed', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'demoted',
        newRankMsg: 'SILVER III',
        lpChangeMsg: '-15',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      const expectedEmbed = new EmbedBuilder()
        .setTitle('📉 **Rank Demotion...**')
        .setDescription(`${rankChangeInfo.summonerName} has been demoted.`)
        .setURL(rankChangeInfo.deepLolLink)
        .setColor(0xe74c3c)
        .addFields(
          { name: '🏆 **Rank Change**', value: `**${rankChangeInfo.newRankMsg}**`, inline: true },
          { name: '🔄 **LP Change**', value: `**${rankChangeInfo.lpChangeMsg} LP**`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Rank Change Notification' });

      await notifyRankChange(rankChangeInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(rankChangeInfo.discordChannelId, { embeds: [expectedEmbed] });
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
    });

    it('should not send a message if embed is null', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'no_change',
        newRankMsg: 'SILVER III',
        lpChangeMsg: '0',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      await notifyRankChange(rankChangeInfo);

      expect(sendDiscordMessage).not.toHaveBeenCalled();
    });

    it('should throw an error if sendDiscordMessage fails', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'promoted',
        newRankMsg: 'PLATINUM I',
        lpChangeMsg: '25',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      sendDiscordMessage.mockRejectedValue(new Error('Discord API error'));

      console.error = jest.fn();

      await notifyRankChange(rankChangeInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(rankChangeInfo.discordChannelId, expect.any(Object));
      expect(sendDiscordMessage).toHaveBeenCalledTimes(1);
      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send rank change message for ${rankChangeInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });
});