import {
    buildMatchEndMessage,
    buildRankChangeMessage,
    notifyMatchEnd,
    notifyRankChange,
    notifyMissingData,
} from '../packages/diana-core/src/plugins/diana-league-bot/notifications/leagueNotifications';
import type { MessageAdapter } from '../packages/diana-core/src/core/pluginTypes';
import type { SummonerSummary } from '../packages/diana-core/src/plugins/diana-league-bot/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAdapter(): jest.Mocked<MessageAdapter> {
    return { sendMessage: jest.fn().mockResolvedValue(undefined) };
}

const baseMatchInput = {
    summonerName: 'TestPlayer',
    queueName: 'Ranked Solo',
    result: 'Win',
    gameLengthSeconds: 1830,
    newRankMsg: 'Gold IV',
    lpChangeMsg: 18,
    championDisplay: 'Ahri',
    role: 'Middle',
    kdaStr: '7/2/10',
    damage: 42000,
    deepLolLink: 'https://deeplol.gg/test',
};

const baseSummonerSummary: SummonerSummary = {
    name: 'TestPlayer',
    tier: 'Gold',
    rank: 'IV',
    lp: 50,
    totalGames: 5,
    wins: 3,
    losses: 2,
    winRate: '60',
    totalTimeInHours: '12h',
    mostPlayedChampion: { name: 'Ahri' },
    averageDamageDealtToChampions: '35000',
    mostPlayedRole: 'Middle',
    discordChannelId: 'chan-123',
};

// ---------------------------------------------------------------------------
// buildMatchEndMessage
// ---------------------------------------------------------------------------

describe('buildMatchEndMessage', () => {
    it('returns correct title and description', () => {
        const msg = buildMatchEndMessage(baseMatchInput);
        expect(msg.title).toBe('🎮 **Match Summary**');
        expect(msg.description).toBe('TestPlayer has completed a match!');
    });

    it('sets green colour for a win', () => {
        const msg = buildMatchEndMessage({ ...baseMatchInput, result: 'win' });
        expect(msg.colorHex).toBe(0x28a745);
    });

    it('sets red colour for a loss', () => {
        const msg = buildMatchEndMessage({ ...baseMatchInput, result: 'lose' });
        expect(msg.colorHex).toBe(0xe74c3c);
    });

    it('sets orange colour for a remake', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            result: 'remake',
        });
        expect(msg.colorHex).toBe(0xe67e22);
    });

    it('uses fallback colour for unknown result', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            result: 'unknown',
        });
        expect(msg.colorHex).toBe(0x95a5a6);
    });

    it('result matching is case-insensitive', () => {
        const msg = buildMatchEndMessage({ ...baseMatchInput, result: 'WIN' });
        expect(msg.colorHex).toBe(0x28a745);
    });

    it('includes Rank Update and LP Change fields for ranked queue', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Ranked Solo',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('📈 **Rank Update**');
        expect(fieldNames).toContain('🔄 **LP Change**');
    });

    it('includes Rank Update and LP Change fields for Ranked Flex queue', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Ranked Flex',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('📈 **Rank Update**');
        expect(fieldNames).toContain('🔄 **LP Change**');
    });

    it('does not include Rank Update / LP Change fields for non-ranked queue', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'ARAM',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).not.toContain('📈 **Rank Update**');
        expect(fieldNames).not.toContain('🔄 **LP Change**');
    });

    it('includes Role field for a role queue (Ranked Solo)', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Ranked Solo',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🎯 **Role**');
    });

    it('includes Role field for Normal Blind (role queue)', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Normal Blind',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🎯 **Role**');
    });

    it('does not include Role field for ARAM (non-role queue)', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'ARAM',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).not.toContain('🎯 **Role**');
    });

    it('role queue matching is case-insensitive', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'ranked solo',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🎯 **Role**');
    });

    it('includes the deepLolLink as url', () => {
        const msg = buildMatchEndMessage(baseMatchInput);
        expect(msg.url).toBe('https://deeplol.gg/test');
    });

    it('footer includes formatted game length', () => {
        // 1830 seconds = 30:30
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            gameLengthSeconds: 1830,
        });
        expect(msg.footer).toContain('30:30');
    });

    it('footer handles zero-padded seconds', () => {
        // 65 seconds = 1:05
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            gameLengthSeconds: 65,
        });
        expect(msg.footer).toContain('1:05');
    });

    it('always includes Result, Champion, Queue, KDA, Damage fields', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'ARAM',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🏁 **Result**');
        expect(fieldNames).toContain('🛡️ **Champion**');
        expect(fieldNames).toContain('🕹️ **Queue**');
        expect(fieldNames).toContain('⚔️ **KDA**');
        expect(fieldNames).toContain('💥 **Damage Dealt**');
    });

    it('includes Match Placement field when placement and totalPlayers are provided', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            placement: 3,
            totalPlayers: 10,
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🏆 **Match Placement**');
    });

    it('placement field value shows ordinal and total (e.g. "3rd / 10")', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            placement: 3,
            totalPlayers: 10,
        });
        const placementField = msg.fields!.find(
            (f) => f.name === '🏆 **Match Placement**'
        );
        expect(placementField?.value).toContain('3rd');
        expect(placementField?.value).toContain('10');
    });

    it('placement field uses correct ordinal for 1st place', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            placement: 1,
            totalPlayers: 10,
        });
        const placementField = msg.fields!.find(
            (f) => f.name === '🏆 **Match Placement**'
        );
        expect(placementField?.value).toContain('1st');
    });

    it('placement field uses correct ordinal for 2nd place', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            placement: 2,
            totalPlayers: 10,
        });
        const placementField = msg.fields!.find(
            (f) => f.name === '🏆 **Match Placement**'
        );
        expect(placementField?.value).toContain('2nd');
    });

    it('does not include Match Placement field when placement is omitted', () => {
        const msg = buildMatchEndMessage(baseMatchInput);
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).not.toContain('🏆 **Match Placement**');
    });

    it('does not include Match Placement field when only placement is provided (no totalPlayers)', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            placement: 3,
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).not.toContain('🏆 **Match Placement**');
    });

    it('does not include Match Placement field when only totalPlayers is provided (no placement)', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            totalPlayers: 10,
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).not.toContain('🏆 **Match Placement**');
    });

    it('rank fields appear before champion field in ranked queues', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Ranked Solo',
        });
        const fieldNames = msg.fields!.map((f) => f.name);
        const rankUpdateIdx = fieldNames.indexOf('📈 **Rank Update**');
        const lpChangeIdx = fieldNames.indexOf('🔄 **LP Change**');
        const championIdx = fieldNames.indexOf('🛡️ **Champion**');
        expect(rankUpdateIdx).toBeGreaterThanOrEqual(0);
        expect(lpChangeIdx).toBeGreaterThanOrEqual(0);
        // Both rank fields should come after Result (idx 0) but before Champion
        expect(rankUpdateIdx).toBeLessThan(championIdx);
        expect(lpChangeIdx).toBeLessThan(championIdx);
    });

    it('LP Change field value includes " LP" suffix', () => {
        const msg = buildMatchEndMessage({
            ...baseMatchInput,
            queueName: 'Ranked Solo',
            lpChangeMsg: 18,
        });
        const lpField = msg.fields!.find((f) => f.name === '🔄 **LP Change**');
        expect(lpField?.value).toContain('18 LP');
    });
});

