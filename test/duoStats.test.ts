jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db',
    () => ({
        db: { query: jest.fn() },
    })
);

import { db } from '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db';
import { getDuoRecord } from '../packages/diana-core/src/plugins/diana-league-bot/utils/duoStats';

const queryMock = db.query as unknown as jest.Mock;

function matchRow(
    matchId: string,
    participants: Array<Record<string, unknown>>,
    gameDuration = 1800
) {
    return {
        matchId,
        gameDuration,
        participants: JSON.stringify(participants),
    };
}

describe('getDuoRecord', () => {
    beforeEach(() => {
        queryMock.mockReset();
    });

    it('queries with JSONB containment for both puuids and DISTINCT ON', async () => {
        queryMock.mockResolvedValue({ rows: [] });

        await getDuoRecord('a', 'b', 1000);

        const [query, params] = queryMock.mock.calls[0];
        expect(query).toContain('DISTINCT ON (md."matchId")');
        expect(query).toContain('@> $1::jsonb');
        expect(query).toContain('@> $2::jsonb');
        expect(params).toEqual([
            JSON.stringify([{ puuid: 'a' }]),
            JSON.stringify([{ puuid: 'b' }]),
            1000,
        ]);
    });

    it('splits games into together and against records', async () => {
        queryMock.mockResolvedValue({
            rows: [
                matchRow('m1', [
                    { puuid: 'a', teamId: 100, win: true },
                    { puuid: 'b', teamId: 100, win: true },
                ]),
                matchRow('m2', [
                    { puuid: 'a', teamId: 100, win: false },
                    { puuid: 'b', teamId: 100, win: false },
                ]),
                matchRow('m3', [
                    { puuid: 'a', teamId: 100, win: true },
                    { puuid: 'b', teamId: 200, win: false },
                ]),
                matchRow('m4', [
                    { puuid: 'a', teamId: 200, win: false },
                    { puuid: 'b', teamId: 100, win: true },
                ]),
            ],
        });

        const record = await getDuoRecord('a', 'b');

        expect(record).toEqual({
            gamesTogether: 2,
            winsTogether: 1,
            lossesTogether: 1,
            gamesAgainst: 2,
            winsForAAgainstB: 1,
        });
    });

    it('skips remakes', async () => {
        queryMock.mockResolvedValue({
            rows: [
                matchRow(
                    'm1',
                    [
                        { puuid: 'a', teamId: 100, win: true },
                        { puuid: 'b', teamId: 100, win: true },
                    ],
                    200
                ),
            ],
        });

        const record = await getDuoRecord('a', 'b');
        expect(record.gamesTogether).toBe(0);
        expect(record.gamesAgainst).toBe(0);
    });

    it('skips matches where a player is missing from the stored data', async () => {
        queryMock.mockResolvedValue({
            rows: [matchRow('m1', [{ puuid: 'a', teamId: 100, win: true }])],
        });

        const record = await getDuoRecord('a', 'b');
        expect(record.gamesTogether).toBe(0);
        expect(record.gamesAgainst).toBe(0);
    });
});
