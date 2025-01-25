// test/matchMonitoringService.test.js
require('dotenv').config();
const {
  checkAndHandleSummoner,
  handleMatchStart,
  handleMatchEnd
} = require('../src/discord/matchMonitoringService');

// Mock all the external service calls we rely on
// so we don't actually call the DB or Riot API in unit tests
jest.mock('../src/services/riotService', () => ({
  getActiveGameByPuuid: jest.fn(),
  getMatchSummary: jest.fn(),
  getRankEntriesByPUUID: jest.fn()
}));

jest.mock('../src/services/summonerService', () => ({
  updateSummonerRank: jest.fn()
}));

jest.mock('../src/services/dataDragonService', () => ({
  getChampionInfoById: jest.fn(),
  getQueueNameById: jest.fn()
}));

jest.mock('../src/services/matchService', () => ({
  createMatchDetail: jest.fn()
}));

jest.mock('../src/discord/discordService', () => ({
  notifyMatchStart: jest.fn(),
  notifyMatchEnd: jest.fn(),
  notifyRankChange: jest.fn()
}));

jest.mock('../src/services/rankService', () => ({
  calculateRankChange: jest.fn(),
  determineRankMovement: jest.fn()
}));

const {
  getActiveGameByPuuid,
  getMatchSummary,
  getRankEntriesByPUUID
} = require('../src/services/riotService');

const {
  updateSummonerRank
} = require('../src/services/summonerService');

const {
  createMatchDetail
} = require('../src/services/matchService');

const {
  notifyMatchStart,
  notifyMatchEnd,
  notifyRankChange
} = require('../src/discord/discordService');

const {
  calculateRankChange,
  determineRankMovement
} = require('../src/services/rankService');

const {
  getChampionInfoById,
  getQueueNameById
} = require('../src/services/dataDragonService');

describe('matchMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndHandleSummoner', () => {
    it('calls handleMatchStart if getActiveGameByPuuid returns data', async () => {
      const mockPlayer = { 
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner' 
      };
      getActiveGameByPuuid.mockResolvedValue({ gameId: 12345 });

      await checkAndHandleSummoner(mockPlayer);

      expect(getActiveGameByPuuid).toHaveBeenCalledWith('TEST_PUUID');
    });
  });

  describe('handleMatchStart', () => {
    it('creates a new match and sends notifications if currentMatchId is null', async () => {
      const mockPlayer = {
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner',
        currentMatchId: null,
        discordChannelId: '12345'
      };

      const mockActiveGameData = {
        gameId: 99999,
        gameQueueConfigId: 420, // example queue for "Ranked Solo"
        participants: [
          { puuid: 'TEST_PUUID', championId: 103 } // champion ID for Ahri
        ]
      };

      getRankEntriesByPUUID.mockResolvedValue([
        { queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'III', leaguePoints: 45 }
      ]);
      getChampionInfoById.mockResolvedValue({ name: 'Ahri' });
      getQueueNameById.mockReturnValue('Ranked Solo');
      createMatchDetail.mockResolvedValue({ matchId: 'EUW1_99999' });

      await handleMatchStart(mockPlayer, mockActiveGameData);

      expect(createMatchDetail).toHaveBeenCalledWith(mockActiveGameData);
      expect(updateSummonerRank).toHaveBeenCalledWith({
        tier: 'GOLD',
        rank: 'III',
        leaguePoints: 45,
        puuid: 'TEST_PUUID'
      });
      expect(notifyMatchStart).toHaveBeenCalledWith({
        summonerName: 'TestSummoner',
        queueName: 'Ranked Solo',
        championDisplay: 'Ahri',
        rankString: 'GOLD III (45 LP)',
        discordChannelId: '12345',
        deepLolLink: '' // since we didn't provide it, it's defaulting to empty
      });
    });

    it('does nothing if currentMatchId is already set', async () => {
      const mockPlayer = {
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner',
        currentMatchId: '99999' // already in DB
      };
      const mockActiveGameData = { gameId: 99999 };

      await handleMatchStart(mockPlayer, mockActiveGameData);

      // If currentMatchId is set, we do nothing in your code. 
      // So we check that createMatchDetail or notify wasn't called.
      expect(createMatchDetail).not.toHaveBeenCalled();
      expect(notifyMatchStart).not.toHaveBeenCalled();
    });
  });

  describe('handleMatchEnd', () => {
    it('fetches final match data and updates rank, sends notifications on match end', async () => {
      const mockPlayer = {
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner',
        currentMatchId: '99999',
        tier: 'GOLD',
        rank: 'III',
        lp: 45,
        matchRegionPrefix: 'EUW1',
        discordChannelId: '12345'
      };

      const mockMatchSummaryData = {
        info: {
          gameDuration: 1800,
          participants: [
            {
              puuid: 'TEST_PUUID',
              championName: 'Ahri',
              kills: 10,
              deaths: 2,
              assists: 8,
              totalDamageDealtToChampions: 15000,
              win: true
            }
          ]
        }
      };

      getMatchSummary.mockResolvedValue(mockMatchSummaryData);

      // simulate new rank
      getRankEntriesByPUUID.mockResolvedValue([
        { queueType: 'RANKED_SOLO_5x5', tier: 'GOLD', rank: 'II', leaguePoints: 65 }
      ]);

      calculateRankChange.mockReturnValue({ lpChange: 20 });
      determineRankMovement.mockResolvedValue('promoted');

      await handleMatchEnd(mockPlayer);

      expect(getMatchSummary).toHaveBeenCalledWith('EUW1_99999');
      expect(updateSummonerRank).toHaveBeenCalledWith({
        tier: 'GOLD',
        rank: 'II',
        leaguePoints: 65,
        puuid: 'TEST_PUUID'
      });

      expect(notifyMatchEnd).toHaveBeenCalledWith({
        summonerName: 'TestSummoner',
        result: 'Win',
        newRankMsg: 'GOLD II (65 LP)',
        lpChangeMsg: '20',
        champion: 'Ahri',
        role: 'N/A',
        kdaStr: '10/2/8',
        damage: 15000,
        discordChannelId: '12345',
        deepLolLink: ''
      });

      expect(notifyRankChange).toHaveBeenCalledWith({
        summonerName: 'TestSummoner',
        direction: 'promoted',
        newRankMsg: 'GOLD II (65 LP)',
        lpChangeMsg: '20',
        discordChannelId: '12345',
        deepLolLink: ''
      });
    });

    it('does nothing if currentMatchId is null', async () => {
      const mockPlayer = {
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner',
        currentMatchId: null // means not in a match
      };

      await handleMatchEnd(mockPlayer);
      expect(getMatchSummary).not.toHaveBeenCalled();
      expect(notifyMatchEnd).not.toHaveBeenCalled();
    });

    it('handles missing match data gracefully', async () => {
      const mockPlayer = {
        puuid: 'TEST_PUUID',
        summonerName: 'TestSummoner',
        currentMatchId: '99999',
        matchRegionPrefix: 'EUW1'
      };

      getMatchSummary.mockResolvedValue({ info: null });

      await handleMatchEnd(mockPlayer);
      expect(getMatchSummary).toHaveBeenCalledWith('EUW1_99999');
      expect(notifyMatchEnd).not.toHaveBeenCalled(); // no data, no message
    });
  });
});
