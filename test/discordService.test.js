// test/discordService.test.js
require('dotenv').config();
const { EmbedBuilder } = require('discord.js');

const {
  loginClient,
  sendDiscordMessage,
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange,
} = require('../src/discord/discordService');

jest.mock('../src/discord/discordService', () => {
  const original = jest.requireActual('../src/discord/discordService');
  return {
    ...original,
    sendDiscordMessage: jest.fn(),
  };
});

describe('discordService', () => {
  const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

  beforeAll(async () => {
    await loginClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('notifyMatchStart', () => {
    it('sends a match start message (happy path)', async () => {
      const matchStartInfo = {
        summonerName: 'TestSummoner',
        queueName: 'Ranked Solo',
        championDisplay: 'Ahri',
        rankString: 'GOLD I',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/start',
      };

      await notifyMatchStart(matchStartInfo);

      expect(sendDiscordMessage).toHaveBeenCalledWith(
        matchStartInfo.discordChannelId,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.any(EmbedBuilder),
          ]),
        })
      );
    });

    it('logs an error if sendDiscordMessage fails', async () => {
      const matchStartInfo = {
        summonerName: 'TestSummoner',
        queueName: 'Ranked Solo',
        championDisplay: 'Ahri',
        rankString: 'GOLD I',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/start',
      };

      sendDiscordMessage.mockRejectedValueOnce(new Error('Discord API error'));
      console.error = jest.fn();

      await notifyMatchStart(matchStartInfo);

      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send message for ${matchStartInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });

  describe('notifyMatchEnd', () => {
    it('sends a match end message (happy path)', async () => {
      const matchEndInfo = {
        summonerName: 'TestSummoner',
        result: 'Win',
        newRankMsg: 'GOLD II',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'Mid',
        kdaStr: '10/2/8',
        damage: '15000',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/end',
      };

      await notifyMatchEnd(matchEndInfo);
      expect(sendDiscordMessage).toHaveBeenCalledWith(
        matchEndInfo.discordChannelId,
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.any(EmbedBuilder),
          ]),
        })
      );
    });

    it('logs an error if sendDiscordMessage fails', async () => {
      const matchEndInfo = {
        summonerName: 'TestSummoner',
        result: 'Win',
        newRankMsg: 'GOLD II',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'Mid',
        kdaStr: '10/2/8',
        damage: '15000',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/match/end',
      };

      sendDiscordMessage.mockRejectedValueOnce(new Error('Discord API error'));
      console.error = jest.fn();

      await notifyMatchEnd(matchEndInfo);

      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send message for ${matchEndInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });

  describe('notifyRankChange', () => {
    it('sends a promotion message', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'promoted',
        newRankMsg: 'PLATINUM I',
        lpChangeMsg: '25',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      await notifyRankChange(rankChangeInfo);
    });

    it('sends a demotion message', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'demoted',
        newRankMsg: 'SILVER III',
        lpChangeMsg: '-15',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      await notifyRankChange(rankChangeInfo);
    });

    it('does nothing if direction is no_change', async () => {
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

    it('logs an error if sendDiscordMessage fails', async () => {
      const rankChangeInfo = {
        summonerName: 'TestSummoner',
        direction: 'promoted',
        newRankMsg: 'PLATINUM I',
        lpChangeMsg: '25',
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: 'https://deep.lol/rank/change',
      };

      await sendDiscordMessage.mockRejectedValueOnce(new Error('Discord API error'));
      console.error = jest.fn();

      await notifyRankChange(rankChangeInfo);

      expect(console.error).toHaveBeenCalledWith(
        `[Notification Error] Could not send rank change message for ${rankChangeInfo.summonerName}:`,
        expect.any(Error)
      );
    });
  });
});