// Mock summonerService before any imports
jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/summoners/summonerService',
    () => ({
        getSummonerByAccountName: jest.fn(),
        createSummoner: jest.fn(),
        deleteSummoner: jest.fn(),
        fetchRankHistory: jest.fn(),
        createRankHistory: jest.fn(),
        updateRankHistory: jest.fn(),
        deleteRankHistory: jest.fn(),
    })
);

import { Request, Response } from 'express';
import * as summonerService from '../packages/diana-core/src/plugins/diana-league-bot/api/summoners/summonerService';
import {
    fetchSummonerByAccountName,
    createSummonerHandler,
    deleteSummonerByPuuid,
    fetchRankHistoryByParticipantId,
    createRankHistoryHandler,
} from '../packages/diana-core/src/plugins/diana-league-bot/api/summoners/summonerController';

// Typed mocks
const getSummonerByAccountNameMock =
    summonerService.getSummonerByAccountName as jest.Mock;
const createSummonerMock = summonerService.createSummoner as jest.Mock;
const deleteSummonerMock = summonerService.deleteSummoner as jest.Mock;
const fetchRankHistoryMock = summonerService.fetchRankHistory as jest.Mock;
const createRankHistoryMock = summonerService.createRankHistory as jest.Mock;

// Helper to build mock req/res
function buildReqRes(overrides: {
    params?: Record<string, string>;
    body?: Record<string, any>;
    query?: Record<string, string>;
}): {
    req: Partial<Request>;
    res: Partial<Response>;
    jsonMock: jest.Mock;
    statusMock: jest.Mock;
} {
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const res: Partial<Response> = {
        status: statusMock,
        json: jsonMock,
    };
    const req: Partial<Request> = {
        params: (overrides.params ?? {}) as any,
        body: overrides.body ?? {},
        query: (overrides.query ?? {}) as any,
    };
    return { req, res, jsonMock, statusMock };
}

