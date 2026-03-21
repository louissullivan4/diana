jest.mock(
    '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db',
    () => ({
        db: {
            query: jest.fn(),
        },
    })
);

import { db } from '../packages/diana-core/src/plugins/diana-league-bot/api/utils/db';
import * as guildService from '../packages/diana-core/src/plugins/diana-league-bot/api/summoners/guildService';

const queryMock = db.query as unknown as jest.Mock;

describe('guildService', () => {
    beforeEach(() => {
        queryMock.mockReset();
    });

    // ─── getGuildConfig ───────────────────────────────────────────────────────

    describe('getGuildConfig', () => {
        it('returns config row when found', async () => {
            const row = { guild_id: 'g1', channel_id: 'c1', live_posting: true };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await guildService.getGuildConfig('g1');

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('FROM guild_config'),
                ['g1']
            );
        });

        it('returns null when not found', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await guildService.getGuildConfig('missing');

            expect(result).toBeNull();
        });
    });

    // ─── getOrCreateGuildConfig ───────────────────────────────────────────────

    describe('getOrCreateGuildConfig', () => {
        it('upserts and returns the config row', async () => {
            const row = { guild_id: 'g1', channel_id: null, live_posting: true };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await guildService.getOrCreateGuildConfig('g1');

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT'),
                ['g1']
            );
        });
    });

    // ─── setGuildChannel ──────────────────────────────────────────────────────

    describe('setGuildChannel', () => {
        it('upserts channel_id and returns updated row', async () => {
            const row = { guild_id: 'g1', channel_id: 'c99', live_posting: true };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await guildService.setGuildChannel('g1', 'c99');

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('channel_id'),
                ['g1', 'c99']
            );
        });
    });

    // ─── setGuildLivePosting ──────────────────────────────────────────────────

    describe('setGuildLivePosting', () => {
        it('sets live_posting to false', async () => {
            const row = { guild_id: 'g1', channel_id: 'c1', live_posting: false };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await guildService.setGuildLivePosting('g1', false);

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('live_posting'),
                ['g1', false]
            );
        });

        it('sets live_posting to true', async () => {
            const row = { guild_id: 'g1', channel_id: 'c1', live_posting: true };
            queryMock.mockResolvedValue({ rows: [row] });

            const result = await guildService.setGuildLivePosting('g1', true);

            expect(result).toBe(row);
            expect(queryMock).toHaveBeenCalledWith(
                expect.anything(),
                ['g1', true]
            );
        });
    });

    // ─── addSummonerToGuild ───────────────────────────────────────────────────

    describe('addSummonerToGuild', () => {
        it('inserts with addedBy when provided', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await guildService.addSummonerToGuild('g1', 'puuid-abc', 'user-123');

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('guild_summoners'),
                ['g1', 'puuid-abc', 'user-123']
            );
        });

        it('inserts with null addedBy when not provided', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await guildService.addSummonerToGuild('g1', 'puuid-abc');

            expect(queryMock).toHaveBeenCalledWith(
                expect.anything(),
                ['g1', 'puuid-abc', null]
            );
        });
    });

    // ─── removeSummonerFromGuild ──────────────────────────────────────────────

    describe('removeSummonerFromGuild', () => {
        it('returns true when a row was deleted', async () => {
            queryMock.mockResolvedValue({ rows: [{ puuid: 'p1' }], rowCount: 1 });

            const result = await guildService.removeSummonerFromGuild('g1', 'p1');

            expect(result).toBe(true);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM guild_summoners'),
                ['g1', 'p1']
            );
        });

        it('returns false when no row was deleted', async () => {
            queryMock.mockResolvedValue({ rows: [], rowCount: 0 });

            const result = await guildService.removeSummonerFromGuild('g1', 'missing');

            expect(result).toBe(false);
        });
    });

    // ─── getSummonersForGuild ─────────────────────────────────────────────────

    describe('getSummonersForGuild', () => {
        it('returns joined rows for the given guild', async () => {
            const rows = [
                { guild_id: 'g1', puuid: 'p1', gameName: 'Alice', tagLine: 'EUW' },
                { guild_id: 'g1', puuid: 'p2', gameName: 'Bob', tagLine: 'NA1' },
            ];
            queryMock.mockResolvedValue({ rows });

            const result = await guildService.getSummonersForGuild('g1');

            expect(result).toEqual(rows);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('JOIN summoners'),
                ['g1']
            );
        });

        it('returns empty array when guild has no summoners', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await guildService.getSummonersForGuild('empty-guild');

            expect(result).toEqual([]);
        });
    });

    // ─── isSummonerInGuild ────────────────────────────────────────────────────

    describe('isSummonerInGuild', () => {
        it('returns true when summoner is tracked in the guild', async () => {
            queryMock.mockResolvedValue({ rows: [{ '?column?': 1 }], rowCount: 1 });

            const result = await guildService.isSummonerInGuild('g1', 'p1');

            expect(result).toBe(true);
        });

        it('returns false when summoner is not tracked in the guild', async () => {
            queryMock.mockResolvedValue({ rows: [], rowCount: 0 });

            const result = await guildService.isSummonerInGuild('g1', 'p-unknown');

            expect(result).toBe(false);
        });
    });

    // ─── getGuildsTrackingSummoner ────────────────────────────────────────────

    describe('getGuildsTrackingSummoner', () => {
        it('returns guild targets with channel and live_posting', async () => {
            const rows = [
                { guild_id: 'g1', channel_id: 'c1', live_posting: true },
                { guild_id: 'g2', channel_id: 'c2', live_posting: false },
            ];
            queryMock.mockResolvedValue({ rows });

            const result = await guildService.getGuildsTrackingSummoner('p1');

            expect(result).toEqual(rows);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('WHERE gs.puuid = $1'),
                ['p1']
            );
        });

        it('only returns guilds with a non-null channel_id', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            await guildService.getGuildsTrackingSummoner('p-no-channel');

            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('channel_id IS NOT NULL'),
                ['p-no-channel']
            );
        });

        it('returns empty array when no guilds track the summoner', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await guildService.getGuildsTrackingSummoner('p-new');

            expect(result).toEqual([]);
        });
    });

    // ─── getAllTrackedPuuids ───────────────────────────────────────────────────

    describe('getAllTrackedPuuids', () => {
        it('returns distinct puuids from guild_summoners', async () => {
            queryMock.mockResolvedValue({
                rows: [{ puuid: 'p1' }, { puuid: 'p2' }, { puuid: 'p3' }],
            });

            const result = await guildService.getAllTrackedPuuids();

            expect(result).toEqual(['p1', 'p2', 'p3']);
            expect(queryMock).toHaveBeenCalledWith(
                expect.stringContaining('DISTINCT puuid'),
                []
            );
        });

        it('returns empty array when no summoners are tracked', async () => {
            queryMock.mockResolvedValue({ rows: [] });

            const result = await guildService.getAllTrackedPuuids();

            expect(result).toEqual([]);
        });
    });
});
