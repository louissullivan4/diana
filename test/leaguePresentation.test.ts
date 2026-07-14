jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/dataDragonService',
    () => ({
        fetchLatestVersion: jest.fn().mockResolvedValue('15.2.1'),
    })
);

import {
    rankColors,
    getRankedEmblem,
    getChampionThumbnail,
} from '../packages/diana-core/src/plugins/diana-league-bot/presentation/leaguePresentation';

describe('leaguePresentation', () => {
    describe('rankColors', () => {
        const expectedTiers: Array<[string, number]> = [
            ['UNRANKED', 0x95a5a6],
            ['IRON', 0x7f8c8d],
            ['BRONZE', 0xcd7f32],
            ['SILVER', 0xc0c0c0],
            ['GOLD', 0xffd700],
            ['PLATINUM', 0x40e0d0],
            ['EMERALD', 0x50c878],
            ['DIAMOND', 0xb9f2ff],
            ['MASTER', 0x800080],
            ['GRANDMASTER', 0x8b0000],
            ['CHALLENGER', 0x1e90ff],
        ];

        it('contains all 11 expected tiers', () => {
            expect(rankColors.size).toBe(11);
        });

        it.each(expectedTiers)('has correct hex value for %s', (tier, hex) => {
            expect(rankColors.get(tier)).toBe(hex);
        });

        it('returns undefined for unknown tiers', () => {
            expect(rankColors.get('MYTHIC')).toBeUndefined();
            expect(rankColors.get('gold')).toBeUndefined();
        });

        it('does not contain lowercase variants', () => {
            expect(rankColors.has('iron')).toBe(false);
            expect(rankColors.has('challenger')).toBe(false);
        });
    });

    describe('getRankedEmblem', () => {
        const BASE_URL =
            'https://raw.githubusercontent.com/louissullivan4/diana/refs/heads/main/assets/ranked-emblem/';

        it('returns correct URL for a standard tier', () => {
            expect(getRankedEmblem('GOLD')).toBe(`${BASE_URL}gold.webp`);
        });

        it('lowercases the tier in the URL', () => {
            expect(getRankedEmblem('PLATINUM')).toBe(
                `${BASE_URL}platinum.webp`
            );
        });

        it('handles already-lowercase input', () => {
            expect(getRankedEmblem('diamond')).toBe(`${BASE_URL}diamond.webp`);
        });

        it('handles mixed-case input', () => {
            expect(getRankedEmblem('ChAlLeNgEr')).toBe(
                `${BASE_URL}challenger.webp`
            );
        });

        it('strips internal whitespace from tier name', () => {
            expect(getRankedEmblem('GRAND MASTER')).toBe(
                `${BASE_URL}grandmaster.webp`
            );
        });

        it('strips leading and trailing whitespace', () => {
            expect(getRankedEmblem('  IRON  ')).toBe(`${BASE_URL}iron.webp`);
        });

        it('returns null for an empty string', () => {
            expect(getRankedEmblem('')).toBeNull();
        });

        it('returns a URL ending in .webp', () => {
            const url = getRankedEmblem('BRONZE');
            expect(url).toMatch(/\.webp$/);
        });

        it('returns correct URL for UNRANKED', () => {
            expect(getRankedEmblem('UNRANKED')).toBe(
                `${BASE_URL}unranked.webp`
            );
        });
    });

    describe('getChampionThumbnail', () => {
        const BASE_URL =
            'https://ddragon.leagueoflegends.com/cdn/15.2.1/img/champion/';

        it('returns correct URL for a single-word champion name', async () => {
            expect(await getChampionThumbnail('Ahri')).toBe(
                `${BASE_URL}Ahri.png`
            );
        });

        it('uses the fetched Data Dragon version in the URL', async () => {
            const url = await getChampionThumbnail('Ahri');
            expect(url).toContain('/cdn/15.2.1/');
        });

        it('strips spaces from champion names with multiple words', async () => {
            expect(await getChampionThumbnail('Aurelion Sol')).toBe(
                `${BASE_URL}AurelionSol.png`
            );
        });

        it('strips spaces from champions with three words', async () => {
            expect(await getChampionThumbnail('Dr. Mundo')).toBe(
                `${BASE_URL}Dr.Mundo.png`
            );
        });

        it('preserves casing of the champion name', async () => {
            expect(await getChampionThumbnail('MissFortune')).toBe(
                `${BASE_URL}MissFortune.png`
            );
        });

        it('URL-encodes special characters', async () => {
            const url = await getChampionThumbnail("Cho'Gath");
            expect(url).toBe(`${BASE_URL}Cho'Gath.png`);
        });

        it('returns a URL ending in .png', async () => {
            const url = await getChampionThumbnail('Lux');
            expect(url).toMatch(/\.png$/);
        });

        it('returns a URL containing the ddragon CDN base', async () => {
            const url = await getChampionThumbnail('Jinx');
            expect(url).toContain('ddragon.leagueoflegends.com');
        });

        it('handles champion names that are all uppercase (no crash)', async () => {
            const url = await getChampionThumbnail('GAREN');
            expect(url).toBe(`${BASE_URL}GAREN.png`);
        });

        it('handles empty string input without throwing', async () => {
            await expect(getChampionThumbnail('')).resolves.toBe(
                `${BASE_URL}.png`
            );
        });
    });
});
