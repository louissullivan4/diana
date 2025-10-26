jest.mock('../src/api/utils/db', () => ({
    db: {
        query: jest.fn(),
    },
}));

import { db } from '../src/api/utils/db';
import * as matchService from '../src/api/matches/matchService';

const queryMock = db.query as unknown as jest.Mock;

describe('matchService', () => {
    beforeEach(() => {
        queryMock.mockReset();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createMatchDetail', () => {
        it('inserts match detail and returns row', async () => {
            const row = { matchId: '1' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.createMatchDetail({
                matchId: '1',
                entryPlayerPuuid: 'puuid',
            });

            expect(queryMock).toHaveBeenCalled();
            expect(result).toBe(row);
        });

        it('returns null when insert is skipped due to conflict', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await matchService.createMatchDetail({
                matchId: '1',
                entryPlayerPuuid: 'puuid',
            });

            expect(result).toBeNull();
        });

        it('throws formatted error on failure', async () => {
            const dbError = new Error('db down');
            queryMock.mockRejectedValue(dbError);

            await expect(
                matchService.createMatchDetail({
                    matchId: '1',
                    entryPlayerPuuid: 'puuid',
                })
            ).rejects.toThrow('Failed to create match detail.');
            expect(console.error).toHaveBeenCalledWith(
                'Error creating match detail:',
                dbError
            );
        });
    });

    describe('getMatchDetailsByPuuid', () => {
        it('returns match details for provided puuid', async () => {
            const rows = [{ matchId: '1' }];
            queryMock.mockResolvedValue({ rows });

            const result = await matchService.getMatchDetailsByPuuid(
                'puuid',
                10
            );

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('LIMIT $2'),
                ['puuid', '10']
            );
            expect(result).toBe(rows);
        });
    });

    describe('getMatchDetailsByMatchId', () => {
        it('returns matches associated with match id', async () => {
            const rows = [{ matchId: 'abc' }];
            queryMock.mockResolvedValue({ rows });

            const result = await matchService.getMatchDetailsByMatchId('abc');
            expect(queryMock).toHaveBeenCalledWith(expect.any(String), ['abc']);
            expect(result).toBe(rows);
        });
    });

    describe('updateMatchDetail', () => {
        it('updates and returns match detail', async () => {
            const row = { matchId: 'abc', gameMode: 'ARAM' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.updateMatchDetail('abc', {
                matchId: 'abc',
                entryPlayerPuuid: 'puuid',
                gameVersion: '1.0',
                gameCreation: 0,
                gameStartTime: 0,
                gameEndTime: 0,
                gameDuration: 0,
                gameMode: 'ARAM',
                gameType: 'Custom',
                queueType: 'ARAM',
                queueId: 450,
                mapName: 12,
                participants: '[]',
                teams: '[]',
            });

            expect(result).toBe(row);
        });
    });

    describe('deleteMatchDetail', () => {
        it('returns deleted match detail', async () => {
            const row = { matchId: 'abc' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.deleteMatchDetail('abc');
            expect(result).toBe(row);
        });
    });

    describe('match timeline helpers', () => {
        it('creates timeline entries', async () => {
            const row = { id: 1 };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.createMatchTimeline({
                matchId: 'abc',
                timelineData: '{}',
            });

            expect(queryMock).toHaveBeenCalled();
            expect(result).toBe(row);
        });

        it('retrieves timelines by match id', async () => {
            const rows = [{ id: 1 }];
            queryMock.mockResolvedValue({ rows });

            const result = await matchService.getMatchTimeline('abc');
            expect(queryMock).toHaveBeenCalledWith(expect.any(String), ['abc']);
            expect(result).toBe(rows);
        });

        it('updates timeline by id', async () => {
            const row = { id: 1, timelineData: '{}' };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.updateMatchTimeline('1', {
                matchId: 'abc',
                timelineData: '{}',
            });

            expect(queryMock).toHaveBeenCalled();
            expect(result).toBe(row);
        });

        it('deletes timeline by id', async () => {
            const row = { id: 1 };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await matchService.deleteMatchTimeline('1');
            expect(queryMock).toHaveBeenCalledWith(expect.any(String), ['1']);
            expect(result).toBe(row);
        });
    });
});
