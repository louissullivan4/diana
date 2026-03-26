import {
    determineApexRankMovement,
    getRpChange,
    formatApexRank,
} from '../packages/diana-core/src/plugins/diana-apex-bot/api/utils/rankService';

describe('apexRankService', () => {
    describe('determineApexRankMovement', () => {
        it('returns promoted when tier increases', () => {
            expect(
                determineApexRankMovement('Gold', 2, 800, 'Platinum', 4, 1000)
            ).toBe('promoted');
        });

        it('returns demoted when tier decreases', () => {
            expect(
                determineApexRankMovement('Platinum', 4, 1000, 'Gold', 1, 950)
            ).toBe('demoted');
        });

        it('returns promoted when division improves within same tier', () => {
            // div 2 → div 1: promoted (lower number = higher rank)
            expect(
                determineApexRankMovement('Gold', 2, 800, 'Gold', 1, 900)
            ).toBe('promoted');
        });

        it('returns demoted when division worsens within same tier', () => {
            expect(
                determineApexRankMovement('Gold', 1, 900, 'Gold', 2, 800)
            ).toBe('demoted');
        });

        it('returns no_change when tier and division are identical', () => {
            expect(
                determineApexRankMovement(
                    'Diamond',
                    3,
                    3500,
                    'Diamond',
                    3,
                    3600
                )
            ).toBe('no_change');
        });

        it('returns no_change for unknown tier', () => {
            expect(
                determineApexRankMovement('Unknown', 1, 0, 'Gold', 1, 100)
            ).toBe('no_change');
        });

        it('handles top-tier promotions (Master → Apex Predator)', () => {
            expect(
                determineApexRankMovement(
                    'Master',
                    0,
                    10000,
                    'Apex Predator',
                    0,
                    15000
                )
            ).toBe('promoted');
        });

        it('handles Rookie to Bronze promotion', () => {
            expect(
                determineApexRankMovement('Rookie', 4, 150, 'Bronze', 4, 200)
            ).toBe('promoted');
        });
    });

    describe('getRpChange', () => {
        it('returns positive change on RP gain', () => {
            expect(getRpChange(1000, 1250)).toBe(250);
        });

        it('returns negative change on RP loss', () => {
            expect(getRpChange(1000, 900)).toBe(-100);
        });

        it('returns zero when RP unchanged', () => {
            expect(getRpChange(500, 500)).toBe(0);
        });
    });

    describe('formatApexRank', () => {
        it('formats a standard tier with division', () => {
            expect(formatApexRank('Platinum', 2, 1500)).toBe(
                'Platinum II (1500 RP)'
            );
        });

        it('formats Gold IV correctly', () => {
            expect(formatApexRank('Gold', 4, 800)).toBe('Gold IV (800 RP)');
        });

        it('formats Master without division', () => {
            expect(formatApexRank('Master', 0, 10500)).toBe(
                'Master (10500 RP)'
            );
        });

        it('formats Apex Predator without division', () => {
            expect(formatApexRank('Apex Predator', 0, 20000)).toBe(
                'Apex Predator (20000 RP)'
            );
        });

        it('formats division 1 as Roman numeral I', () => {
            expect(formatApexRank('Diamond', 1, 5000)).toBe(
                'Diamond I (5000 RP)'
            );
        });
    });
});
