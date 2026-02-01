jest.mock('../src/plugins/diana-league-bot/api/utils/db', () => ({
    db: {
        query: jest.fn(),
    },
}));

import { db } from '../src/plugins/diana-league-bot/api/utils/db';
import * as summonerService from '../src/plugins/diana-league-bot/api/summoners/summonerService';

const queryMock = db.query as unknown as jest.Mock;

describe('summonerService', () => {
    beforeEach(() => {
        queryMock.mockReset();
        jest.spyOn(console, 'info').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getSummonerByAccountName', () => {
        it('returns summoner when found', async () => {
            const row = { gameName: 'Test', tagLine: 'NA1' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.getSummonerByAccountName(
                'Test',
                'NA1',
                'NA'
            );

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('SELECT * FROM summoners'),
                ['Test', 'NA1', 'NA']
            );
        });

        it('returns message and logs when summoner not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.getSummonerByAccountName(
                'Test',
                'NA1',
                'NA'
            );

            expect(result).toEqual({ msg: 'No summoner found' });
            expect(console.info).toHaveBeenCalled();
        });

        it('throws formatted error on failure', async () => {
            const dbError = new Error('db down');
            queryMock.mockRejectedValue(dbError);

            await expect(
                summonerService.getSummonerByAccountName('Test', 'NA1', 'NA')
            ).rejects.toThrow('Failed to retrieve summoner details.');
            expect(console.error).toHaveBeenCalledWith(
                'Error retrieving summoner details:',
                dbError
            );
        });
    });

    describe('searchSummonerGameNames', () => {
        it('searches with trimmed query and returns names', async () => {
            queryMock.mockResolvedValue({
                rows: [{ gameName: 'Alice' }, { gameName: 'Alistar' }],
            });

            const result = await summonerService.searchSummonerGameNames(
                ' Al ',
                10
            );

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('ILIKE'),
                ['Al%', 10]
            );
            expect(result).toEqual(['Alice', 'Alistar']);
        });

        it('queries without search term', async () => {
            queryMock.mockResolvedValue({
                rows: [{ gameName: 'First' }],
            });

            const result = await summonerService.searchSummonerGameNames('', 5);

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('ORDER BY "gameName" ASC'),
                [5]
            );
            expect(result).toEqual(['First']);
        });

        it('throws formatted error on failure', async () => {
            const dbError = new Error('timeout');
            queryMock.mockRejectedValue(dbError);

            await expect(
                summonerService.searchSummonerGameNames('Test', 5)
            ).rejects.toThrow('Failed to search summoner game names.');
            expect(console.error).toHaveBeenCalledWith(
                'Error searching summoner game names:',
                dbError
            );
        });
    });

    describe('searchSummonerTags', () => {
        it('returns tag suggestions filtered by name and search term', async () => {
            queryMock.mockResolvedValue({
                rows: [
                    { tagLine: 'NA1', matchRegionPrefix: 'na1' },
                    { tagLine: 'NA2', matchRegionPrefix: 'na2' },
                ],
            });

            const result = await summonerService.searchSummonerTags(
                ' Player ',
                ' N ',
                15
            );

            expect(queryMock).toHaveBeenCalled();
            const [, params] = queryMock.mock.calls[0];
            expect(params).toEqual(['Player', 'N%', 15]);
            expect(result).toEqual([
                { tagLine: 'NA1', matchRegionPrefix: 'na1' },
                { tagLine: 'NA2', matchRegionPrefix: 'na2' },
            ]);
        });

        it('handles missing game name and search', async () => {
            queryMock.mockResolvedValue({
                rows: [{ tagLine: 'EUW', matchRegionPrefix: 'euw1' }],
            });

            const result = await summonerService.searchSummonerTags(
                null,
                '',
                3
            );

            expect(queryMock).toHaveBeenCalledWith(expect.any(String), [3]);
            expect(result).toEqual([
                { tagLine: 'EUW', matchRegionPrefix: 'euw1' },
            ]);
        });

        it('throws formatted error on failure', async () => {
            const dbError = new Error('query failed');
            queryMock.mockRejectedValue(dbError);

            await expect(
                summonerService.searchSummonerTags('Player', 'NA', 5)
            ).rejects.toThrow('Failed to search summoner tags.');
            expect(console.error).toHaveBeenCalledWith(
                'Error searching summoner tags:',
                dbError
            );
        });
    });

    describe('getSummonerByPuuid', () => {
        it('returns summoner when found', async () => {
            const row = { puuid: '123' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.getSummonerByPuuid('123');
            expect(result).toBe(row);
        });

        it('returns message when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.getSummonerByPuuid('123');
            expect(result).toEqual({ msg: 'No summoner found' });
        });
    });

    describe('getSummonerCurrentGame', () => {
        it('returns current match id when present', async () => {
            queryMock.mockResolvedValue({ rows: [{ currentMatchId: 'ABC' }] });

            const result = await summonerService.getSummonerCurrentGame('123');
            expect(result).toEqual({ currentMatchId: 'ABC' });
        });

        it('returns empty object when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.getSummonerCurrentGame('123');
            expect(result).toEqual({});
        });
    });

    describe('createSummoner', () => {
        it('inserts and returns created summoner', async () => {
            const row = { puuid: '123', gameName: 'Player' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.createSummoner({
                puuid: '123',
                gameName: 'Player',
                tagLine: 'NA1',
            } as any);

            expect(queryMock).toHaveBeenCalled();
            expect(result).toBe(row);
        });
    });

    describe('deleteSummoner', () => {
        it('returns deleted summoner when successful', async () => {
            const row = { puuid: '123' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.deleteSummoner('123');
            expect(result).toBe(row);
        });

        it('returns message when summoner not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.deleteSummoner('123');
            expect(result).toEqual({ msg: 'No summoner found' });
        });
    });

    describe('setSummonerCurrentMatchIdByPuuid', () => {
        it('updates match id and returns summoner', async () => {
            const row = { puuid: '123', currentMatchId: 'XYZ' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result =
                await summonerService.setSummonerCurrentMatchIdByPuuid(
                    '123',
                    'XYZ'
                );
            expect(result).toBe(row);
        });

        it('returns message when summoner missing', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result =
                await summonerService.setSummonerCurrentMatchIdByPuuid(
                    '123',
                    'XYZ'
                );
            expect(result).toEqual({ msg: 'No summoner found' });
        });
    });

    describe('fetchRankHistory', () => {
        it('builds query with optional filters', async () => {
            queryMock.mockResolvedValue({ rows: [{ rid: 1 }] });

            const result = await summonerService.fetchRankHistory(
                'entry-1',
                '2024-01-01',
                '2024-02-01',
                'RANKED_SOLO_5x5'
            );

            expect(queryMock).toHaveBeenCalled();
            const [query, params] = queryMock.mock.calls[0];
            expect(query).toContain('"lastUpdated" >=');
            expect(query).toContain('"lastUpdated" <=');
            expect(query).toContain('"queueType" =');
            expect(params).toEqual([
                'entry-1',
                '2024-01-01',
                '2024-02-01',
                'RANKED_SOLO_5x5',
            ]);
            expect(result).toEqual([{ rid: 1 }]);
        });
    });

    describe('createRankHistory', () => {
        it('inserts new rank history and returns row', async () => {
            const row = { rid: 2 };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.createRankHistory(
                '12',
                'entry-1',
                'GOLD',
                'II',
                45,
                'RANKED_SOLO_5x5'
            );

            expect(queryMock).toHaveBeenCalled();
            expect(result).toBe(row);
        });
    });

    describe('updateRankHistory', () => {
        it('returns updated row when found', async () => {
            const row = { rid: 1, tier: 'PLATINUM' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.updateRankHistory(
                1,
                'PLATINUM',
                'I',
                10,
                'RANKED_SOLO_5x5'
            );

            expect(result).toBe(row);
        });

        it('returns message when rank history missing', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.updateRankHistory(
                1,
                'PLATINUM',
                'I',
                10,
                'RANKED_SOLO_5x5'
            );

            expect(result).toEqual({ msg: 'No rank history found' });
            expect(console.info).toHaveBeenCalledWith(
                'Rank history with RID 1 not found.'
            );
        });
    });

    describe('deleteRankHistory', () => {
        it('returns deleted row when present', async () => {
            const row = { rid: 3 };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await summonerService.deleteRankHistory(3);
            expect(result).toBe(row);
        });

        it('returns message when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await summonerService.deleteRankHistory(3);
            expect(result).toEqual({ msg: 'No rank history found' });
        });
    });
});