describe('summonerController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('fetchSummonerByAccountName', () => {
        it('returns 200 with summoner data when found', async () => {
            const summoner = {
                gameName: 'Alice',
                tagLine: 'NA1',
                region: 'NA',
            };
            getSummonerByAccountNameMock.mockResolvedValue(summoner);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { accountName: 'Alice', tagLine: 'NA1', region: 'NA' },
            });

            await fetchSummonerByAccountName(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ summoner });
        });

        it('returns 200 when summoner service returns { msg } object (non-empty object)', async () => {
            // The controller checks Object.keys(summoner).length === 0.
            // { msg: 'No summoner found' } has 1 key, so it is treated as a found summoner.
            // The 404 path is only hit when the result is truly empty ({}) or falsy.
            getSummonerByAccountNameMock.mockResolvedValue({
                msg: 'No summoner found',
            });

            const { req, res, statusMock } = buildReqRes({
                params: { accountName: 'Ghost', tagLine: 'EUW', region: 'EUW' },
            });

            await fetchSummonerByAccountName(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 404 when summoner service returns empty object', async () => {
            getSummonerByAccountNameMock.mockResolvedValue({});

            const { req, res, statusMock } = buildReqRes({
                params: { accountName: 'Ghost', tagLine: 'EUW', region: 'EUW' },
            });

            await fetchSummonerByAccountName(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 when required params are missing', async () => {
            const { req, res, statusMock } = buildReqRes({
                params: { accountName: 'Alice' }, // missing tagLine and region
            });

            await fetchSummonerByAccountName(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(getSummonerByAccountNameMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            getSummonerByAccountNameMock.mockRejectedValue(
                new Error('db error')
            );

            const { req, res, statusMock } = buildReqRes({
                params: { accountName: 'Alice', tagLine: 'NA1', region: 'NA' },
            });

            await fetchSummonerByAccountName(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createSummonerHandler', () => {
        const validBody = {
            gameName: 'Alice',
            tagLine: 'NA1',
            region: 'NA',
            puuid: 'puuid-123',
            tier: 'GOLD',
            rank: 'II',
            lp: 50,
        };

        it('returns 201 with new summoner on success', async () => {
            const newSummoner = { ...validBody, id: 1 };
            createSummonerMock.mockResolvedValue(newSummoner);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                body: validBody,
            });

            await createSummonerHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ newSummoner });
        });

        it('returns 400 when required fields are missing', async () => {
            const { req, res, statusMock } = buildReqRes({
                body: { gameName: 'Alice' }, // missing many fields
            });

            await createSummonerHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(createSummonerMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            createSummonerMock.mockRejectedValue(new Error('insert failed'));

            const { req, res, statusMock } = buildReqRes({ body: validBody });

            await createSummonerHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteSummonerByPuuid', () => {
        it('returns 200 with deleted summoner on success', async () => {
            const deletedSummoner = { puuid: 'puuid-123', gameName: 'Alice' };
            deleteSummonerMock.mockResolvedValue(deletedSummoner);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { puuid: 'puuid-123' },
            });

            await deleteSummonerByPuuid(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ deletedSummoner });
        });

        it('returns 404 when summoner not found (empty object returned)', async () => {
            deleteSummonerMock.mockResolvedValue({});

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-999' },
            });

            await deleteSummonerByPuuid(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 200 when service returns { msg } object (non-empty object)', async () => {
            // The controller checks Object.keys(deletedSummoner).length === 0.
            // { msg: 'No summoner found' } has 1 key and passes that check, resulting in 200.
            deleteSummonerMock.mockResolvedValue({ msg: 'No summoner found' });

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-999' },
            });

            await deleteSummonerByPuuid(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 400 when puuid param is missing', async () => {
            const { req, res, statusMock } = buildReqRes({ params: {} });

            await deleteSummonerByPuuid(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(deleteSummonerMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            deleteSummonerMock.mockRejectedValue(new Error('db error'));

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-123' },
            });

            await deleteSummonerByPuuid(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('fetchRankHistoryByParticipantId', () => {
        it('returns 200 with rank history on success', async () => {
            const rankHistory = [{ rid: 1, tier: 'GOLD', rank: 'II', lp: 50 }];
            fetchRankHistoryMock.mockResolvedValue(rankHistory);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { entryParticipantId: 'puuid-123' },
                query: {
                    startDate: '2024-01-01',
                    endDate: '2024-02-01',
                    queueType: 'RANKED_SOLO_5x5',
                },
            });

            await fetchRankHistoryByParticipantId(
                req as Request,
                res as Response
            );

            expect(fetchRankHistoryMock).toHaveBeenCalledWith(
                'puuid-123',
                '2024-01-01',
                '2024-02-01',
                'RANKED_SOLO_5x5'
            );
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ rankHistory });
        });

        it('returns 404 when no rank history found', async () => {
            fetchRankHistoryMock.mockResolvedValue([]);

            const { req, res, statusMock } = buildReqRes({
                params: { entryParticipantId: 'puuid-123' },
            });

            await fetchRankHistoryByParticipantId(
                req as Request,
                res as Response
            );

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 when entryParticipantId param is missing', async () => {
            const { req, res, statusMock } = buildReqRes({ params: {} });

            await fetchRankHistoryByParticipantId(
                req as Request,
                res as Response
            );

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(fetchRankHistoryMock).not.toHaveBeenCalled();
        });

        it('passes undefined for optional query params when absent', async () => {
            fetchRankHistoryMock.mockResolvedValue([{ rid: 1 }]);

            const { req, res } = buildReqRes({
                params: { entryParticipantId: 'puuid-123' },
                // no startDate, endDate, or queueType
            });

            await fetchRankHistoryByParticipantId(
                req as Request,
                res as Response
            );

            expect(fetchRankHistoryMock).toHaveBeenCalledWith(
                'puuid-123',
                undefined,
                undefined,
                undefined
            );
        });

        it('returns 500 when service throws', async () => {
            fetchRankHistoryMock.mockRejectedValue(new Error('db failure'));

            const { req, res, statusMock } = buildReqRes({
                params: { entryParticipantId: 'puuid-123' },
            });

            await fetchRankHistoryByParticipantId(
                req as Request,
                res as Response
            );

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createRankHistoryHandler', () => {
        const validBody = {
            matchId: 'match-1',
            entryParticipantId: 'puuid-123',
            tier: 'GOLD',
            rank: 'II',
            lp: 50,
            queueType: 'RANKED_SOLO_5x5',
        };

        it('returns 201 with new rank history on success', async () => {
            const newRankHistory = { rid: 1, ...validBody };
            createRankHistoryMock.mockResolvedValue(newRankHistory);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                body: validBody,
            });

            await createRankHistoryHandler(req as Request, res as Response);

            expect(createRankHistoryMock).toHaveBeenCalledWith(
                'match-1',
                'puuid-123',
                'GOLD',
                'II',
                50,
                'RANKED_SOLO_5x5'
            );
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith({ newRankHistory });
        });

        it('returns 400 when required fields are missing', async () => {
            const { req, res, statusMock } = buildReqRes({
                body: { matchId: 'match-1' }, // missing many fields
            });

            await createRankHistoryHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(createRankHistoryMock).not.toHaveBeenCalled();
        });

        it('allows lp of 0 (does not treat as missing)', async () => {
            const bodyWithZeroLp = { ...validBody, lp: 0 };
            createRankHistoryMock.mockResolvedValue({
                rid: 5,
                ...bodyWithZeroLp,
            });

            const { req, res, statusMock } = buildReqRes({
                body: bodyWithZeroLp,
            });

            await createRankHistoryHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(201);
        });

        it('returns 500 when service throws', async () => {
            createRankHistoryMock.mockRejectedValue(
                new Error('constraint violation')
            );

            const { req, res, statusMock } = buildReqRes({ body: validBody });

            await createRankHistoryHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
