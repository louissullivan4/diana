jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db',
    () => ({
        db: { query: jest.fn() },
    })
);

import { db } from '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db';
import {
    getApexPlayerByUid,
    getApexPlayerByName,
    createApexPlayer,
    updateApexPlayerRank,
    deleteApexPlayer,
    getAllTrackedApexPlayers,
    setApexPlayerMatchId,
    getApexPlayerCurrentMatchId,
    extractLegendStats,
    isInActiveMatch,
    extractMatchRecordId,
} from '../packages/diana-core/src/plugins/diana-apex-bot/api/players/playerService';
import { APEX_IN_GAME_PREFIX } from '../packages/diana-core/src/plugins/diana-apex-bot/types';

const queryMock = db.query as unknown as jest.Mock;

describe('apexPlayerService', () => {
    beforeEach(() => {
        queryMock.mockReset();
    });

    // ─── Pure helper functions ─────────────────────────────────────────────────

    describe('extractLegendStats', () => {
        it('returns zero stats for null input', () => {
            expect(extractLegendStats(null)).toEqual({
                kills: 0,
                damage: 0,
                wins: 0,
            });
        });

        it('returns zero stats when data array is absent', () => {
            expect(extractLegendStats({} as any)).toEqual({
                kills: 0,
                damage: 0,
                wins: 0,
            });
        });

        it('extracts kills, damage, and wins by key', () => {
            const legendData = {
                data: [
                    { key: 'kills', name: 'Kills', value: 120 },
                    { key: 'damage', name: 'Damage Dealt', value: 95000 },
                    { key: 'wins', name: 'Wins', value: 15 },
                ],
            };
            expect(extractLegendStats(legendData)).toEqual({
                kills: 120,
                damage: 95000,
                wins: 15,
            });
        });

        it('matches stats by name when key differs', () => {
            const legendData = {
                data: [
                    { key: 'stat1', name: 'kills', value: 50 },
                    { key: 'stat2', name: 'damage dealt', value: 40000 },
                    { key: 'stat3', name: 'wins', value: 8 },
                ],
            };
            expect(extractLegendStats(legendData)).toEqual({
                kills: 50,
                damage: 40000,
                wins: 8,
            });
        });

        it('ignores unrecognized entries', () => {
            const legendData = {
                data: [
                    { key: 'headshots', name: 'Headshots', value: 300 },
                    { key: 'kills', name: 'Kills', value: 75 },
                ],
            };
            const result = extractLegendStats(legendData);
            expect(result.kills).toBe(75);
            expect(result.damage).toBe(0);
            expect(result.wins).toBe(0);
        });
    });

    describe('isInActiveMatch', () => {
        it('returns true when currentMatchId starts with APEX_IN_GAME_PREFIX', () => {
            expect(isInActiveMatch(`${APEX_IN_GAME_PREFIX}42`)).toBe(true);
        });

        it('returns false for null', () => {
            expect(isInActiveMatch(null)).toBe(false);
        });

        it('returns false for undefined', () => {
            expect(isInActiveMatch(undefined)).toBe(false);
        });

        it('returns false for arbitrary string', () => {
            expect(isInActiveMatch('some-other-id')).toBe(false);
        });
    });

    describe('extractMatchRecordId', () => {
        it('parses the numeric id from a prefixed match id', () => {
            expect(extractMatchRecordId(`${APEX_IN_GAME_PREFIX}99`)).toBe(99);
        });

        it('handles single-digit ids', () => {
            expect(extractMatchRecordId(`${APEX_IN_GAME_PREFIX}1`)).toBe(1);
        });
    });

    // ─── DB functions ─────────────────────────────────────────────────────────

    describe('getApexPlayerByUid', () => {
        it('returns player when found', async () => {
            const row = {
                puuid: 'uid-1',
                gameName: 'TestPlayer',
                region: 'PC',
                tier: 'Gold',
                rank: '2',
                lp: 900,
                currentMatchId: null,
                discordChannelId: null,
                lastUpdated: '2025-01-01',
            };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await getApexPlayerByUid('uid-1');
            expect(result).not.toBeNull();
            expect(result?.uid).toBe('uid-1');
            expect(result?.gameName).toBe('TestPlayer');
        });

        it('returns null when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const result = await getApexPlayerByUid('uid-missing');
            expect(result).toBeNull();
        });
    });

    describe('getApexPlayerByName', () => {
        it('returns player when found', async () => {
            const row = {
                puuid: 'uid-2',
                gameName: 'AlphaPlayer',
                region: 'PS4',
                tier: 'Platinum',
                rank: '3',
                lp: 1400,
                currentMatchId: null,
                discordChannelId: null,
                lastUpdated: '2025-01-01',
            };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await getApexPlayerByName('AlphaPlayer', 'PS4');
            expect(result?.gameName).toBe('AlphaPlayer');
            expect(result?.platform).toBe('PS4');
        });

        it('returns null when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const result = await getApexPlayerByName('Ghost', 'PC');
            expect(result).toBeNull();
        });
    });

    describe('createApexPlayer', () => {
        it('inserts and returns a new player', async () => {
            const row = {
                puuid: 'uid-3',
                gameName: 'NewPlayer',
                region: 'PC',
                tier: 'Bronze',
                rank: '4',
                lp: 200,
                currentMatchId: null,
                discordChannelId: null,
                lastUpdated: '2025-01-01',
            };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await createApexPlayer({
                uid: 'uid-3',
                gameName: 'NewPlayer',
                platform: 'PC',
                tier: 'Bronze',
                rankDiv: 4,
                rp: 200,
            });

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO summoners'),
                expect.arrayContaining(['uid-3', 'NewPlayer', 'PC'])
            );
            expect(result.uid).toBe('uid-3');
        });
    });

    describe('updateApexPlayerRank', () => {
        it('calls UPDATE with correct params', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await updateApexPlayerRank('uid-4', 'Diamond', 1, 5000);

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE summoners'),
                expect.arrayContaining(['Diamond', '1', 5000, 'uid-4'])
            );
        });
    });

    describe('deleteApexPlayer', () => {
        it('returns deleted player when found', async () => {
            const row = {
                puuid: 'uid-5',
                gameName: 'OldPlayer',
                region: 'PC',
                tier: 'Silver',
                rank: '3',
                lp: 350,
                currentMatchId: null,
                discordChannelId: null,
                lastUpdated: '2025-01-01',
            };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await deleteApexPlayer('uid-5');
            expect(result?.uid).toBe('uid-5');
        });

        it('returns null when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const result = await deleteApexPlayer('uid-missing');
            expect(result).toBeNull();
        });
    });

    describe('getAllTrackedApexPlayers', () => {
        it('returns all apex players from joined query', async () => {
            const rows = [
                {
                    puuid: 'uid-a',
                    gameName: 'PlayerA',
                    region: 'PC',
                    tier: 'Gold',
                    rank: '2',
                    lp: 850,
                    currentMatchId: null,
                    discordChannelId: null,
                    lastUpdated: '2025-01-01',
                },
                {
                    puuid: 'uid-b',
                    gameName: 'PlayerB',
                    region: 'PS4',
                    tier: 'Platinum',
                    rank: '4',
                    lp: 1050,
                    currentMatchId: null,
                    discordChannelId: null,
                    lastUpdated: '2025-01-01',
                },
            ];
            queryMock.mockResolvedValue({ rows });

            const result = await getAllTrackedApexPlayers();
            expect(result).toHaveLength(2);
            expect(result[0].gameName).toBe('PlayerA');
            expect(result[1].gameName).toBe('PlayerB');
        });
    });

    describe('setApexPlayerMatchId', () => {
        it('updates currentMatchId to a value', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await setApexPlayerMatchId('uid-6', 'APEX_IN_GAME_7');

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('currentMatchId'),
                expect.arrayContaining(['APEX_IN_GAME_7', 'uid-6'])
            );
        });

        it('updates currentMatchId to null', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await setApexPlayerMatchId('uid-6', null);

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('currentMatchId'),
                expect.arrayContaining([null, 'uid-6'])
            );
        });
    });

    describe('getApexPlayerCurrentMatchId', () => {
        it('returns currentMatchId when present', async () => {
            queryMock.mockResolvedValue({
                rows: [{ currentMatchId: 'APEX_IN_GAME_42' }],
            });

            const result = await getApexPlayerCurrentMatchId('uid-7');
            expect(result).toBe('APEX_IN_GAME_42');
        });

        it('returns null when player not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });
            const result = await getApexPlayerCurrentMatchId('uid-missing');
            expect(result).toBeNull();
        });
    });
});
