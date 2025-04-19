require("dotenv").config();
const { EmbedBuilder } = require("discord.js");

const {
  loginClient,
  sendDiscordMessage,
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange,
} = require("../src/discord/discordService");

jest.mock("../src/discord/discordService", () => {
  const original = jest.requireActual("../src/discord/discordService");
  return {
    ...original,
    sendDiscordMessage: jest.fn(),
  };
});

describe("discordService", () => {
  const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

  beforeAll(async () => {
    await loginClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("notifyMatchStart", () => {
    it("sends a match start message (happy path)", async () => {
      const matchStartInfo = {
        summonerName: "TestSummoner",
        queueName: "Ranked Solo",
        championDisplay: "Ahri",
        rankString: "GOLD I",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/match/start",
      };

      await notifyMatchStart(matchStartInfo);
    });

    it("logs an error if sendDiscordMessage fails", async () => {
      const matchStartInfo = {
        summonerName: "TestSummoner",
        queueName: "Ranked Solo",
        championDisplay: "Ahri",
        rankString: "GOLD I",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/match/start",
      };

      await notifyMatchStart(matchStartInfo);
    });
  });

  describe("notifyMatchEnd", () => {
    it("sends a match end message (happy path)", async () => {
      const matchEndInfo = {
        summonerName: "TestSummoner",
        queueName: "Ranked Flex",
        result: "Win",
        newRankMsg: "GOLD II",
        lpChangeMsg: "20",
        championDisplay: "Ahri",
        role: "Mid",
        kdaStr: "10/2/8",
        damage: "15000",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/match/end",
      };

      await notifyMatchEnd(matchEndInfo);
    });

    it("logs an error if sendDiscordMessage fails", async () => {
      const matchEndInfo = {
        summonerName: "TestSummoner",
        queueName: "Ranked Solo/Duo",
        result: "Win",
        newRankMsg: "GOLD II",
        lpChangeMsg: "20",
        championDisplay: "Ahri",
        role: "Mid",
        kdaStr: "10/2/8",
        damage: "15000",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/match/end",
      };

      await notifyMatchEnd(matchEndInfo);
    });
  });

  describe("notifyRankChange", () => {
    it("sends a promotion message", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "promoted",
        newRankMsg: "PLATINUM I",
        lpChangeMsg: "25",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });

    it("sends a demotion message", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "demoted",
        newRankMsg: "SILVER III",
        lpChangeMsg: "-15",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });

    it("does nothing if direction is no_change", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "no_change",
        newRankMsg: "SILVER III",
        lpChangeMsg: "0",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });

    it("logs an error if sendDiscordMessage fails", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "promoted",
        newRankMsg: "PLATINUM I",
        lpChangeMsg: "25",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });
    it("logs an error if sendDiscordMessage fails", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "promoted",
        newRankMsg: "UNRANKED I",
        lpChangeMsg: "25",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });
    it("logs an error if sendDiscordMessage fails", async () => {
      const rankChangeInfo = {
        summonerName: "TestSummoner",
        direction: "promoted",
        newRankMsg: "EMERALD I",
        lpChangeMsg: "25",
        discordChannelId: DISCORD_CHANNEL_ID,
        deepLolLink: "https://deep.lol/rank/change",
      };

      await notifyRankChange(rankChangeInfo);
    });
  });
});
