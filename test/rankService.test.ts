jest.mock('twisted', () => ({
    Constants: {
        Divisions: {
            I: 'I',
            II: 'II',
            III: 'III',
            IV: 'IV',
        },
    },
}));

import {
    calculateRankChange,
    determineRankMovement,
    calculateWinRatePercentage,
} from '../src/api/utils/rankService';

describe('rankService', () => {
    describe('calculateRankChange', () => {
        it('returns lp gain when previous rank is unranked', () => {
            const result = calculateRankChange(
                {
                    tier: 'Unranked',
                    lp: 0,
                    rank: 'N/A',
                },
                {
                    tier: 'GOLD',
                    lp: 20,
                    rank: 'IV',
                }
            );

            expect(result).toEqual({ direction: 'up', lpChange: 20 });
        });

        it('calculates direction and lp change between ranks', () => {
            const result = calculateRankChange(
                { tier: 'GOLD', rank: 'II', lp: 40 },
                { tier: 'GOLD', rank: 'I', lp: 10 }
            );

            expect(result).toEqual({ direction: 'up', lpChange: 70 });
        });

        it('supports demotion calculations', () => {
            const result = calculateRankChange(
                { tier: 'PLATINUM', rank: 'I', lp: 0 },
                { tier: 'GOLD', rank: 'IV', lp: 50 }
            );

            expect(result.direction).toBe('down');
            expect(result.lpChange).toBeLessThan(0);
        });

        it('falls back gracefully when previous rank division is invalid', () => {
            const result = calculateRankChange(
                { tier: 'GOLD', rank: 'VI', lp: 0 },
                { tier: 'GOLD', rank: 'I', lp: 0 }
            );

            expect(result).toEqual({ direction: 'up', lpChange: 0 });
        });

        it('returns stable result when current rank is invalid', () => {
            const result = calculateRankChange(
                { tier: 'GOLD', rank: 'II', lp: 40 },
                { tier: 'GOLD', rank: 'VI', lp: 10 }
            );

            expect(result).toEqual({ direction: 'same', lpChange: 0 });
        });
    });

    describe('determineRankMovement', () => {
        it('identifies a promotion when tier increases', () => {
            const direction = determineRankMovement(
                { tier: 'GOLD', rank: 'II', lp: 0 },
                { tier: 'PLATINUM', rank: 'IV', lp: 0 }
            );
            expect(direction).toBe('promoted');
        });

        it('identifies a demotion when division decreases', () => {
            const direction = determineRankMovement(
                { tier: 'GOLD', rank: 'II', lp: 0 },
                { tier: 'GOLD', rank: 'III', lp: 0 }
            );
            expect(direction).toBe('demoted');
        });

        it('returns no change for invalid input', () => {
            const direction = determineRankMovement(
                { tier: 'UNKNOWN', rank: 'II', lp: 0 },
                { tier: 'GOLD', rank: 'II', lp: 0 }
            );
            expect(direction).toBe('no_change');
        });

        it('returns no change when ranks are identical', () => {
            const direction = determineRankMovement(
                { tier: 'PLATINUM', rank: 'I', lp: 0 },
                { tier: 'PLATINUM', rank: 'I', lp: 0 }
            );
            expect(direction).toBe('no_change');
        });
    });

    describe('calculateWinRatePercentage', () => {
        it('returns null when no games played', () => {
            expect(calculateWinRatePercentage(0, 0)).toBeNull();
        });

        it('computes win rate for given wins and losses', () => {
            expect(calculateWinRatePercentage(3, 2)).toBeCloseTo(60);
        });
    });
});
