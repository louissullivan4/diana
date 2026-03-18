// All mocks must be declared before imports (jest.mock is hoisted)
jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/matches/matchService',
    () => ({
        createMatchDetail: jest.fn(),
        getMatchDetailsByPuuid: jest.fn(),
        getMatchDetailsByMatchId: jest.fn(),
        listRecentMatchDetails: jest.fn(),
        listMatchFilterOptions: jest.fn(),
        getRankForMatch: jest.fn(),
        getPreviousRankForMatch: jest.fn(),
        updateMatchDetail: jest.fn(),
        deleteMatchDetail: jest.fn(),
        createMatchTimeline: jest.fn(),
        getMatchTimeline: jest.fn(),
        updateMatchTimeline: jest.fn(),
        deleteMatchTimeline: jest.fn(),
    })
);

jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/dataDragonService',
    () => ({
        getQueueNameById: jest.fn().mockReturnValue('Ranked Solo/Duo'),
        getRoleNameTranslation: jest.fn().mockReturnValue('Top'),
        getRankTagsById: jest.fn().mockReturnValue(null),
    })
);

jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/presentation/leaguePresentation',
    () => ({
        getChampionThumbnail: jest
            .fn()
            .mockReturnValue('https://example.com/img.png'),
    })
);

jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/notifications/leagueNotifications',
    () => ({
        buildMatchEndMessage: jest.fn().mockReturnValue({ embeds: [] }),
        buildRankChangeMessage: jest.fn().mockReturnValue({ embeds: [] }),
    })
);

jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/rankService',
    () => ({
        determineRankMovement: jest.fn().mockReturnValue('no_change'),
    })
);

jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/summoners/summonerService',
    () => ({
        getSummonerByPuuid: jest
            .fn()
            .mockResolvedValue({ deepLolLink: 'https://deeplol.gg' }),
    })
);

import { Request, Response } from 'express';
import * as matchService from '../packages/diana-core/src/plugins/diana-league-bot/api/matches/matchService';
import {
    createMatchDetailHandler,
    getMatchDetailsHandler,
    deleteMatchDetailHandler,
    getRecentMatchDetailsHandler,
    createMatchTimelineHandler,
    fetchMatchTimelineHandler,
} from '../packages/diana-core/src/plugins/diana-league-bot/api/matches/matchController';

// Typed service mocks
const createMatchDetailMock = matchService.createMatchDetail as jest.Mock;
const getMatchDetailsByPuuidMock =
    matchService.getMatchDetailsByPuuid as jest.Mock;
const listRecentMatchDetailsMock =
    matchService.listRecentMatchDetails as jest.Mock;
const deleteMatchDetailMock = matchService.deleteMatchDetail as jest.Mock;
const createMatchTimelineMock = matchService.createMatchTimeline as jest.Mock;
const getMatchTimelineMock = matchService.getMatchTimeline as jest.Mock;