// ---------------------------------------------------------------------------
// buildRankChangeMessage
// ---------------------------------------------------------------------------

describe('buildRankChangeMessage', () => {
    const promotionInput = {
        summonerName: 'TestPlayer',
        direction: 'promoted',
        newRankMsg: 'Gold IV',
        lpChangeMsg: 60,
        deepLolLink: 'https://deeplol.gg/test',
    };

    const demotionInput = {
        ...promotionInput,
        direction: 'demoted',
        newRankMsg: 'Silver I',
    };

    it('returns a payload for promotion', () => {
        const msg = buildRankChangeMessage(promotionInput);
        expect(msg).not.toBeNull();
    });

    it('promotion title is correct', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        expect(msg.title).toBe('📈 **Rank Promotion!**');
    });

    it('promotion description mentions ranking up', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        expect(msg.description).toContain('ranked up');
    });

    it('uses correct tier colour for promotion (Gold → 0xffd700)', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        expect(msg.colorHex).toBe(0xffd700);
    });

    it('returns a payload for demotion', () => {
        const msg = buildRankChangeMessage(demotionInput);
        expect(msg).not.toBeNull();
    });

    it('demotion title is correct', () => {
        const msg = buildRankChangeMessage(demotionInput)!;
        expect(msg.title).toBe('📉 **Rank Demotion...**');
    });

    it('demotion description mentions being demoted', () => {
        const msg = buildRankChangeMessage(demotionInput)!;
        expect(msg.description).toContain('demoted');
    });

    it('returns null for no_change direction', () => {
        const msg = buildRankChangeMessage({
            ...promotionInput,
            direction: 'no_change',
        });
        expect(msg).toBeNull();
    });

    it('returns null for an empty direction string', () => {
        const msg = buildRankChangeMessage({
            ...promotionInput,
            direction: '',
        });
        expect(msg).toBeNull();
    });

    it('payload has Rank Change and LP Change fields', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        const fieldNames = msg.fields!.map((f) => f.name);
        expect(fieldNames).toContain('🏆 **Rank Change**');
        expect(fieldNames).toContain('🔄 **LP Change**');
    });

    it('LP Change field value includes " LP" suffix', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        const lpField = msg.fields!.find((f) => f.name === '🔄 **LP Change**');
        expect(lpField?.value).toContain('60 LP');
    });

    it('uses deepLolLink as url', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        expect(msg.url).toBe('https://deeplol.gg/test');
    });

    it('footer is "Rank Change Notification"', () => {
        const msg = buildRankChangeMessage(promotionInput)!;
        expect(msg.footer).toBe('Rank Change Notification');
    });

    it('uses fallback colour when tier is unrecognised', () => {
        const msg = buildRankChangeMessage({
            ...promotionInput,
            newRankMsg: 'Unknown X',
        })!;
        // Unknown tier falls back to 0x3498db
        expect(msg.colorHex).toBe(0x3498db);
    });
});

