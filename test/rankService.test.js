// tests/rankService.test.js
const {
    setPreviousRank,
    getPreviousRank,
    clearPreviousRank,
    calculateRankChange
  } = require('../src/discord/rankService');
  
  describe('Rank Service Tests', () => {
    beforeEach(() => {
      // Clear any existing data before each test
      clearPreviousRank('test-puuid');
    });
  
    test('New Rank: No previous rank', () => {
      const previousRank = null;
      const currentRank = { tier: 'Gold', rank: 'I', lp: 20 };
      const expected = { direction: 'new', lpChange: 20 };
  
      const result = calculateRankChange(previousRank, currentRank);
      expect(result).toEqual(expected);
    });
  
    test('Gold II 10 LP → Gold I 20 LP', () => {
      const previousRank = { tier: 'Gold', rank: 'II', lp: 10 };
      const currentRank = { tier: 'Gold', rank: 'I', lp: 20 };
      const expected = { direction: 'up', lpChange: 110 };
  
      const result = calculateRankChange(previousRank, currentRank);
      expect(result).toEqual(expected);
    });
  
    test('Gold I 20 LP → Gold II 10 LP', () => {
      const previousRank = { tier: 'Gold', rank: 'I', lp: 20 };
      const currentRank = { tier: 'Gold', rank: 'II', lp: 10 };
      const expected = { direction: 'down', lpChange: -110 };
  
      const result = calculateRankChange(previousRank, currentRank);
      expect(result).toEqual(expected);
    });
  
    test('Silver I 90 LP → Gold IV 10 LP', () => {
      const previousRank = { tier: 'Silver', rank: 'I', lp: 90 };
      const currentRank = { tier: 'Gold', rank: 'IV', lp: 10 };
      const expected = { direction: 'up', lpChange: 20 };
  
      const result = calculateRankChange(previousRank, currentRank);
      expect(result).toEqual(expected);
    });
  
    test('Platinum IV 90 LP → Gold I 10 LP (Expected -10 LP)', () => {
      const previousRank = { tier: 'Platinum', rank: 'IV', lp: 10 };
      const currentRank = { tier: 'Gold', rank: 'I', lp: 90 };
      const expected = { direction: 'down', lpChange: -20 };
  
      const result = calculateRankChange(previousRank, currentRank);
      expect(result).toEqual(expected);
    });
  
    test('Invalid Tier', () => {
      const previousRank = { tier: 'UnknownTier', rank: 'I', lp: 10 };
      const currentRank = { tier: 'Gold', rank: 'I', lp: 20 };
      
      expect(() => {
        calculateRankChange(previousRank, currentRank);
      }).toThrow('Invalid tier or division');
    });
  
    test('Invalid Division', () => {
      const previousRank = { tier: 'Gold', rank: 'V', lp: 10 };
      const currentRank = { tier: 'Gold', rank: 'I', lp: 20 };
      
      expect(() => {
        calculateRankChange(previousRank, currentRank);
      }).toThrow('Invalid tier or division');
    });
  });
  