// Helper to build mock req/res
function buildReqRes(overrides: {
    params?: Record<string, string>;
    body?: Record<string, any>;
    query?: Record<string, any>;
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

describe('matchController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('getMatchDetailsHandler', () => {
        it('returns 200 with match details on success', async () => {
            const rows = [{ matchId: 'match-1', entryPlayerPuuid: 'puuid-1' }];
            getMatchDetailsByPuuidMock.mockResolvedValue(rows);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { puuid: 'puuid-1' },
                query: { numberOfMatches: '10' },
            });

            await getMatchDetailsHandler(req as any, res as Response);

            expect(getMatchDetailsByPuuidMock).toHaveBeenCalledWith(
                'puuid-1',
                '10'
            );
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(rows);
        });

        it('returns 200 with default numberOfMatches when not supplied', async () => {
            const rows = [{ matchId: 'match-1' }];
            getMatchDetailsByPuuidMock.mockResolvedValue(rows);

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-1' },
            });

            await getMatchDetailsHandler(req as any, res as Response);

            expect(getMatchDetailsByPuuidMock).toHaveBeenCalledWith(
                'puuid-1',
                20
            );
            expect(statusMock).toHaveBeenCalledWith(200);
        });

        it('returns 404 when no match details are found', async () => {
            getMatchDetailsByPuuidMock.mockResolvedValue([]);

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-1' },
            });

            await getMatchDetailsHandler(req as any, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 when puuid param is missing', async () => {
            const { req, res, statusMock } = buildReqRes({ params: {} });

            await getMatchDetailsHandler(req as any, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(getMatchDetailsByPuuidMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            getMatchDetailsByPuuidMock.mockRejectedValue(new Error('db error'));

            const { req, res, statusMock } = buildReqRes({
                params: { puuid: 'puuid-1' },
            });

            await getMatchDetailsHandler(req as any, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createMatchDetailHandler', () => {
        const matchBody = {
            matchId: 'match-1',
            entryPlayerPuuid: 'puuid-1',
            gameMode: 'CLASSIC',
        };

        it('returns 201 on successful creation', async () => {
            const created = { id: 1, ...matchBody };
            createMatchDetailMock.mockResolvedValue(created);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                body: matchBody,
            });

            await createMatchDetailHandler(req as Request, res as Response);

            expect(createMatchDetailMock).toHaveBeenCalledWith(matchBody);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(created);
        });

        it('returns 201 with null when service returns null (conflict/already exists)', async () => {
            createMatchDetailMock.mockResolvedValue(null);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                body: matchBody,
            });

            await createMatchDetailHandler(req as Request, res as Response);

            // The handler returns 201 regardless — null signals a skipped insert
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(null);
        });

        it('returns 500 when service throws', async () => {
            createMatchDetailMock.mockRejectedValue(new Error('insert error'));

            const { req, res, statusMock } = buildReqRes({ body: matchBody });

            await createMatchDetailHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteMatchDetailHandler', () => {
        it('returns 200 on successful deletion', async () => {
            deleteMatchDetailMock.mockResolvedValue({ matchId: 'match-1' });

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { matchId: 'match-1' },
            });

            await deleteMatchDetailHandler(req as Request, res as Response);

            expect(deleteMatchDetailMock).toHaveBeenCalledWith('match-1');
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: 'Match detail deleted successfully.',
            });
        });

        it('returns 404 when match is not found (service returns null/falsy)', async () => {
            deleteMatchDetailMock.mockResolvedValue(null);

            const { req, res, statusMock } = buildReqRes({
                params: { matchId: 'match-999' },
            });

            await deleteMatchDetailHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 when matchId param is missing', async () => {
            const { req, res, statusMock } = buildReqRes({ params: {} });

            await deleteMatchDetailHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(deleteMatchDetailMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            deleteMatchDetailMock.mockRejectedValue(new Error('delete error'));

            const { req, res, statusMock } = buildReqRes({
                params: { matchId: 'match-1' },
            });

            await deleteMatchDetailHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('getRecentMatchDetailsHandler', () => {
        const makeRow = (overrides: Record<string, any> = {}) => ({
            mid: 1,
            matchId: 'match-1',
            entryPlayerPuuid: 'puuid-1',
            queueId: 420,
            gameDuration: 1800,
            gameCreation: Date.now(),
            match_result: 'Win',
            entryParticipant: {
                puuid: 'puuid-1',
                riotIdGameName: 'Alice',
                riotIdTagline: 'NA1',
                championName: 'Jinx',
                kills: 5,
                deaths: 2,
                assists: 8,
                win: true,
                totalDamageDealtToChampions: 25000,
                individualPosition: 'BOTTOM',
            },
            ...overrides,
        });

        it('returns 200 with matches and pagination data', async () => {
            const rows = [makeRow()];
            listRecentMatchDetailsMock.mockResolvedValue(rows);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                query: { limit: '10', offset: '0' },
            });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            expect(listRecentMatchDetailsMock).toHaveBeenCalledWith(10, 0, {
                entryPlayerPuuid: undefined,
                queueId: undefined,
                result: undefined,
            });
            expect(statusMock).toHaveBeenCalledWith(200);
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('matches');
            expect(response).toHaveProperty('limit', 10);
            expect(response).toHaveProperty('offset', 0);
            expect(response).toHaveProperty('hasMore', false); // 1 row < limit 10
        });

        it('caps limit at 50 when a larger value is provided', async () => {
            listRecentMatchDetailsMock.mockResolvedValue([]);

            const { req, res } = buildReqRes({
                query: { limit: '200', offset: '0' },
            });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            expect(listRecentMatchDetailsMock).toHaveBeenCalledWith(
                50,
                0,
                expect.any(Object)
            );
        });

        it('defaults limit to 20 when not provided', async () => {
            listRecentMatchDetailsMock.mockResolvedValue([]);

            const { req, res } = buildReqRes({ query: {} });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            expect(listRecentMatchDetailsMock).toHaveBeenCalledWith(
                20,
                0,
                expect.any(Object)
            );
        });

        it('passes player puuid filter when provided', async () => {
            listRecentMatchDetailsMock.mockResolvedValue([]);

            const { req, res } = buildReqRes({
                query: { player: 'puuid-filter' },
            });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            expect(listRecentMatchDetailsMock).toHaveBeenCalledWith(
                20,
                0,
                expect.objectContaining({ entryPlayerPuuid: 'puuid-filter' })
            );
        });

        it('sets hasMore to true when rows.length equals limit', async () => {
            // Create exactly `limit` rows
            const limit = 5;
            const rows = Array(limit)
                .fill(null)
                .map((_, i) => makeRow({ mid: i, matchId: `match-${i}` }));
            listRecentMatchDetailsMock.mockResolvedValue(rows);

            const { req, res, jsonMock } = buildReqRes({
                query: { limit: String(limit), offset: '0' },
            });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            const response = jsonMock.mock.calls[0][0];
            expect(response.hasMore).toBe(true);
        });

        it('correctly maps result field from match row', async () => {
            const rows = [makeRow({ match_result: 'Lose' })];
            listRecentMatchDetailsMock.mockResolvedValue(rows);

            const { req, res, jsonMock } = buildReqRes({ query: {} });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            const response = jsonMock.mock.calls[0][0];
            expect(response.matches[0].result).toBe('Lose');
        });

        it('falls back to Remake result for short game duration without match_result', async () => {
            const rows = [makeRow({ match_result: null, gameDuration: 100 })];
            listRecentMatchDetailsMock.mockResolvedValue(rows);

            const { req, res, jsonMock } = buildReqRes({ query: {} });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            const response = jsonMock.mock.calls[0][0];
            expect(response.matches[0].result).toBe('Remake');
        });

        it('returns 500 when service throws', async () => {
            listRecentMatchDetailsMock.mockRejectedValue(new Error('db error'));

            const { req, res, statusMock } = buildReqRes({ query: {} });

            await getRecentMatchDetailsHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('createMatchTimelineHandler', () => {
        const timelineBody = { matchId: 'match-1', timelineData: '{}' };

        it('returns 201 on successful timeline creation', async () => {
            const created = { id: 1, ...timelineBody };
            createMatchTimelineMock.mockResolvedValue(created);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                body: timelineBody,
            });

            await createMatchTimelineHandler(req as Request, res as Response);

            expect(createMatchTimelineMock).toHaveBeenCalledWith(timelineBody);
            expect(statusMock).toHaveBeenCalledWith(201);
            expect(jsonMock).toHaveBeenCalledWith(created);
        });

        it('returns 500 when service throws', async () => {
            createMatchTimelineMock.mockRejectedValue(
                new Error('insert error')
            );

            const { req, res, statusMock } = buildReqRes({
                body: timelineBody,
            });

            await createMatchTimelineHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });

    describe('fetchMatchTimelineHandler', () => {
        it('returns 200 with timeline data on success', async () => {
            const timeline = [
                { id: 1, matchId: 'match-1', timelineData: '{}' },
            ];
            getMatchTimelineMock.mockResolvedValue(timeline);

            const { req, res, statusMock, jsonMock } = buildReqRes({
                params: { matchId: 'match-1' },
            });

            await fetchMatchTimelineHandler(req as Request, res as Response);

            expect(getMatchTimelineMock).toHaveBeenCalledWith('match-1');
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith(timeline);
        });

        it('returns 404 when timeline is empty', async () => {
            getMatchTimelineMock.mockResolvedValue([]);

            const { req, res, statusMock } = buildReqRes({
                params: { matchId: 'match-1' },
            });

            await fetchMatchTimelineHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
        });

        it('returns 400 when matchId param is missing', async () => {
            const { req, res, statusMock } = buildReqRes({ params: {} });

            await fetchMatchTimelineHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(getMatchTimelineMock).not.toHaveBeenCalled();
        });

        it('returns 500 when service throws', async () => {
            getMatchTimelineMock.mockRejectedValue(new Error('query error'));

            const { req, res, statusMock } = buildReqRes({
                params: { matchId: 'match-1' },
            });

            await fetchMatchTimelineHandler(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
        });
    });
});