// ---------------------------------------------------------------------------
// notifyMatchEnd
// ---------------------------------------------------------------------------

describe('notifyMatchEnd', () => {
    const input = { ...baseMatchInput, discordChannelId: 'chan-abc' };

    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('calls adapter.sendMessage with the correct channelId', async () => {
        const adapter = makeAdapter();
        await notifyMatchEnd(adapter, input);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(adapter.sendMessage).toHaveBeenCalledWith(
            { channelId: 'chan-abc' },
            expect.objectContaining({ title: '🎮 **Match Summary**' })
        );
    });

    it('returns true on success', async () => {
        const adapter = makeAdapter();
        const result = await notifyMatchEnd(adapter, input);
        expect(result).toBe(true);
    });

    it('returns false and logs when adapter throws', async () => {
        const adapter = makeAdapter();
        adapter.sendMessage.mockRejectedValue(new Error('network error'));
        const result = await notifyMatchEnd(adapter, input);
        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });

    it('returns true with a warning when adapter is null', async () => {
        const result = await notifyMatchEnd(null, input);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    it('returns true with a warning when adapter is undefined', async () => {
        const result = await notifyMatchEnd(undefined, input);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    it('returns false with a warning when channelId is missing', async () => {
        const adapter = makeAdapter();
        const result = await notifyMatchEnd(adapter, {
            ...input,
            discordChannelId: '',
        });
        expect(result).toBe(false);
        expect(console.warn).toHaveBeenCalled();
        expect(adapter.sendMessage).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// notifyRankChange
// ---------------------------------------------------------------------------

describe('notifyRankChange', () => {
    const promotionInput = {
        summonerName: 'TestPlayer',
        direction: 'promoted',
        newRankMsg: 'Gold IV',
        lpChangeMsg: 60,
        deepLolLink: 'https://deeplol.gg/test',
        discordChannelId: 'chan-abc',
    };

    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('sends a message when direction is promoted', async () => {
        const adapter = makeAdapter();
        const result = await notifyRankChange(adapter, promotionInput);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
    });

    it('sends a message when direction is demoted', async () => {
        const adapter = makeAdapter();
        const result = await notifyRankChange(adapter, {
            ...promotionInput,
            direction: 'demoted',
        });
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(result).toBe(true);
    });

    it('returns false and skips sending when direction is no_change', async () => {
        const adapter = makeAdapter();
        const result = await notifyRankChange(adapter, {
            ...promotionInput,
            direction: 'no_change',
        });
        expect(adapter.sendMessage).not.toHaveBeenCalled();
        expect(result).toBe(false);
    });

    it('returns true with warn when adapter is null', async () => {
        const result = await notifyRankChange(null, promotionInput);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// notifyMissingData
// ---------------------------------------------------------------------------

describe('notifyMissingData', () => {
    beforeEach(() => {
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('calls adapter.sendMessage with the summoner discordChannelId', async () => {
        const adapter = makeAdapter();
        await notifyMissingData(adapter, baseSummonerSummary);
        expect(adapter.sendMessage).toHaveBeenCalledTimes(1);
        expect(adapter.sendMessage).toHaveBeenCalledWith(
            { channelId: 'chan-123' },
            expect.objectContaining({
                description: expect.stringContaining('TestPlayer'),
            })
        );
    });

    it('returns true on success', async () => {
        const adapter = makeAdapter();
        const result = await notifyMissingData(adapter, baseSummonerSummary);
        expect(result).toBe(true);
    });

    it('returns true with warn when adapter is null', async () => {
        const result = await notifyMissingData(null, baseSummonerSummary);
        expect(result).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    it('returns false and logs when adapter throws', async () => {
        const adapter = makeAdapter();
        adapter.sendMessage.mockRejectedValue(new Error('send failed'));
        const result = await notifyMissingData(adapter, baseSummonerSummary);
        expect(result).toBe(false);
        expect(console.error).toHaveBeenCalled();
    });
});
