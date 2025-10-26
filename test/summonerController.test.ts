jest.mock('../src/api/summoners/summonerService', () => ({
    createSummoner: jest.fn(),
    deleteSummoner: jest.fn(),
    getSummonerByAccountName: jest.fn(),
    getSummonerByPuuid: jest.fn(),
    fetchRankHistory: jest.fn(),
    createRankHistory: jest.fn(),
    updateRankHistory: jest.fn(),
    deleteRankHistory: jest.fn(),
}));

import {
    fetchSummonerByAccountName,
    createSummonerHandler,
    deleteSummonerByPuuid,
    fetchRankHistoryByParticipantId,
    createRankHistoryHandler,
    updateRankHistoryByRid,
    deleteRankHistoryByRid,
} from '../src/api/summoners/summonerController';

import * as service from '../src/api/summoners/summonerService';

const createMockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('summonerController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('fetchSummonerByAccountName', () => {
        it('responds with summoner data', async () => {
            const req: any = {
                params: { accountName: 'Player', tagLine: 'NA1', region: 'NA' },
            };
            const res = createMockResponse();
            (service.getSummonerByAccountName as jest.Mock).mockResolvedValue({
                gameName: 'Player',
            });

            await fetchSummonerByAccountName(req, res);

            expect(service.getSummonerByAccountName).toHaveBeenCalledWith(
                'Player',
                'NA1',
                'NA'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                summoner: { gameName: 'Player' },
            });
        });

        it('handles errors by returning 500', async () => {
            const req: any = {
                params: { accountName: 'Player', tagLine: 'NA1', region: 'NA' },
            };
            const res = createMockResponse();
            const err = new Error('db down');
            (service.getSummonerByAccountName as jest.Mock).mockRejectedValue(
                err
            );

            await fetchSummonerByAccountName(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to fetch summoner data.',
            });
            expect(console.error).toHaveBeenCalledWith(
                'Error fetching summoner:',
                err
            );
        });
    });

    describe('createSummonerHandler', () => {
        it('creates summoner when payload valid', async () => {
            const req: any = {
                body: {
                    gameName: 'Player',
                    tagLine: 'NA1',
                    region: 'NA',
                    puuid: '123',
                    tier: 'GOLD',
                    rank: 'II',
                    lp: 50,
                },
            };
            const res = createMockResponse();
            (service.createSummoner as jest.Mock).mockResolvedValue({
                puuid: '123',
            });

            await createSummonerHandler(req, res);

            expect(service.createSummoner).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                newSummoner: { puuid: '123' },
            });
        });

        it('returns 400 when required fields missing', async () => {
            const req: any = { body: { gameName: 'Player' } };
            const res = createMockResponse();

            await createSummonerHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields.',
            });
            expect(service.createSummoner).not.toHaveBeenCalled();
        });

        it('handles service errors with 500', async () => {
            const req: any = {
                body: {
                    gameName: 'Player',
                    tagLine: 'NA1',
                    region: 'NA',
                    puuid: '123',
                    tier: 'GOLD',
                    rank: 'II',
                    lp: 50,
                },
            };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.createSummoner as jest.Mock).mockRejectedValue(err);

            await createSummonerHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to create summoner.',
            });
        });
    });

    describe('deleteSummonerByPuuid', () => {
        it('deletes summoner', async () => {
            const req: any = { params: { puuid: '123' } };
            const res = createMockResponse();
            (service.deleteSummoner as jest.Mock).mockResolvedValue({
                puuid: '123',
            });

            await deleteSummonerByPuuid(req, res);

            expect(service.deleteSummoner).toHaveBeenCalledWith('123');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                deletedSummoner: { puuid: '123' },
            });
        });

        it('returns 400 when puuid missing', async () => {
            const req: any = { params: {} };
            const res = createMockResponse();

            await deleteSummonerByPuuid(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameter: puuid.',
            });
        });

        it('handles service errors', async () => {
            const req: any = { params: { puuid: '123' } };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.deleteSummoner as jest.Mock).mockRejectedValue(err);

            await deleteSummonerByPuuid(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to delete summoner.',
            });
        });
    });

    describe('fetchRankHistoryByParticipantId', () => {
        it('returns rank history when entries exist', async () => {
            const req: any = {
                params: { entryParticipantId: 'puuid' },
                query: {},
            };
            const res = createMockResponse();
            (service.fetchRankHistory as jest.Mock).mockResolvedValue([
                { rid: 1 },
            ]);

            await fetchRankHistoryByParticipantId(req, res);

            expect(service.fetchRankHistory).toHaveBeenCalledWith(
                'puuid',
                undefined,
                undefined,
                undefined
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                rankHistory: [{ rid: 1 }],
            });
        });

        it('returns 400 when participant id missing', async () => {
            const req: any = { params: {}, query: {} };
            const res = createMockResponse();

            await fetchRankHistoryByParticipantId(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameter: entryParticipantId (puuid).',
            });
        });

        it('handles service errors', async () => {
            const req: any = {
                params: { entryParticipantId: 'puuid' },
                query: {},
            };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.fetchRankHistory as jest.Mock).mockRejectedValue(err);

            await fetchRankHistoryByParticipantId(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to fetch rank history.',
            });
        });
    });

    describe('createRankHistoryHandler', () => {
        it('creates rank history record', async () => {
            const req: any = {
                body: {
                    matchId: '1',
                    entryParticipantId: 'puuid',
                    tier: 'GOLD',
                    rank: 'II',
                    lp: 23,
                    queueType: 'RANKED_SOLO_5x5',
                },
            };
            const res = createMockResponse();
            (service.createRankHistory as jest.Mock).mockResolvedValue({
                rid: 1,
            });

            await createRankHistoryHandler(req, res);

            expect(service.createRankHistory).toHaveBeenCalledWith(
                '1',
                'puuid',
                'GOLD',
                'II',
                23,
                'RANKED_SOLO_5x5'
            );
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith({
                newRankHistory: { rid: 1 },
            });
        });

        it('returns 400 when required fields missing', async () => {
            const req: any = {
                body: {
                    entryParticipantId: 'puuid',
                },
            };
            const res = createMockResponse();

            await createRankHistoryHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields.',
            });
        });

        it('handles service failures', async () => {
            const req: any = {
                body: {
                    matchId: '1',
                    entryParticipantId: 'puuid',
                    tier: 'GOLD',
                    rank: 'II',
                    lp: 23,
                    queueType: 'RANKED_SOLO_5x5',
                },
            };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.createRankHistory as jest.Mock).mockRejectedValue(err);

            await createRankHistoryHandler(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to create rank history.',
            });
        });
    });

    describe('updateRankHistoryByRid', () => {
        it('updates rank history entry', async () => {
            const req: any = {
                params: { rid: '5' },
                body: {
                    tier: 'PLATINUM',
                    rank: 'I',
                    lp: 10,
                    queueType: 'RANKED_SOLO_5x5',
                },
            };
            const res = createMockResponse();
            (service.updateRankHistory as jest.Mock).mockResolvedValue({
                rid: 5,
            });

            await updateRankHistoryByRid(req, res);

            expect(service.updateRankHistory).toHaveBeenCalledWith(
                5,
                'PLATINUM',
                'I',
                10,
                'RANKED_SOLO_5x5'
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                updatedRankHistory: { rid: 5 },
            });
        });

        it('returns 400 when required fields missing', async () => {
            const req: any = { params: {}, body: {} };
            const res = createMockResponse();

            await updateRankHistoryByRid(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required fields.',
            });
        });

        it('handles service errors', async () => {
            const req: any = {
                params: { rid: '5' },
                body: {
                    tier: 'PLATINUM',
                    rank: 'I',
                    lp: 10,
                    queueType: 'RANKED_SOLO_5x5',
                },
            };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.updateRankHistory as jest.Mock).mockRejectedValue(err);

            await updateRankHistoryByRid(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to update rank history.',
            });
        });
    });

    describe('deleteRankHistoryByRid', () => {
        it('deletes rank history entry', async () => {
            const req: any = { params: { rid: '9' } };
            const res = createMockResponse();
            (service.deleteRankHistory as jest.Mock).mockResolvedValue({
                rid: 9,
            });

            await deleteRankHistoryByRid(req, res);

            expect(service.deleteRankHistory).toHaveBeenCalledWith(9);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                deletedRankHistory: { rid: 9 },
            });
        });

        it('returns 400 when rid missing', async () => {
            const req: any = { params: {} };
            const res = createMockResponse();

            await deleteRankHistoryByRid(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Missing required parameter: rid.',
            });
        });

        it('handles service errors', async () => {
            const req: any = { params: { rid: '9' } };
            const res = createMockResponse();
            const err = new Error('fail');
            (service.deleteRankHistory as jest.Mock).mockRejectedValue(err);

            await deleteRankHistoryByRid(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Failed to delete rank history.',
            });
        });
    });
});
