jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db',
    () => ({
        db: { query: jest.fn() },
    })
);

import { db } from '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db';
import {
    createApexMatchRecord,
    finishApexMatchRecord,
    getApexMatchRecord,
    getRecentApexMatches,
} from '../packages/diana-core/src/plugins/diana-apex-bot/api/matches/apexMatchService';

const queryMock = db.query as unknown as jest.Mock;

const makeRow = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    player_uid: 'uid-1',
    match_start: 1700000000000,
    match_end: 1700003600000,
    legend: 'Wraith',
    kills_before: 100,
    damage_before: 80000,
    wins_before: 10,
    kills_after: 103,
    damage_after: 82500,
    wins_after: 11,
    rp_before: 1000,
    rp_after: 1150,
    tier_before: 'Gold',
    tier_after: 'Gold',
    game_id: 'apex_legends',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
});

describe('apexMatchService', () => {
    beforeEach(() => {
        queryMock.mockReset();
    });

    describe('createApexMatchRecord', () => {
        it('inserts a pending match record and returns it', async () => {
            const row = makeRow({ match_end: null, kills_after: null });
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await createApexMatchRecord({
                player_uid: 'uid-1',
                match_start: 1700000000000,
                legend: 'Wraith',
                kills_before: 100,
                damage_before: 80000,
                wins_before: 10,
                rp_before: 1000,
                tier_before: 'Gold',
            });

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO apex_match_details'),
                expect.arrayContaining(['uid-1', 1700000000000, 'Wraith'])
            );
            expect(result.player_uid).toBe('uid-1');
            expect(result.legend).toBe('Wraith');
        });
    });

    describe('finishApexMatchRecord', () => {
        it('updates the match with after-stats and returns updated row', async () => {
            const row = makeRow();
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await finishApexMatchRecord({
                id: 1,
                match_end: 1700003600000,
                kills_after: 103,
                damage_after: 82500,
                wins_after: 11,
                rp_after: 1150,
                tier_after: 'Gold',
            });

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE apex_match_details'),
                expect.arrayContaining([1700003600000, 103, 82500, 11, 1150])
            );
            expect(result?.rp_after).toBe(1150);
        });

        it('returns null when record not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await finishApexMatchRecord({
                id: 999,
                match_end: 1700003600000,
                kills_after: 0,
                damage_after: 0,
                wins_after: 0,
                rp_after: 0,
                tier_after: 'Gold',
            });

            expect(result).toBeNull();
        });
    });

    describe('getApexMatchRecord', () => {
        it('returns the match record when found', async () => {
            const row = makeRow();
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await getApexMatchRecord(1);
            expect(result?.id).toBe(1);
        });

        it('returns null when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const result = await getApexMatchRecord(999);
            expect(result).toBeNull();
        });
    });

    describe('getRecentApexMatches', () => {
        it('returns computed ApexMatchResult objects', async () => {
            const row = makeRow();
            queryMock.mockResolvedValue({ rows: [row] });

            const results = await getRecentApexMatches('uid-1', 10);

            expect(results).toHaveLength(1);
            const r = results[0];
            // 103 - 100
            expect(r.kills_gained).toBe(3);
            // 82500 - 80000
            expect(r.damage_gained).toBe(2500);
            // 11 - 10
            expect(r.wins_gained).toBe(1);
            // wins_gained > 0 → WIN
            expect(r.result).toBe('WIN');
            // 1150 - 1000
            expect(r.rp_change).toBe(150);
            // (1700003600000 - 1700000000000) / 1000 = 3600
            expect(r.duration_secs).toBe(3600);
        });

        it('marks result as LOSS when wins unchanged', async () => {
            const row = makeRow({ wins_after: 10 }); // same as wins_before
            queryMock.mockResolvedValue({ rows: [row] });

            const results = await getRecentApexMatches('uid-1', 10);
            expect(results[0].result).toBe('LOSS');
        });

        it('marks result as UNKNOWN when wins_after is null', async () => {
            const row = makeRow({ wins_after: null });
            queryMock.mockResolvedValue({ rows: [row] });

            const results = await getRecentApexMatches('uid-1', 10);
            expect(results[0].result).toBe('UNKNOWN');
        });

        it('queries with game_id and player_uid filters', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await getRecentApexMatches('uid-abc', 5);

            const [query, params] = queryMock.mock.calls[0];
            expect(query).toContain('player_uid');
            expect(query).toContain('game_id');
            expect(params).toContain('uid-abc');
            expect(params).toContain('apex_legends');
        });

        it('returns empty array when no matches found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const results = await getRecentApexMatches('uid-none', 10);
            expect(results).toEqual([]);
        });
    });
});
